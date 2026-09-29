import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createTransfer } from '../services/transfer.service';
import { convertCurrency } from '../services/ledger.service';

const prisma = new PrismaClient();

const round2 = (value: number) => Math.round(value * 100) / 100;

// Публичный токен из ссылки: случайный, поэтому ссылку невозможно подобрать перебором
const newToken = () => randomBytes(9).toString('base64url');

const fail = (res: Response, status: number, message: string) => res.status(status).json({ message });

// Представление запроса для приложения банка
const requestView = (request: any, requesterName?: string) => ({
  id: request.id,
  token: request.token,
  amount: request.amount,
  currency: request.currency,
  title: request.title,
  status: request.status,
  paidCount: request.paidCount,
  paidAmount: request.paidAmount,
  remaining: request.amount === null ? null : Math.max(0, round2(request.amount - request.paidAmount)),
  requesterName: requesterName ?? undefined,
  createdAt: request.createdAt,
  expiresAt: request.expiresAt
});

// Создать запрос денег: «скинь 500 ₽ на кофе». amount пустой = любая сумма
export const createPaymentRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { amount, title } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
    if (!user) { fail(res, 404, 'Пользователь не найден'); return; }

    const rawAmount = amount === undefined || amount === null || amount === '' ? null : Number(amount);
    if (rawAmount !== null && (!Number.isFinite(rawAmount) || rawAmount <= 0)) {
      fail(res, 400, 'Сумма должна быть положительной или пустой (тогда плательщик выбирает сумму сам)');
      return;
    }
    if (title && String(title).length > 120) { fail(res, 400, 'Назначение платежа слишком длинное (до 120 символов)'); return; }

    const created = await prisma.paymentRequest.create({
      data: {
        token: newToken(),
        userId,
        amount: rawAmount === null ? null : round2(rawAmount),
        currency: user.account?.currency || 'RUB',
        title: title ? String(title).trim().slice(0, 120) : null
      }
    });

    res.status(201).json(requestView(created));
  } catch (error) {
    console.error('Ошибка создания запроса денег:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Мои запросы денег
export const getMyPaymentRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await prisma.paymentRequest.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ count: requests.length, requests: requests.map((r) => requestView(r)) });
  } catch (error) {
    console.error('Ошибка списка запросов денег:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Отменить свой запрос
export const cancelPaymentRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await prisma.paymentRequest.findFirst({
      where: { id: String(req.params.id), userId: req.user.userId }
    });
    if (!request) { fail(res, 404, 'Запрос не найден'); return; }
    if (request.status === 'paid') { fail(res, 409, 'Запрос уже оплачен, отменить нельзя'); return; }

    const updated = await prisma.paymentRequest.update({ where: { id: request.id }, data: { status: 'canceled' } });
    res.json({ success: true, request: requestView(updated) });
  } catch (error) {
    console.error('Ошибка отмены запроса денег:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Публичная информация по запросу из ссылки (без авторизации).
// Раскрываем только имя для подписи «кто просит» — никаких телефонов и id.
export const getPaymentRequestByToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await prisma.paymentRequest.findUnique({
      where: { token: String(req.params.token) },
      include: { user: { select: { firstName: true, lastName: true } } }
    });
    if (!request) { fail(res, 404, 'Запрос не найден'); return; }

    const requesterName = `${request.user.firstName} ${request.user.lastName ? request.user.lastName.charAt(0) + '.' : ''}`.trim();
    const expired = Boolean(request.expiresAt && request.expiresAt.getTime() < Date.now());

    res.json({
      ...requestView(request, requesterName),
      expired
    });
  } catch (error) {
    console.error('Ошибка получения запроса денег:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Оплата запроса по ссылке: обычный перевод со счета плательщика владельцу запроса
export const payPaymentRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payerId = req.user.userId;
    const token = String(req.params.token);

    const request = await prisma.paymentRequest.findUnique({ where: { token } });
    if (!request) { fail(res, 404, 'Запрос не найден'); return; }
    if (request.userId === payerId) { fail(res, 400, 'Нельзя оплатить собственный запрос'); return; }
    if (request.status === 'canceled') { fail(res, 409, 'Автор отменил этот запрос'); return; }
    if (request.status === 'paid') { fail(res, 409, 'Этот запрос уже оплачен'); return; }
    if (request.expiresAt && request.expiresAt.getTime() < Date.now()) { fail(res, 410, 'Срок действия запроса истёк'); return; }

    // Сумма в валюте запроса: фиксированная или введенная плательщиком
    let amountInRequestCurrency: number;
    if (request.amount !== null && request.amount !== undefined) {
      amountInRequestCurrency = request.amount;
    } else {
      const raw = Number(req.body?.amount);
      if (!Number.isFinite(raw) || raw <= 0) { fail(res, 400, 'Укажите сумму платежа'); return; }
      amountInRequestCurrency = round2(raw);
    }

    const payer = await prisma.user.findUnique({ where: { id: payerId }, include: { account: true } });
    if (!payer || !payer.account) { fail(res, 404, 'Счет плательщика не найден'); return; }

    // Списание всегда идет в валюте плательщика, как при обычном переводе
    const amountInPayerCurrency = convertCurrency(amountInRequestCurrency, request.currency, payer.account.currency);

    const transfer = await createTransfer({
      senderId: payerId,
      target: request.userId,
      amount: amountInPayerCurrency,
      comment: request.title ? `${request.title} (запрос денег)` : 'Оплата запроса денег'
    });

    if (!transfer.ok) { fail(res, transfer.status, transfer.message); return; }

    const collected = round2(request.paidAmount + amountInRequestCurrency);
    const fullyPaid = request.amount !== null && request.amount !== undefined && collected >= request.amount;
    const updated = await prisma.paymentRequest.update({
      where: { id: request.id },
      data: { paidCount: { increment: 1 }, paidAmount: collected, status: fullyPaid ? 'paid' : 'active' }
    });

    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'payment_request',
        transactionId: transfer.transactionId,
        message: `${payer.firstName} ${payer.lastName ? payer.lastName.charAt(0) + '.' : ''} оплатил ваш запрос: +${amountInRequestCurrency} ${request.currency}${request.title ? ` (${request.title})` : ''}`
      }
    });

    res.json({
      success: true,
      message: 'Платёж отправлен в обработку',
      transaction: {
        id: transfer.transactionId,
        status: transfer.status,
        amount: transfer.amount,
        currency: transfer.currency,
        createdAt: transfer.createdAt
      },
      chargedAmount: transfer.amount,
      chargedCurrency: transfer.currency,
      receivedAmount: transfer.receivedAmount,
      request: requestView(updated)
    });
  } catch (error) {
    console.error('Ошибка оплаты запроса денег:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
