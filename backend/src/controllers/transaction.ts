import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { firstName: true, lastName: true, account: true } },
        receiver: { select: { firstName: true, lastName: true, account: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const clearHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    await prisma.transaction.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const transferMoney = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { target: rawTarget, receiverPhone, amount, comment } = req.body;
    const target = rawTarget || receiverPhone; 
    const senderId = req.user.userId;
    const transferAmount = Number(amount);

    if (!target || transferAmount <= 0) {
      res.status(400).json({ message: 'Неверные данные для перевода' }); return;
    }

    const cleanTarget = target.replace(/[\s-]/g, '');

    const sender = await prisma.user.findUnique({ where: { id: senderId }, include: { account: true, cards: true } });
    if (!sender || !sender.account) { res.status(404).json({ message: 'Отправитель не найден' }); return; }

    if (sender.account.balance < transferAmount) { 
      res.status(400).json({ message: 'Недостаточно средств' }); 
      return; 
    }

    const receiver = await prisma.user.findFirst({
      where: { OR: [{ phone: cleanTarget }, { cards: { some: { number: cleanTarget } } }] },
      include: { account: true }
    });

    if (!receiver || !receiver.account) { res.status(404).json({ message: 'Получатель не найден' }); return; }

    await prisma.account.update({ where: { id: sender.account.id }, data: { balance: sender.account.balance - transferAmount } });
    await prisma.account.update({ where: { id: receiver.account.id }, data: { balance: receiver.account.balance + transferAmount } });

    await prisma.transaction.create({
      data: {
        type: 'transfer', 
        status: 'completed', 
        amount: transferAmount, 
        totalDeducted: transferAmount, 
        currency: sender.account.currency, 
        senderId: sender.id, 
        receiverId: receiver.id,
        target: cleanTarget, 
        comment: comment || 'Перевод средств',
      }
    });

    // Уведомление ПОЛУЧАТЕЛЮ
    await prisma.notification.create({
      data: { userId: receiver.id, message: `Вам перевод: +${transferAmount} ${sender.account.currency}. ${comment ? comment : ''}`, type: 'transfer' }
    });

    // Уведомление ОТПРАВИТЕЛЮ (Тебе)
    await prisma.notification.create({
      data: { userId: sender.id, message: `Перевод отправлен: -${transferAmount} ${sender.account.currency}.`, type: 'transfer_out' }
    });

    res.json({ success: true, message: 'Перевод успешно отправлен' });
  } catch (error) { console.error('Ошибка перевода:', error); res.status(500).json({ message: 'Ошибка сервера' }); }
};