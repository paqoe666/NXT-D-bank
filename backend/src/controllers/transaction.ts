import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notifyUser } from './streamController';

const prisma = new PrismaClient();

export const transferMoney = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user.userId;
    const { receiverPhone, amount, comment } = req.body;

    if (amount <= 0) { res.status(400).json({ message: 'Сумма должна быть больше нуля' }); return; }

    const sender = await prisma.user.findUnique({ where: { id: senderId }, include: { account: true } });
    const receiver = await prisma.user.findFirst({
      where: { OR: [{ phone: receiverPhone }, { cards: { some: { number: receiverPhone } } }] },
      include: { account: true }
    });

    if (!sender || !sender.account) { res.status(404).json({ message: 'Отправитель не найден' }); return; }
    if (!receiver || !receiver.account) { res.status(404).json({ message: 'Получатель не найден' }); return; }
    if (sender.id === receiver.id) { res.status(400).json({ message: 'Нельзя перевести самому себе' }); return; }

    const senderCurr = sender.account.currency || 'RUB';
    const receiverCurr = receiver.account.currency || 'RUB';
    
    const rates: Record<string, number> = { 'RUB': 1, 'USD': 80, 'EUR': 100 };
    const amountInRub = amount * rates[senderCurr];
    let receivedAmount = amountInRub / rates[receiverCurr];
    receivedAmount = Math.round(receivedAmount * 100) / 100; 

    const commission = 0;
    const totalDeducted = amount;

    if (sender.account.balance < totalDeducted) { res.status(400).json({ message: `Недостаточно средств` }); return; }

    let newTxId = '';

    await prisma.$transaction(async (tx) => {
      await tx.account.update({ where: { id: sender.account!.id }, data: { balance: { decrement: totalDeducted } } });
      await tx.account.update({ where: { id: receiver.account!.id }, data: { balance: { increment: receivedAmount } } });

      const newTx = await tx.transaction.create({
        data: { 
          amount, 
          commission, 
          totalDeducted, 
          comment: comment || '', 
          target: receiverPhone, 
          senderId: sender.id, 
          receiverId: receiver.id, 
          type: 'transfer', 
          status: 'completed',
          // Сохраняем валюту отправителя, чтобы история не путалась
          currency: senderCurr 
        } as any
      });
      newTxId = newTx.id;

      await tx.notification.create({
        data: { userId: receiver.id, message: `Поступление: +${receivedAmount.toLocaleString()} ${receiverCurr} от ${sender.firstName}`, type: 'success', transactionId: newTxId }
      });
      
      await tx.notification.create({
        data: { userId: sender.id, message: `Перевод: -${amount.toLocaleString()} ${senderCurr} для ${receiver.firstName}`, type: 'info', transactionId: newTxId }
      });
    });

    notifyUser(sender.id, { title: 'Перевод отправлен', message: `Вы перевели ${amount} ${senderCurr}`, transactionId: newTxId });
    notifyUser(receiver.id, { title: 'Новое поступление!', message: `Вам зачислено +${receivedAmount} ${receiverCurr}`, transactionId: newTxId });

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка перевода:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const history = await prisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: { 
        sender: { select: { firstName: true, lastName: true, account: { select: { currency: true } } } }, 
        receiver: { select: { firstName: true, lastName: true, account: { select: { currency: true } } } } 
      }
    });
    res.json(history);
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const clearHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    await prisma.transaction.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};