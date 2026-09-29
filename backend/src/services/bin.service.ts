// Единый реестр BIN-ов NXT D-Bank.
// BIN (первые цифры карты) — публичная информация, поэтому её безопасно отдавать
// наружу через публичный API (/api/v1/bins). Номер карты и CVV наружу не отдаются никогда.
export interface BinInfo {
  bin: string;          // префикс, который клеится к случайным цифрам при выпуске карты
  brand: string;        // человекочитаемый бренд
  brandId: string;      // id бренда для фронтенда
  type: 'debit';
  country: string;      // ISO-код страны
  countryName: string;
  issuer: string;       // банк-эмитент
  currency: string;     // валюта по умолчанию
  logo: string;         // путь к логотипу в frontend/public
  cardSystem: string;   // ключ, который приходит с фронтенда при регистрации
}

export const BIN_REGISTRY: BinInfo[] = [
  { bin: '7777', brand: 'N-Cards', brandId: 'n-cards', type: 'debit', country: 'RU', countryName: 'Россия', issuer: 'NXT D-Bank', currency: 'RUB', logo: '/ncards.svg', cardSystem: 'n-cards' },
  { bin: '4029', brand: 'VISA', brandId: 'visa', type: 'debit', country: 'US', countryName: 'США', issuer: 'NXT D-Bank', currency: 'USD', logo: '/visa.svg', cardSystem: 'visa' },
  { bin: '5067', brand: 'MasterCard', brandId: 'mastercard', type: 'debit', country: 'US', countryName: 'США', issuer: 'NXT D-Bank', currency: 'USD', logo: '/mastercard.svg', cardSystem: 'mastercard' },
  { bin: '2202', brand: 'МИР', brandId: 'mir', type: 'debit', country: 'RU', countryName: 'Россия', issuer: 'NXT D-Bank', currency: 'RUB', logo: '/mir.svg', cardSystem: 'mir' },
];

export const DEFAULT_BIN = '7777';

export const normalizeCardNumber = (value: string): string => String(value || '').replace(/\D/g, '');

export const findBin = (bin: string): BinInfo | undefined =>
  BIN_REGISTRY.find((item) => item.bin === String(bin || '').replace(/\D/g, ''));

// Префикс для выпуска новой карты по выбранной платежной системе
export const binPrefixFor = (cardSystem: string): string => {
  const found = BIN_REGISTRY.find((item) => item.cardSystem === cardSystem);
  return found ? found.bin : DEFAULT_BIN;
};

// Определяем бренд по номеру карты (самый длинный совпавший префикс)
export const detectBin = (cardNumber: string): BinInfo | undefined => {
  const digits = normalizeCardNumber(cardNumber);
  return BIN_REGISTRY
    .filter((item) => digits.startsWith(item.bin))
    .sort((a, b) => b.bin.length - a.bin.length)[0];
};

// Проверка контрольной суммы номера карты (алгоритм Луна)
export const luhnCheck = (cardNumber: string): boolean => {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
};

// Маскируем номер: наружу отдаём только последние 4 цифры
export const maskCardNumber = (cardNumber: string): string => {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 4) return '****';
  return `**** **** **** ${digits.slice(-4)}`;
};

// Маскируем телефон: оставляем только последние 4 цифры
export const maskPhone = (phone: string): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  const prefix = String(phone || '').trim().startsWith('+') ? `+${digits.slice(0, 1)}` : '';
  return `${prefix}***${digits.slice(-4)}`;
};

// Считаем контрольную цифру Луна для префикса номера карты (15 цифр без контрольной)
export const luhnCheckDigit = (payload: string): string => {
  const digits = normalizeCardNumber(payload);
  let sum = 0;
  let double = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return String((10 - (sum % 10)) % 10);
};
