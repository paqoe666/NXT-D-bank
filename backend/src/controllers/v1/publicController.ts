import { Request, Response } from 'express';
import { BIN_REGISTRY, findBin, detectBin, luhnCheck, maskCardNumber, normalizeCardNumber } from '../../services/bin.service';

// Корневой эндпоинт: краткая справка, чтобы внешнему разработчику было понятно, что тут есть
export const getIndex = (_req: Request, res: Response): void => {
  res.json({
    api: 'NXT D-Bank API',
    version: 'v1',
    mode: 'Учебная песочница: деньги фейковые, реальные платежи невозможны',
    auth: {
      public: 'без авторизации',
      userData: 'заголовок X-API-Key (ключ выдает владелец банка)'
    },
    endpoints: {
      public: [
        'GET /api/v1/health',
        'GET /api/v1/bins',
        'GET /api/v1/bins/:bin',
        'POST /api/v1/cards/validate'
      ],
      withApiKey: [
        'GET /api/v1/users/lookup?target=',
        'GET /api/v1/users/:userId',
        'GET /api/v1/users/:userId/balance',
        'GET /api/v1/users/:userId/cards',
        'GET /api/v1/users/:userId/transactions?limit=&cursor='
      ]
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
