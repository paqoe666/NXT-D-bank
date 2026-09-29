import rateLimit from 'express-rate-limit';

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