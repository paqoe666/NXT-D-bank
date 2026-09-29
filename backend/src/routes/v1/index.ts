import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { apiKeyAuth } from '../../middlewares/apiAppAuth';
import * as publicV1 from '../../controllers/v1/publicController';
import * as usersV1 from '../../controllers/v1/userReadController';

const router = Router();

// Умеренный лимит на внешний API, чтобы одно приложение не положило банк
const v1Limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: { code: 'rate_limited', message: 'Слишком много запросов к API. Попробуйте через минуту.' } }
});

router.use(v1Limiter);

// --- Публичные эндпоинты (без ключа) ---
router.get('/', publicV1.getIndex);
router.get('/health', publicV1.getHealth);
router.get('/bins', publicV1.listBins);
router.get('/bins/:bin', publicV1.getBin);
router.post('/cards/validate', publicV1.validateCard);

// --- Данные пользователя (только с ключом приложения, только чтение) ---
router.get('/users/lookup', apiKeyAuth, usersV1.lookupUser);
router.get('/users/:userId', apiKeyAuth, usersV1.getUser);
router.get('/users/:userId/balance', apiKeyAuth, usersV1.getUserBalance);
router.get('/users/:userId/cards', apiKeyAuth, usersV1.getUserCards);
router.get('/users/:userId/transactions', apiKeyAuth, usersV1.getUserTransactions);

export default router;
