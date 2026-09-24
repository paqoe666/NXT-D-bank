import rateLimit from 'express-rate-limit';

// Ограничение: максимум 10 попыток входа за 5 минут
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  message: { message: 'Слишком много попыток входа. Повторите через 5 минут.' }
});

// Ограничение: максимум 5 переводов за 1 минуту для предотвращения дабл-кликов
export const transferLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { message: 'Слишком частые операции. Подождите минуту.' }
}); 