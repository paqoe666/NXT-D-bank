import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findUserByAnyTarget } from '../../services/lookup.service';
import { detectBin, maskCardNumber, maskPhone } from '../../services/bin.service';

const prisma = new PrismaClient();

// Единый формат ошибок для внешнего API
const fail = (res: Response, status: number, code: string, message: string): void => {
  res.status(status).json({ error: { code, message } });
};

// Наружу отдаём только безопасные поля пользователя — без пароля и без данных карт
const publicUserView = (user: any) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`.trim(),
  maskedPhone: maskPhone(user.phone),
  role: user.role,
  hasAccount: Boolean(user.account),
  createdAt: user.createdAt
});

// Данные карты без номера и CVV: только бренд, последние 4 цифры и срок
const publicCardView = (card: any) => {
  const bin = detectBin(card.number);
  return {
    id: card.id,
    brand: bin ? bin.brand : null,
    brandId: bin ? bin.brandId : null,
    logo: bin ? bin.logo : null,
    maskedNumber: maskCardNumber(card.number),
    last4: String(card.number).slice(-4),
    expiryDate: card.expiryDate,
    ownerName: card.ownerName,
    cardName: card.cardName,
    isBlocked: card.isBlocked,
    designIndex: card.designIndex
  };
};

const maskTarget = (target?: string | null) => {
  const digits = String(target || '').replace(/\D/g, '');
  return digits.length >= 4 ? `****${digits.slice(-4)}` : null;
};

// Поиск игрока по телефону, номеру карты или id — чтобы приложение получило userId
export const lookupUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const target = String(req.query.target || '').trim();
    if (!target) { fail(res, 400, 'target_required', 'Укажите параметр target (телефон, номер карты или userId)'); return; }

    const user = await findUserByAnyTarget(target);
    if (!user) { res.json({ found: false, user: null }); return; }

    res.json({ found: true, user: publicUserView(user) });
  } catch (error) {
    console.error('API v1 lookup error:', error);
    fail(res, 500, 'internal_error', 'Внутренняя ошибка сервера');
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true }
    });
    if (!user) { fail(res, 404, 'user_not_found', 'Пользователь не найден'); return; }
    res.json(publicUserView(user));
  } catch (error) {
    console.error('API v1 user error:', error);
    fail(res, 500, 'internal_error', 'Внутренняя ошибка сервера');
  }
};

export const getUserBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true }
    });
    if (!user) { fail(res, 404, 'user_not_found', 'Пользователь не найден'); return; }
    if (!user.account) { fail(res, 404, 'account_not_found', 'У пользователя нет открытого счета'); return; }

    res.json({
      userId: user.id,
      name: `${user.firstName} ${user.lastName ? user.lastName.charAt(0) + '.' : ''}`.trim(),
      currency: user.account.currency,
      balance: user.account.balance
    });
  } catch (error) {
    console.error('API v1 balance error:', error);
    fail(res, 500, 'internal_error', 'Внутренняя ошибка сервера');
  }
};

export const getUserCards = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cards: { orderBy: { designIndex: 'asc' } } }
    });
    if (!user) { fail(res, 404, 'user_not_found', 'Пользователь не найден'); return; }

    const cards = user.cards.map(publicCardView);
    res.json({ userId: user.id, count: cards.length, cards });
  } catch (error) {
    console.error('API v1 cards error:', error);
    fail(res, 500, 'internal_error', 'Внутренняя ошибка сервера');
  }
};

// Выписка по операциям: только чтение, с пагинацией (limit + cursor)
export const getUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.params.userId);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { fail(res, 404, 'user_not_found', 'Пользователь не найден'); return; }

    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        receiver: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const items = transactions.map((tx) => {
      const isOutgoing = tx.senderId === userId;
      const counterparty = isOutgoing
        ? (tx.receiver ? `${tx.receiver.firstName} ${tx.receiver.lastName.charAt(0)}.` : maskTarget(tx.target))
        : (tx.sender ? `${tx.sender.firstName} ${tx.sender.lastName.charAt(0)}.` : 'NXT D-Bank');

      return {
        id: tx.id,
        type: tx.type,
        status: tx.status,
        direction: isOutgoing ? 'out' : 'in',
        amount: tx.amount,
        totalDeducted: tx.totalDeducted,
        commission: tx.commission,
        currency: tx.currency,
        comment: tx.comment,
        counterparty,
        createdAt: tx.createdAt
      };
    });

    res.json({
      userId,
      count: items.length,
      nextCursor: items.length === limit ? items[items.length - 1].id : null,
      transactions: items
    });
  } catch (error) {
    console.error('API v1 transactions error:', error);
    fail(res, 500, 'internal_error', 'Внутренняя ошибка сервера');
  }
};
