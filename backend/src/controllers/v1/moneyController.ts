import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppAuthRequest } from '../../middlewares/apiAppAuth';
import { applyMoneyOperation, MAX_AMOUNT_MINOR, toMinor, toMajor, MoneyOperation } from '../../services/money.service';
import { findIdempotent, hashBody, pruneExpired } from '../../services/idempotency.service';
import { writeAudit } from '../../services/audit.service';

const prisma = new PrismaClient();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TEXT = 140;

const fail = (res: Response, status: number, code: string, message: string, extra: Record<string, unknown> = {}) => {
  res.status(status).json({ error: { code, message }, ...extra });
};

// amountMinor принимаем только как целое число (число или строка из цифр)
const parseAmountMinor = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : NaN;
  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) return Number(raw.trim());
  return NaN;
};

// Единый вид операции в ответах API v1.
// amount / totalDeducted / commission — в минорных единицах (50000 = 500,00),
// balanceAfter — в major-единицах, как в GET /users/:id/balance.
const txView = (tx: any, balanceAfterMajor?: number, applied?: boolean) => {
  const view: Record<string, unknown> = {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    direction: tx.senderId ? 'out' : 'in',
    amount: toMinor(tx.amount),
    totalDeducted: toMinor(tx.totalDeducted),
    commission: toMinor(tx.commission),
    currency: tx.currency,
    balanceAfter: balanceAfterMajor !== undefined
      ? balanceAfterMajor
      : (tx.balanceAfter !== null && tx.balanceAfter !== undefined ? tx.balanceAfter : null),
    failureReason: tx.failureReason ?? null,
    processedAt: tx.processedAt ? new Date(tx.processedAt).toISOString() : null,
    comment: tx.comment ?? null,
    reference: tx.reference ?? null,
    createdAt: new Date(tx.createdAt).toISOString()
  };

  if (applied !== undefined) view.applied = applied;
  return view;
};

// Общая логика debit и credit: валидация -> идемпотентность -> атомарное применение -> аудит
const handleMoney = async (req: AppAuthRequest, res: Response, operation: MoneyOperation): Promise<void> => {
  const startedAt = Date.now();
  const app = req.apiApp!;
  const userId = String(req.params.userId);
  const direction = operation === 'debit' ? 'out' : 'in';
  const body = req.body || {};

  // 1. Идентификатор пользователя
  if (!UUID_RE.test(userId)) {
    await writeAudit({ req, operation, userId: null, statusCode: 404, result: 'user_not_found', startedAt });
    return fail(res, 404, 'user_not_found', 'Пользователь не найден');
  }

  // 2. Тело запроса
  const amountMinor = parseAmountMinor(body.amountMinor);
  if (!Number.isFinite(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) {
    await writeAudit({ req, operation, userId, statusCode: 422, result: 'invalid_amount', startedAt });
    return fail(res, 422, 'invalid_amount', `amountMinor — целое число от 1 до ${MAX_AMOUNT_MINOR} (минорные единицы: 50000 = 500,00)`);
  }

  const comment = body.comment === undefined || body.comment === null ? '' : String(body.comment);
  if (comment.length > MAX_TEXT) {
    await writeAudit({ req, operation, userId, statusCode: 422, result: 'invalid_comment', startedAt, amountMinor });
    return fail(res, 422, 'invalid_comment', `comment не длиннее ${MAX_TEXT} символов`);
  }

  const reference = body.reference === undefined || body.reference === null ? '' : String(body.reference);
  if (reference.length > MAX_TEXT) {
    await writeAudit({ req, operation, userId, statusCode: 422, result: 'invalid_reference', startedAt, amountMinor });
    return fail(res, 422, 'invalid_reference', `reference не длиннее ${MAX_TEXT} символов`);
  }

  const dryRun = body.dryRun === true;
  const requestedCurrency = body.currency === undefined || body.currency === null || body.currency === ''
    ? null
    : String(body.currency).toUpperCase();

  // 3. Идемпотентность: тот же ключ + то же тело = тот же ответ, повторно не применяется
  const rawKey = req.headers['idempotency-key'];
  const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  if (idempotencyKey.length > 200) {
    await writeAudit({ req, operation, userId, statusCode: 422, result: 'invalid_idempotency_key', startedAt, amountMinor });
    return fail(res, 422, 'invalid_idempotency_key', 'Idempotency-Key длиннее 200 символов');
  }

  const bodyHash = hashBody({ operation, userId, amountMinor, currency: requestedCurrency ?? '', comment, reference, dryRun });

  if (idempotencyKey) {
    const existing = await findIdempotent(app.name, idempotencyKey);
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        await writeAudit({ req, operation, userId, statusCode: 409, result: 'idempotency_conflict', startedAt, amountMinor, currency: requestedCurrency });
        return fail(res, 409, 'idempotency_conflict', 'Этот Idempotency-Key уже использован с другим телом запроса');
      }
      await writeAudit({ req, operation, userId, txId: existing.transactionId, statusCode: 200, result: 'replayed', startedAt, amountMinor, currency: requestedCurrency });
      res.setHeader('Idempotent-Replay', 'true');
      res.status(200).json(JSON.parse(existing.responseJson || 'null'));
      return;
    }
  }

  // 4. Счет пользователя
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user || !user.account) {
    await writeAudit({ req, operation, userId, statusCode: 404, result: 'user_not_found', startedAt, amountMinor });
    return fail(res, 404, 'user_not_found', 'Пользователь не найден или у него нет счета');
  }
  const account = user.account;

  // 5. Валюта операции должна совпадать с валютой счета
  if (requestedCurrency && requestedCurrency !== account.currency) {
    await writeAudit({ req, operation, userId, statusCode: 422, result: 'invalid_currency', startedAt, amountMinor, currency: requestedCurrency });
    return fail(res, 422, 'invalid_currency', `Валюта счета — ${account.currency}, в запросе указана ${requestedCurrency}. Конвертация пока не поддерживается`);
  }
  const currency = account.currency;

  // 6. Блокировка счета
  if (account.isBlocked) {
    await writeAudit({ req, operation, userId, statusCode: 423, result: 'account_blocked', startedAt, amountMinor, currency });
    return fail(res, 423, 'account_blocked', 'Счет заблокирован: операции по нему запрещены');
  }

  // 7. Сухой прогон: считаем результат, но ничего не применяем
  if (dryRun) {
    const amountMajor = toMajor(amountMinor);
    const notEnough = operation === 'debit' && account.balance < amountMajor;
    const projected = round2(operation === 'debit' ? account.balance - amountMajor : account.balance + amountMajor);

    await writeAudit({ req, operation, userId, statusCode: 200, result: 'dry_run', startedAt, amountMinor, currency });
    res.status(200).json({
      applied: false,
      id: null,
      type: 'transfer',
      status: 'pending',
      direction,
      amount: amountMinor,
      totalDeducted: operation === 'debit' ? amountMinor : 0,
      commission: 0,
      currency,
      balance: account.balance,
      balanceAfter: projected,
      failureReason: notEnough ? 'insufficient_funds' : null,
      processedAt: null,
      comment: comment || null,
      reference: reference || null,
      createdAt: new Date().toISOString()
    });
    return;
  }

  // 8. Атомарное применение операции (списание/зачисление + запись в ленту + идемпотентность)
  await pruneExpired();
  const result = await applyMoneyOperation({
    operation,
    userId,
    accountId: account.id,
    amountMinor,
    currency,
    comment,
    reference,
    appName: app.name,
    idempotency: idempotencyKey ? { key: idempotencyKey, bodyHash } : null
  });

  if (!result.ok) {
    await writeAudit({ req, operation, userId, statusCode: result.status, result: result.code, startedAt, amountMinor, currency });
    return fail(res, result.status, result.code, result.message, {
      balance: result.balanceAfterMajor,
      balanceAfter: result.balanceAfterMajor
    });
  }

  await writeAudit({ req, operation, userId, txId: result.transaction.id, statusCode: 200, result: 'applied', startedAt, amountMinor, currency });
  res.status(200).json(result.response);
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const debit = (req: AppAuthRequest, res: Response): Promise<void> => handleMoney(req, res, 'debit');
export const credit = (req: AppAuthRequest, res: Response): Promise<void> => handleMoney(req, res, 'credit');

// Сверка конкретной операции: клиент вызывает её после таймаута, чтобы не списать дважды
export const getTransaction = async (req: AppAuthRequest, res: Response): Promise<void> => {
  const txId = String(req.params.txId);
  if (!UUID_RE.test(txId)) {
    return fail(res, 404, 'transaction_not_found', 'Операция не найдена');
  }

  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) {
    return fail(res, 404, 'transaction_not_found', 'Операция не найдена');
  }

  res.json(txView(tx));
};
