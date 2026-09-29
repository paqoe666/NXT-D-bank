import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Жизненный цикл операции ---
// pending    — операция создана, деньги зарезервированы (held), но получателю еще не отправлены
// processing — банк начал проводить операцию
// completed  — деньги доставлены получателю
// failed     — операция не прошла, резерв возвращен отправителю
// canceled   — операцию отменил отправитель, резерв возвращен
// refunded   — по исполненной операции сделан возврат средств
export const TX_STATUS = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
  refunded: 'refunded'
} as const;

// Сколько операция ждет до начала обработки и сколько обрабатывается.
// Значения настраиваются переменными окружения (нужно для тестов и для «мгновенных» переводов).
export const PENDING_MS = Number(process.env.TRANSFER_PENDING_MS ?? 4000);
export const PROCESSING_MS = Number(process.env.TRANSFER_PROCESSING_MS ?? 6000);

// Курсы валют: единый источник для переводов, смены валюты и отображения.
// В реальном банке это была бы отдельная таблица с историей курсов.
export const CURRENCY_RATES: Record<string, number> = {
  'RUB': 1, 'USD': 80, 'EUR': 100, 'GBP': 120, 'UAH': 2.5,
  'CNY': 12, 'CHF': 110, 'JPY': 0.6, 'BYN': 30, 'AED': 22, 'KZT': 0.2
};

export const convertCurrency = (amount: number, from: string, to: string): number => {
  const fromRate = CURRENCY_RATES[from] || 1;
  const toRate = CURRENCY_RATES[to] || 1;
  return Math.round((amount * fromRate / toRate) * 100) / 100;
};

// Человекочитаемые причины отказа (для уведомлений и фронтенда)
export const FAILURE_REASONS: Record<string, string> = {
  'recipient_account_not_found': 'счет получателя не найден',
  'insufficient_funds_on_recipient': 'у получателя недостаточно средств',
  'canceled_by_user': 'операция отменена отправителем'
};

export const failureText = (reason?: string | null): string =>
  reason ? (FAILURE_REASONS[reason] || reason) : 'операция не прошла';

// Возвращаем зарезервированные деньги отправителю и закрываем операцию.
// Используется и для отказа (failed), и для отмены (canceled).
const releaseReservedFunds = async (
  transactionId: string,
  status: 'failed' | 'canceled',
  reason: string
): Promise<void> => {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { sender: { include: { account: true } } }
  });

  if (!tx) return;
  // Уже закрытая операция (или возврат) второй раз не обрабатывается
  if (tx.status !== TX_STATUS.pending && tx.status !== TX_STATUS.processing) return;

  const senderAccountId = tx.sender?.account?.id;

  await prisma.$transaction(async (db) => {
    if (senderAccountId) {
      await db.account.update({
        where: { id: senderAccountId },
        data: { held: { decrement: tx.amount }, balance: { increment: tx.amount } }
      });
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: { status, failureReason: reason, processedAt: new Date() }
    });

    if (tx.senderId) {
      await db.notification.create({
        data: {
          userId: tx.senderId,
          type: 'transfer_failed',
          message: `Перевод не выполнен (${failureText(reason)}). ${tx.amount} ${tx.currency} возвращены на счет.`
        }
      });
    }
  });
};

export const failTransfer = (transactionId: string, reason: string): Promise<void> =>
  releaseReservedFunds(transactionId, 'failed', reason);

export const cancelTransfer = (transactionId: string): Promise<void> =>
  releaseReservedFunds(transactionId, 'canceled', 'canceled_by_user');

// Доставка денег получателю: снимаем резерв и зачисляем сумму в валюте получателя
export const completeTransfer = async (transactionId: string): Promise<void> => {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      sender: { include: { account: true } },
      receiver: { include: { account: true } }
    }
  });

  if (!tx || tx.status === TX_STATUS.completed) return;

  if (!tx.sender?.account || !tx.receiver?.account) {
    await failTransfer(transactionId, 'recipient_account_not_found');
    return;
  }

  const receivedAmount = convertCurrency(tx.amount, tx.currency || 'RUB', tx.receiver.account.currency);

  await prisma.$transaction(async (db) => {
    await db.account.update({
      where: { id: tx.sender!.account!.id },
      data: { held: { decrement: tx.amount } }
    });

    await db.account.update({
      where: { id: tx.receiver!.account!.id },
      data: { balance: { increment: receivedAmount } }
    });

    await db.transaction.update({
      where: { id: tx.id },
      data: { status: TX_STATUS.completed, processedAt: new Date() }
    });

    await db.notification.create({
      data: {
        userId: tx.receiver!.id,
        type: 'transfer',
        message: `Вам перевод: +${receivedAmount} ${tx.receiver!.account!.currency}. ${tx.comment || ''}`.trim()
      }
    });
  });
};

// Продвигаем «созревшие» операции: pending -> processing -> completed.
// Вызывается при поллинге (история/дашборд), поэтому банку пока не нужны ни воркеры, ни кроны.
export const processDueTransfers = async (): Promise<number> => {
  const now = Date.now();

  const active = await prisma.transaction.findMany({
    where: { type: 'transfer', status: { in: [TX_STATUS.pending, TX_STATUS.processing] } },
    orderBy: { createdAt: 'asc' },
    take: 50
  });

  let processed = 0;
  for (const tx of active) {
    const age = now - new Date(tx.createdAt).getTime();

    if (age >= PENDING_MS + PROCESSING_MS) {
      await completeTransfer(tx.id);
      processed++;
    } else if (age >= PENDING_MS && tx.status === TX_STATUS.pending) {
      await prisma.transaction.update({ where: { id: tx.id }, data: { status: TX_STATUS.processing } });
      processed++;
    }
  }

  return processed;
};

