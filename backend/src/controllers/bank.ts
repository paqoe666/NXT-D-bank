import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CURRENCY_RATES, processDueTransfers } from '../services/ledger.service';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    // Продвигаем «созревшие» операции, чтобы статусы и балансы были актуальными
    await processDueTransfers();

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
    if (!account) { res.status(404).json({ message: 'Счет не найден' }); return; }

    const oldCurrency = account.currency;
    if (oldCurrency === newCurrency) { res.json({ success: true }); return; }

    // Пока есть незавершенные операции, менять валюту нельзя:
    // зарезервированные суммы хранятся в старой валюте
    if (account.held > 0) {
      res.status(409).json({ message: 'Есть операции в обработке. Дождитесь их завершения или отмените их.' });
      return;
    }

    const rates = CURRENCY_RATES;

    const rateOld = rates[oldCurrency] || 1;
    const rateNew = rates[newCurrency] || 1;

    const convert = (value: number) => Math.round((value * rateOld / rateNew) * 100) / 100;

    await prisma.account.update({
      where: { userId },
      data: { currency: newCurrency, balance: convert(account.balance), held: convert(account.held) }
    });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: 'Ошибка сервера' }); }
};

export const updatePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ message: 'Пользователь не найден' }); return; }

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
