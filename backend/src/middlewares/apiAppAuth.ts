import { Request, Response, NextFunction } from 'express';

export interface AppAuthRequest extends Request {
  apiApp?: { name: string; scopes: string[] };
}

// Ключи внешних приложений задаются переменной окружения NXT_API_KEYS на хостинге.
// Формат: "casino-dena:key123,other-app:key456" (можно и просто "key123,key456").
// Ключи намеренно живут в окружении, а не в БД: так их можно менять без миграций.
const parseApiKeys = (raw?: string): Map<string, string> => {
  const map = new Map<string, string>();
  String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separator = entry.indexOf(':');
      if (separator > 0) {
        map.set(entry.slice(separator + 1).trim(), entry.slice(0, separator).trim());
      } else {
        map.set(entry, 'app');
      }
    });
  return map;
};

export const apiKeyAuth = (req: AppAuthRequest, res: Response, next: NextFunction): void => {
  const header = req.headers['x-api-key'];
  const providedKey = Array.isArray(header) ? header[0] : header;

  const apiKeys = parseApiKeys(process.env.NXT_API_KEYS);

  if (apiKeys.size === 0) {
    res.status(503).json({
      error: {
        code: 'api_keys_not_configured',
        message: 'API-ключи не настроены: задайте переменную окружения NXT_API_KEYS'
      }
    });
    return;
  }

  if (!providedKey || !apiKeys.has(providedKey)) {
    res.status(401).json({
      error: { code: 'invalid_api_key', message: 'Неверный или отсутствующий заголовок X-API-Key' }
    });
    return;
  }

  // Пока у всех приложений только чтение. Роли/скоупы (payments:create и т.д.) добавим на этапе платежей.
  req.apiApp = { name: apiKeys.get(providedKey) as string, scopes: ['read'] };
  next();
};
