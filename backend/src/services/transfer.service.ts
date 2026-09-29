import { PrismaClient } from '@prisma/client';
import { findUserByAnyTarget } from './lookup.service';
import { TX_STATUS, processDueTransfers, convertCurrency } from './ledger.service';
import { checkTransferLimit } from './limits.service';

const prisma = new PrismaClient();

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface TransferResult {
  ok: true;
  transactionId: string;
  status: string;
  amount: number;            // списано с отправителя (в его валюте)
  currency: string;
  receivedAmount: number;    // зачислено получателю (в его валюте)
  receiverCurrency: string;
  receiverId: string;
  createdAt: Date;
}

export interface TransferError {
  ok: false;
  status: number;
  message: string;
}

// Единая точка создания перевода. Используется и обычным переводом (/api/bank/transfer),
// и оплатой запроса денег по ссылке (/api/bank/requests/pay/:token),
// поэтому правила лимитов, резерва и статусов не могут разойтись.
export const createTransfer = async (params: {
  senderId: string;
  target: string;            // телефон, номер карты или id получателя
  amount: number;            // сумма в валюте счета отправителя
  comment?: string;
}): Promise<TransferResult | TransferError> => {
  const { senderId, target, comment } = params;
  const transferAmount = round2(Number(params.amount));

  if (!target || !Number.isFinite(transferAmount) || transferAmount <= 0) {
    return { ok: false, status: 400, message: 'Неверные данные для перевода' };
  }

  const sender = await prisma.user.findUnique({ where: { id: senderId }, include: { account: true } });
  if (!sender || !sender.account) {
    return { ok: false, status: 404, message: 'Отправитель не найден' };
  }

  const receiver = await findUserByAnyTarget(String(target));
  if (!receiver || !receiver.account) {
    return { ok: false, status: 404, message: 'Получатель не найден' };
  }

  if (sender.id === receiver.id) {
    return { ok: false, status: 400, message: 'Нельзя переводить средства самому себе' };
  }

  const cleanTarget = String(target).replace(/[\s-]/g, '');
  const senderAccountId = sender.account.id;
  const senderCurrency = sender.account.currency;
  const receiverCurrency = receiver.account.currency;

  // Лимиты, резерв и создание операции — одной транзакцией
  const result = await prisma.$transaction(async (db) => {
    const limitError = await checkTransferLimit(db, senderId, transferAmount);
    if (limitError) return { limitError };

    const reserved = await db.account.updateMany({
      where: { id: senderAccountId, balance: { gte: transferAmount } },
      data: { balance: { decrement: transferAmount }, held: { increment: transferAmount } }
    });
    if (reserved.count === 0) return { insufficient: true };

    const created = await db.transaction.create({
      data: {
        type: 'transfer',
        status: TX_STATUS.pending,
        amount: transferAmount,
        totalDeducted: transferAmount,
        currency: senderCurrency,
        senderId: sender.id,
        receiverId: receiver.id,
        target: cleanTarget,
        comment: comment || 'Перевод средств'
      }
    });

    return { created };
  });

  if ('limitError' in result && result.limitError) {
    return { ok: false, status: 400, message: result.limitError };
  }
  if ('insufficient' in result) {
    return { ok: false, status: 400, message: `Недостаточно средств. Доступно: ${sender.account.balance} ${senderCurrency}` };
  }

  const created = 'created' in result && result.created ? result.created : null;
  if (!created) {
    return { ok: false, status: 500, message: 'Не удалось создать операцию' };
  }

  await prisma.notification.create({
    data: {
      userId: sender.id,
      type: 'transfer_out',
      message: `Перевод ${transferAmount} ${senderCurrency} принят в обработку.`
    }
  });

  // Сразу пробуем продвинуть операцию: если задержки отключены, она завершится мгновенно
  await processDueTransfers();
  const fresh = await prisma.transaction.findUnique({ where: { id: created.id } });

  return {
    ok: true,
    transactionId: created.id,
    status: fresh ? fresh.status : created.status,
    amount: transferAmount,
    currency: senderCurrency,
    receivedAmount: convertCurrency(transferAmount, senderCurrency, receiverCurrency),
    receiverCurrency,
    receiverId: receiver.id,
    createdAt: created.createdAt
  };
};
