import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { TX_STATUS, processDueTransfers, cancelTransfer as cancelReservedTransfer, convertCurrency } from '../services/ledger.service';
import { createTransfer } from '../services/transfer.service';


// Тексты статусов для сообщений пользователю
const STATUS_TEXTS: Record<string, string> = {
  [TX_STATUS.pending]: 'в обработке',
  [TX_STATUS.processing]: 'обрабатывается',
  [TX_STATUS.completed]: 'исполнена',
  [TX_STATUS.failed]: 'не выполнена',
  [TX_STATUS.canceled]: 'отменена',
  [TX_STATUS.refunded]: 'возвращена'
};

export const statusText = (status: string): string => STATUS_TEXTS[status] || status;

// Компактное представление операции для ответа API
const txView = (tx: any) => ({
  id: tx.id,
  type: tx.type,
  status: tx.status,
  amount: tx.amount,
  currency: tx.currency,
  failureReason: tx.failureReason ?? null,
  processedAt: tx.processedAt ?? null,
  createdAt: tx.createdAt
});

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    // Перед отдачей истории продвигаем «созревшие» операции (pending -> processing -> completed)
    await processDueTransfers();

    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { firstName: true, lastName: true, account: true } },
        receiver: { select: { firstName: true, lastName: true, account: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error('Ошибка истории:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const clearHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    // Нельзя удалять историю, пока есть незавершенные операции: деньги зарезервированы
    const active = await prisma.transaction.count({
      where: {
        status: { in: [TX_STATUS.pending, TX_STATUS.processing] },
        OR: [{ senderId: userId }, { receiverId: userId }]
      }
    });
    if (active > 0) {
      res.status(409).json({ message: 'Есть операции в обработке. Дождитесь их завершения или отмените их.' });
      return;
    }

    await prisma.transaction.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка очистки истории:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};


export const transferMoney = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { target: rawTarget, receiverPhone, amount, comment } = req.body;
    const target = rawTarget || receiverPhone;

    // Вся логика денег (лимиты, резерв, статусы) — в одном сервисе createTransfer
    const result = await createTransfer({ senderId: req.user.userId, target, amount: Number(amount), comment });
    if (!result.ok) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.json({
      success: true,
      message: `Перевод принят. Статус: ${statusText(result.status)}`,
      transaction: {
        id: result.transactionId,
        type: 'transfer',
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        failureReason: null,
        processedAt: null,
        createdAt: result.createdAt
      }
    });
  } catch (error) {
    console.error('Ошибка перевода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Отмена операции, которая еще не исполнена (pending/processing): резерв возвращается отправителю
export const cancelTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const id = String(req.params.id);

    const tx = await prisma.transaction.findFirst({ where: { id, senderId: userId } });
    if (!tx) {
      res.status(404).json({ message: 'Операция не найдена' });
      return;
    }

    if (tx.status !== TX_STATUS.pending && tx.status !== TX_STATUS.processing) {
      res.status(409).json({ message: `Отменить можно только операцию в обработке. Сейчас она ${statusText(tx.status)}.` });
      return;
    }

    await cancelReservedTransfer(tx.id);
    const fresh = await prisma.transaction.findUnique({ where: { id: tx.id } });

    res.json({
      success: true,
      message: 'Операция отменена, деньги возвращены на счет',
      transaction: txView(fresh || tx)
    });
  } catch (error) {
    console.error('Ошибка отмены перевода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Возврат средств по исполненному переводу: создаем встречную операцию
export const refundTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const id = String(req.params.id);

    // Перед возвратом доводим операцию до финального статуса (клиент мог давно уйти)
    await processDueTransfers();

    const original = await prisma.transaction.findUnique({
      where: { id },
      include: {
        sender: { include: { account: true } },
        receiver: { include: { account: true } }
      }
    });

    if (!original || original.senderId !== userId) {
      res.status(404).json({ message: 'Операция не найдена' });
      return;
    }
    if (original.type !== 'transfer') {
      res.status(400).json({ message: 'Возврат возможен только для переводов' });
      return;
    }
    if (original.status !== TX_STATUS.completed) {
      res.status(409).json({ message: `Вернуть можно только исполненный перевод. Сейчас операция ${statusText(original.status)}.` });
      return;
    }
    if (!original.sender || !original.sender.account || !original.receiver || !original.receiver.account || !original.receiverId) {
      res.status(404).json({ message: 'Не удалось найти счета участников операции' });
      return;
    }

    const alreadyRefunded = await prisma.transaction.findFirst({ where: { refundOfId: original.id } });
    if (alreadyRefunded) {
      res.status(409).json({ message: 'Возврат по этой операции уже выполнялся' });
      return;
    }

    const senderAccountId = original.sender.account.id;
    const receiverAccountId = original.receiver.account.id;
    const receiverUserId = original.receiverId;
    const receiverCurrency = original.receiver.account.currency;
    const shortId = original.id.slice(0, 8).toUpperCase();
    const received = convertCurrency(original.amount, original.currency, receiverCurrency);
    const backAmount = original.totalDeducted;

    const result = await prisma.$transaction(async (db) => {
      // Условное списание у получателя: если он уже потратил деньги, возврат невозможен
      const debited = await db.account.updateMany({
        where: { id: receiverAccountId, balance: { gte: received } },
        data: { balance: { decrement: received } }
      });

      if (debited.count === 0) {
        const failedRefund = await db.transaction.create({
          data: {
            type: 'refund',
            status: TX_STATUS.failed,
            amount: backAmount,
            totalDeducted: backAmount,
            currency: original.currency,
            failureReason: 'insufficient_funds_on_recipient',
            processedAt: new Date(),
            refundOfId: original.id,
            senderId: userId,
            receiverId: receiverUserId,
            target: original.target,
            comment: `Возврат перевода ${shortId}`
          }
        });
        return { ok: false as const, transaction: failedRefund };
      }

      await db.account.update({ where: { id: senderAccountId }, data: { balance: { increment: backAmount } } });
      await db.transaction.update({ where: { id: original.id }, data: { status: TX_STATUS.refunded } });

      const refund = await db.transaction.create({
        data: {
          type: 'refund',
          status: TX_STATUS.completed,
          amount: backAmount,
          totalDeducted: backAmount,
          currency: original.currency,
          processedAt: new Date(),
          refundOfId: original.id,
          senderId: receiverUserId,
          receiverId: original.senderId,
          target: original.target,
          comment: `Возврат перевода ${shortId}`
        }
      });

      await db.notification.create({
        data: { userId, type: 'refund', message: `Возврат по переводу ${shortId}: +${backAmount} ${original.currency}` }
      });
      await db.notification.create({
        data: { userId: receiverUserId, type: 'refund_out', message: `Возврат перевода ${shortId}: -${received} ${receiverCurrency}` }
      });

      return { ok: true as const, transaction: refund };
    });

    if (!result.ok) {
      res.status(409).json({
        message: 'У получателя уже нет этих денег — возврат невозможен',
        transaction: txView(result.transaction)
      });
      return;
    }

    res.json({
      success: true,
      message: `Возврат выполнен: +${backAmount} ${original.currency}`,
      transaction: txView(result.transaction)
    });
  } catch (error) {
    console.error('Ошибка возврата перевода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

const prisma = new PrismaClient();
