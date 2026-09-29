import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        account: true,
        cards: { orderBy: { designIndex: 'asc' } },
        notifications: { where: { isRead: false }, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!user) { res.status(404).json({ message: 'Пользователь не найден' }); return; }

    res.json({
      client: `${user.firstName} ${user.lastName}`,
      account: user.account,
      cards: user.cards,
      notifications: user.notifications || []
    });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const updateCardDesign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { designIndex, cardId } = req.body;
    if (cardId) { await prisma.card.update({ where: { id: cardId }, data: { designIndex } }); } 
    else { await prisma.card.updateMany({ where: { userId }, data: { designIndex } }); }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const updateCurrency = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { currency: newCurrency } = req.body;
    const account = await prisma.account.findUnique({ where: { userId } });
    if (!account) return;

    const oldCurrency = account.currency;
    if (oldCurrency === newCurrency) { res.json({ success: true }); return; }

    const rates: Record<string, number> = {
      'RUB': 1, 'USD': 80, 'EUR': 100, 'GBP': 120, 'UAH': 2.5,
      'CNY': 12, 'CHF': 110, 'JPY': 0.6, 'BYN': 30, 'AED': 22, 'KZT': 0.2
    };

    const rateOld = rates[oldCurrency] || 1;
    const rateNew = rates[newCurrency] || 1;

    let balanceInRub = account.balance * rateOld;
    let newBalance = balanceInRub / rateNew;

    newBalance = Math.round(newBalance * 100) / 100;
    await prisma.account.update({ where: { userId }, data: { currency: newCurrency, balance: newBalance } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) { res.status(400).json({ message: 'Неверный текущий пароль' }); return; }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const resolveRecipient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { target } = req.query;
    if (!target) { res.json({ name: null }); return; }

    const receiver = await prisma.user.findFirst({
      where: { OR: [{ phone: String(target) }, { cards: { some: { number: String(target) } } }] }
    });

    if (receiver) {
      const initial = receiver.lastName ? `${receiver.lastName.charAt(0)}.` : '';
      res.json({ name: `${receiver.firstName} ${initial}` });
    } else { res.json({ name: null }); }
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const updateCardName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cardId, cardName } = req.body;
    if (!cardId || !cardName) { res.status(400).json({ message: 'Нет данных' }); return; }
    await prisma.card.update({ where: { id: cardId }, data: { cardName } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

// ИСПРАВЛЕНИЕ: Вернули функцию пополнения для панели CEO!
export const deposit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { target, amount } = req.body;
    const depositAmount = Number(amount);

    if (!target || depositAmount <= 0) {
      res.status(400).json({ message: 'Неверные данные' }); return;
    }

    const receiver = await prisma.user.findFirst({
      where: { cards: { some: { number: target } } },
      include: { account: true }
    });

    if (!receiver || !receiver.account) { res.status(404).json({ message: 'Карта не найдена' }); return; }

    await prisma.account.update({
      where: { id: receiver.account.id },
      data: { balance: receiver.account.balance + depositAmount }
    });

    await prisma.transaction.create({
      data: {
        type: 'deposit',
        status: 'completed',
        amount: depositAmount,
        totalDeducted: depositAmount,
        currency: receiver.account.currency,
        senderId: req.user.userId,
        receiverId: receiver.id,
        target: target,
        comment: 'Пополнение счета CEO',
      }
    });

    await prisma.notification.create({
      data: { userId: receiver.id, message: `Счет пополнен (NXT CEO): +${depositAmount} ${receiver.account.currency}`, type: 'deposit' }
    });

    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};