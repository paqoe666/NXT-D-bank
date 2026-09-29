import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Телефон в БД может быть записан в свободном формате («+7 999 000-00-00»).
// Готовим все вероятные варианты, чтобы поиск сработал в любом случае.
const phoneCandidates = (raw: string): string[] => {
  const withoutSpaces = raw.replace(/[\s\-()]/g, '');
  const digits = withoutSpaces.replace(/\D/g, '');
  return Array.from(new Set([withoutSpaces, digits, digits ? `+${digits}` : ''].filter(Boolean)));
};

export const ceoDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    // Фронтенд присылает target, но старый вариант targetPhone тоже поддерживаем
    const rawTarget = req.body.target ?? req.body.targetPhone;
    const amount = Number(req.body.amount);

    // 1. Проверяем, является ли текущий пользователь CEO
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser || currentUser.role !== 'ceo') {
      res.status(403).json({ message: 'В доступе отказано. Только для CEO.' });
      return;
    }

    if (!rawTarget || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ message: 'Укажите номер карты (или телефона) и сумму больше нуля' });
      return;
    }

    const target = String(rawTarget).trim();
    const candidates = phoneCandidates(target);
    const digitsOnly = target.replace(/\D/g, '');

    // 2. Ищем получателя по номеру карты ИЛИ телефону (быстрый путь — по индексам)
    let receiver = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { in: candidates } },
          { cards: { some: { number: digitsOnly || target } } }
        ]
      },
      include: { account: true }
    });

    // Запасной путь: телефон записан в свободном формате, поэтому сравниваем только цифры
    if (!receiver && digitsOnly.length >= 6) {
      const allUsers = await prisma.user.findMany({ select: { id: true, phone: true } });
      const match = allUsers.find((u) => u.phone.replace(/\D/g, '') === digitsOnly);
      if (match) {
        receiver = await prisma.user.findUnique({ where: { id: match.id }, include: { account: true } });
      }
    }

    if (!receiver) {
      res.status(404).json({ message: 'Получатель не найден: проверьте номер карты или телефона' });
      return;
    }

    if (!receiver.account) {
      res.status(404).json({ message: 'У получателя нет открытого счета' });
      return;
    }

    // 3. Начисляем деньги, пишем квитанцию и уведомление — всё одной транзакцией
    const recipient = receiver;
    const account = receiver.account;
    const depositAmount = Math.round(amount * 100) / 100;

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: { balance: { increment: depositAmount } }
      });

      await tx.transaction.create({
        data: {
          type: 'deposit',
          status: 'completed',
          amount: depositAmount,
          totalDeducted: depositAmount, // при пополнении комиссия не берется
          currency: account.currency,
          senderId: currentUser.id,
          receiverId: recipient.id,
          target: digitsOnly || target,
          comment: 'Эмиссия средств от CEO'
        }
      });

      await tx.notification.create({
        data: {
          userId: recipient.id,
          type: 'deposit',
          message: `Ваш счет пополнен на ${depositAmount} ${account.currency}.`
        }
      });
    });

    res.json({
      success: true,
      message: `Счет ${recipient.firstName} ${recipient.lastName.charAt(0)}. пополнен на ${depositAmount} ${account.currency}`
    });
  } catch (error) {
    console.error('Ошибка пополнения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};