import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';
import { binPrefixFor, luhnCheckDigit } from '../services/bin.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // ДОБАВИЛИ cardSystem
    const { firstName, lastName, phone, login, password, cardSystem } = req.body;

    if (!firstName || !lastName || !phone || !login || !password) {
      res.status(400).json({ message: 'Все поля обязательны' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone }, { login }] }
    });

    if (existingUser) {
      res.status(400).json({ message: 'Пользователь с таким телефоном или логином уже существует' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // --- ЛОГИКА ГЕНЕРАЦИИ ПО BIN (реестр BIN-ов: services/bin.service.ts) ---
    const selectedBin = binPrefixFor(cardSystem); // По умолчанию N-cards

    // 11 криптослучайных цифр + контрольная цифра по алгоритму Луна = 16 цифр.
    // Благодаря контрольной цифре номер проходит проверку /api/v1/cards/validate.
    let randomDigits = '';
    for (let i = 0; i < 11; i++) randomDigits += randomInt(0, 10).toString();
    const cardNumber = selectedBin + randomDigits + luhnCheckDigit(selectedBin + randomDigits);

    const cvv = randomInt(100, 1000).toString();
    const expiryYear = new Date().getFullYear() + 6;
    const expiryDate = `12/${expiryYear.toString().slice(-2)}`;

    await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        login,
        password: hashedPassword,
        account: {
          create: { balance: 0, currency: 'RUB' }
        },
        cards: {
          create: {
            number: cardNumber,
            expiryDate,
            cvv,
            ownerName: `${firstName.toUpperCase()} ${lastName.toUpperCase()}`
          }
        }
      }
    });

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      res.status(400).json({ message: 'Введите логин и пароль' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Неверный логин или пароль' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'nxt_super_secret', 
      { expiresIn: '24h' }
    );

    res.json({ token, message: 'Успешный вход' });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
};