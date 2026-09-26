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

    let balanceInRub = account.balance;
    if (oldCurrency === 'USD') balanceInRub = account.balance * 80;
    if (oldCurrency === 'EUR') balanceInRub = account.balance * 100;

    let newBalance = balanceInRub;
    if (newCurrency === 'USD') newBalance = balanceInRub / 80;
    if (newCurrency === 'EUR') newBalance = balanceInRub / 100;

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

// --- НОВЫЙ МЕТОД СОХРАНЕНИЯ ИМЕНИ КАРТЫ ---
export const updateCardName = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { cardId, ownerName } = req.body;
    if (!cardId || !ownerName) { res.status(400).json({ message: 'Нет данных' }); return; }
    
    await prisma.card.update({ 
      where: { id: cardId }, 
      data: { ownerName: ownerName.toUpperCase() } 
    });
    
    res.json({ success: true });
  } catch (error) { 
    res.status(500).json({ message: 'Ошибка сервера' }); 
  }
};