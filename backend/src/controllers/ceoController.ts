import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const ceoDeposit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { targetPhone, amount } = req.body;

    // 1. Проверяем, является ли текущий пользователь CEO
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser || currentUser.role !== 'ceo') {
      res.status(403).json({ message: 'В доступе отказано. Только для CEO.' });
      return;
    }

    if (!targetPhone || !amount || amount <= 0) {
      res.status(400).json({ message: 'Некорректные данные для пополнения' });
      return;
    }

    // 2. Ищем счастливчика
    const targetUser = await prisma.user.findUnique({
      where: { phone: targetPhone },
      include: { account: true }
    });

    if (!targetUser || !targetUser.account) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }

    // 3. Начисляем деньги, пишем квитанцию и шлем пуш
    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: targetUser.account!.id },
        data: { balance: { increment: amount } }
      });

      await tx.transaction.create({
        data: {
          type: 'deposit',
          status: 'completed',
          amount: amount,
          totalDeducted: amount,
          currency: targetUser.account!.currency,
          senderId: currentUser.id,
          receiverId: targetUser.id,
          target: targetPhone,
          comment: 'Эмиссия средств от CEO'
        }
      });

      await tx.notification.create({
        data: {
          userId: targetUser.id,
          type: 'deposit',
          message: `Ваш счет пополнен на ${amount} ${targetUser.account!.currency}.`
        }
      });
    });

    res.json({ message: `Счет пользователя ${targetPhone} успешно пополнен на ${amount}` });
  } catch (error) {
    console.error('Ошибка пополнения:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};