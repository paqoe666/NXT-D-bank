import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// В API v1 суммы передаются в минорных единицах (копейках): 50000 = 500,00 ₽.
// В БД остаётся major-единица с дробной частью (Float) — этого требует существующий /balance.
export const MINOR_FACTOR = 100;
export const MAX_AMOUNT_MINOR = 100_000_000; // 1 000 000,00

export const toMinor = (major: number): number => Math.round(major * MINOR_FACTOR);
export const toMajor = (minor: number): number => Math.round((minor / MINOR_FACTOR) * 100) / 100;

export type MoneyOperation = 'debit' | 'credit';

export interface MoneyInput {
  operation: MoneyOperation;
  userId: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  comment: string;
  reference: string;
  appName: string;
  idempotency?: { key: string; bodyHash: string } | null;
}

export type MoneyResult =
  | { ok: true; transaction: any; balanceAfterMajor: number; response: any }
  | { ok: false; status: number; code: string; message: string; balanceAfterMajor?: number };

// Списание и зачисление — в одной транзакции БД с условным UPDATE по счёту.
// Условие balance >= amount в самом UPDATE эквивалентно блокировке строки:
// параллельные запросы не могут увести баланс в минус или потерять обновление.
export const applyMoneyOperation = async (input: MoneyInput): Promise<MoneyResult> => {
  const amountMajor = toMajor(input.amountMinor);
  const direction = input.operation === 'debit' ? 'out' : 'in';

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.operation === 'debit') {
      const debited = await tx.account.updateMany({
        where: { id: input.accountId, isBlocked: false, balance: { gte: amountMajor } },
        data: { balance: { decrement: amountMajor } }
      });

      if (debited.count === 0) {
        const current = await tx.account.findUnique({ where: { id: input.accountId } });
        const balance = current?.balance ?? 0;
        if (current?.isBlocked) {
          return { ok: false as const, status: 423, code: 'account_blocked', message: 'Счет заблокирован: операции по нему запрещены', balanceAfterMajor: balance };
        }
        return { ok: false as const, status: 422, code: 'insufficient_funds', message: 'Недостаточно средств на счете', balanceAfterMajor: balance };
      }
    } else {
      const credited = await tx.account.updateMany({
        where: { id: input.accountId, isBlocked: false },
        data: { balance: { increment: amountMajor } }
      });
      if (credited.count === 0) {
        return { ok: false as const, status: 423, code: 'account_blocked', message: 'Счет заблокирован: операции по нему запрещены' };
      }
    }

    const account = await tx.account.findUnique({ where: { id: input.accountId } });
    const balanceAfterMajor = account?.balance ?? 0;

    const transaction = await tx.transaction.create({
      data: {
        type: 'transfer',
        status: 'completed',
        // Списание: отправитель — пользователь. Зачисление: получатель — пользователь.
        senderId: input.operation === 'debit' ? input.userId : null,
        receiverId: input.operation === 'credit' ? input.userId : null,
        amount: amountMajor,
        totalDeducted: input.operation === 'debit' ? amountMajor : 0,
        commission: 0,
        currency: input.currency,
        comment: input.comment || null,
        reference: input.reference || null,
        appName: input.appName,
        balanceAfter: balanceAfterMajor,
        processedAt: new Date()
      }
    });

    const response = {
      applied: true,
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      direction,
      amount: input.amountMinor,
      totalDeducted: toMinor(transaction.totalDeducted),
      commission: toMinor(transaction.commission),
      currency: transaction.currency,
      balanceAfter: balanceAfterMajor,
      failureReason: null as string | null,
      processedAt: (transaction.processedAt as Date).toISOString(),
      comment: transaction.comment,
      reference: transaction.reference,
      createdAt: (transaction.createdAt as Date).toISOString()
    };

    if (input.idempotency) {
      await tx.idempotencyRecord.create({
        data: {
          key: input.idempotency.key,
          appName: input.appName,
          operation: input.operation,
          userId: input.userId,
          bodyHash: input.idempotency.bodyHash,
          amountMinor: input.amountMinor,
          currency: input.currency,
          transactionId: transaction.id,
          responseJson: JSON.stringify(response),
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000) // минимум 24 часа
        }
      });
    }

    return { ok: true as const, transaction, balanceAfterMajor, response };
  }, { maxWait: 20000, timeout: 20000 }); // запас под очередь: при параллельных списаниях соединений из пула не хватает
};
