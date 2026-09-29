import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { apiKeyAuth, requireWriteScope } from '../../middlewares/apiAppAuth';
import { writeLimiter } from '../../middlewares/rateLimiter';
import * as money from '../../controllers/v1/moneyController';
import * as publicV1 from '../../controllers/v1/publicController';
import * as usersV1 from '../../controllers/v1/userReadController';
import { getPaymentRequestByToken } from '../../controllers/paymentRequestController';

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
router.get('/rates', publicV1.getRates);
router.get('/payment-requests/:token', getPaymentRequestByToken);

// --- Данные пользователя (только с ключом приложения, только чтение) ---
router.get('/users/lookup', apiKeyAuth, usersV1.lookupUser);
router.get('/users/:userId', apiKeyAuth, usersV1.getUser);
router.get('/users/:userId/balance', apiKeyAuth, usersV1.getUserBalance);
router.get('/users/:userId/cards', apiKeyAuth, usersV1.getUserCards);
router.get('/users/:userId/transactions', apiKeyAuth, usersV1.getUserTransactions);

// --- Денежные операции: нужен ключ со scope "write" и DBANK_WRITE_ENABLED=true на сервере ---
router.post('/users/:userId/debit', apiKeyAuth, requireWriteScope, writeLimiter, money.debit);
router.post('/users/:userId/credit', apiKeyAuth, requireWriteScope, writeLimiter, money.credit);
router.get('/transactions/:txId', apiKeyAuth, money.getTransaction);

export default router;
