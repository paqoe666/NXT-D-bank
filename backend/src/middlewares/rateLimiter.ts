import rateLimit from 'express-rate-limit';
import { AppAuthRequest } from './apiAppAuth';

// Пороги можно поднять через окружение (например, для приема платежей от сторонних приложений)
const authMax = Number(process.env.AUTH_RATE_MAX ?? 10);
const transferMax = Number(process.env.TRANSFER_RATE_MAX ?? 5);

// Ограничение: максимум попыток входа за 5 минут
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: authMax,
  message: { message: 'Слишком много попыток входа. Повторите через 5 минут.' }
});

// Ограничение: максимум переводов за 1 минуту для предотвращения дабл-кликов
export const transferLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: transferMax,
  message: { message: 'Слишком частые операции. Подождите минуту.' }
});

// Лимит на денежные операции внешнего API (debit/credit).
// Считаем ПО КЛЮЧУ приложения, а не по IP: иначе все приложения за прокси Render делили бы один лимит.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.WRITE_RATE_MAX ?? 20),
  standardHeaders: true, // x-ratelimit-limit / remaining / reset
  keyGenerator: (req) => {
    const apiApp = (req as AppAuthRequest).apiApp;
    return apiApp ? `${apiApp.name}:${apiApp.keyPrefix}` : `ip:${req.ip}`;
  },
  message: { error: { code: 'too_many_requests', message: 'Слишком много операций записи. Повторите через минуту.' } }
});