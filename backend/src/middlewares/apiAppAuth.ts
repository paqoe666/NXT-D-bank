import { Request, Response, NextFunction } from 'express';

export interface ApiApp {
  name: string;
  key: string;        // сам секрет: в логи и ответы не попадает, нужен только для хэша аудита
  keyPrefix: string;  // первые 8 символов ключа — то, что попадает в логи
  scopes: string[];
}

export interface AppAuthRequest extends Request {
  apiApp?: ApiApp;
}

// Ключи внешних приложений задаются переменной окружения NXT_API_KEYS на хостинге.
// Формат: "имя-приложения:ключ:scope1|scope2"
//   например: "casino-dena:77914fae...:read|casino-dena-rw:1122ff...:read|write"
// Если scope не указан — доступно только чтение (обратная совместимость со старыми ключами).
const parseApiKeys = (raw?: string): Map<string, Omit<ApiApp, 'key'>> => {
  const map = new Map<string, Omit<ApiApp, 'key'>>();

  String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const firstColon = entry.indexOf(':');
      if (firstColon === -1) {
        map.set(entry, { name: 'app', keyPrefix: entry.slice(0, 8), scopes: ['read'] });
        return;
      }

      const name = entry.slice(0, firstColon).trim();
      const rest = entry.slice(firstColon + 1);
      const secondColon = rest.indexOf(':');
      const key = (secondColon === -1 ? rest : rest.slice(0, secondColon)).trim();
      const scopePart = secondColon === -1 ? 'read' : rest.slice(secondColon + 1);
      const scopes = scopePart.split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);

      if (!name || !key) return;
      map.set(key, { name, keyPrefix: key.slice(0, 8), scopes: scopes.length ? scopes : ['read'] });
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

  const app = apiKeys.get(providedKey) as Omit<ApiApp, 'key'>;
  req.apiApp = { ...app, key: providedKey };
  next();
};

// Право на запись (debit/credit): нужен scope "write" у ключа И явное включение DBANK_WRITE_ENABLED=true
export const requireWriteScope = (req: AppAuthRequest, res: Response, next: NextFunction): void => {
  if (process.env.DBANK_WRITE_ENABLED !== 'true') {
    res.status(403).json({
      error: {
        code: 'forbidden_scope',
        message: 'Операции записи в API отключены на сервере (нужна переменная DBANK_WRITE_ENABLED=true)'
      }
    });
    return;
  }

  const scopes = req.apiApp?.scopes || [];
  if (!scopes.includes('write')) {
    res.status(403).json({
      error: { code: 'forbidden_scope', message: 'Этот ключ API имеет доступ только на чтение (нужен scope: write)' }
    });
    return;
  }

  next();
};
