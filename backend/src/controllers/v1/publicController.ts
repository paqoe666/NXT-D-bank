import { Request, Response } from 'express';
import { BIN_REGISTRY, findBin, detectBin, luhnCheck, maskCardNumber, normalizeCardNumber } from '../../services/bin.service';
import { CURRENCY_RATES } from '../../services/ledger.service';

// Курсы валют банка: за единицу валюты сколько рублей
export const getRates = (_req: Request, res: Response): void => {
  res.json({ base: 'RUB', rates: CURRENCY_RATES, updatedAt: new Date().toISOString() });
};

// Корневой эндпоинт: краткая справка, чтобы внешнему разработчику было понятно, что тут есть
export const getIndex = (_req: Request, res: Response): void => {
  res.json({
    api: 'NXT D-Bank API',
    version: 'v1',
    mode: 'Учебная песочница: деньги фейковые, реальные платежи невозможны',
    auth: {
      public: 'без авторизации',
      userData: 'заголовок X-API-Key (ключ выдает владелец банка)',
      money: 'заголовок X-API-Key у ключа со scope "write" (формат ключа в NXT_API_KEYS: имя:ключ:read|write) + переменная DBANK_WRITE_ENABLED=true на сервере'
    },
    endpoints: {
      public: [
        'GET /api/v1/health',
        'GET /api/v1/bins',
        'GET /api/v1/bins/:bin',
        'POST /api/v1/cards/validate',
        'GET /api/v1/rates',
        'GET /api/v1/payment-requests/:token'
      ],
      withApiKey: [
        'GET /api/v1/users/lookup?target=',
        'GET /api/v1/users/:userId',
        'GET /api/v1/users/:userId/balance',
        'GET /api/v1/users/:userId/cards',
        'GET /api/v1/users/:userId/transactions?limit=&cursor=',
        'GET /api/v1/transactions/:txId'
      ],
      withApiKeyWriteScope: [
        'POST /api/v1/users/:userId/debit',
        'POST /api/v1/users/:userId/credit'
      ]
    },
    money: {
      units: 'amountMinor — ЦЕЛОЕ в минорных единицах (копейках): 50000 = 500,00 ₽. Ответ операции отдаёт amount/totalDeducted/commission тоже в минорных единицах, а balanceAfter — в major-единицах (как в GET /users/:id/balance). В БД (ленте операций) суммы остаются в major-единицах.',
      request: { amountMinor: 'целое > 0 и <= 100000000', currency: 'опционально, должна совпадать с валютой счета', comment: 'опционально, до 140 символов', reference: 'опционально, до 140 символов, для сверки у клиента', dryRun: 'опционально, true = посчитать без применения (ответ с applied:false)' },
      limits: 'WRITE_RATE_MAX операций записи в минуту НА КЛЮЧ (по умолчанию 20). Заголовки x-ratelimit-limit/remaining/reset.',
      idempotency: 'Заголовок Idempotency-Key: повтор с тем же ключом и тем же телом возвращает тот же ответ (заголовок Idempotent-Replay: true) и второй раз деньги не списывает; с тем же ключом, но другим телом — 409 idempotency_conflict. Записи хранятся 24 часа.',
      sync: 'Операции применяются синхронно: в успешном ответе status=completed, balanceAfter актуален. dryRun всегда возвращает status=pending и applied=false.',
      errors: ['invalid_api_key 401', 'forbidden_scope 403', 'user_not_found 404', 'transaction_not_found 404', 'idempotency_conflict 409', 'invalid_amount 422', 'invalid_currency 422', 'insufficient_funds 422', 'account_blocked 423', 'too_many_requests 429']
    },
    security: 'Наружу уходят только маскированные данные: номер карты (**** **** **** 1234) и CVV никогда не покидают банк'
  });
};

export const getHealth = (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    service: 'NXT D-Bank API',
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
};

// Публичный справочник BIN-ов: brand/type/country/issuer по префиксу карты
export const listBins = (_req: Request, res: Response): void => {
  res.json({ count: BIN_REGISTRY.length, bins: BIN_REGISTRY });
};

export const getBin = (req: Request, res: Response): void => {
  const bin = findBin(String(req.params.bin));
  if (!bin) {
    res.status(404).json({ error: { code: 'bin_not_found', message: 'Такой BIN не выпускается этим банком' } });
    return;
  }
  res.json(bin);
};

// Проверка номера карты: алгоритм Луна + определение бренда. Ничего не сохраняем
// и не сообщаем, существует ли такая карта в банке.
export const validateCard = (req: Request, res: Response): void => {
  const raw = req.body?.number ?? req.body?.card ?? '';
  const digits = normalizeCardNumber(raw);

  if (!digits) {
    res.status(400).json({ error: { code: 'card_number_required', message: 'Передайте номер карты в поле number' } });
    return;
  }

  const bin = detectBin(digits);
  const luhn = luhnCheck(digits);

  res.json({
    valid: Boolean(bin) && luhn && digits.length === 16,
    luhn,
    length: digits.length,
    masked: maskCardNumber(digits),
    brand: bin ? bin.brand : null,
    brandId: bin ? bin.brandId : null,
    type: bin ? bin.type : null,
    country: bin ? bin.country : null,
    issuer: bin ? bin.issuer : null,
    logo: bin ? bin.logo : null
  });
};
