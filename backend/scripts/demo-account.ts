/**
 * Создание (или сброс) демо-счётчика для витрины API.
 * Демо-пользователь намеренно отдельный от игровых тестов, чтобы клики на витрине
 * не портили эталонные данные других приложений.
 *
 * Запуск:  npm run demo:account                          (баланс 100000, пароль случайный)
 *          npm run demo:account -- --balance=250000
 *          npm run demo:account -- --password=мой-пароль
 */
import { randomUUID, randomInt } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { binPrefixFor, luhnCheckDigit } from '../src/services/bin.service';

const prisma = new PrismaClient();

const DEMO_LOGIN = 'nxt-demo';
const DEMO_PHONE = '+70001112233';
const DEFAULT_BALANCE = 100000; // major-единицы (100 000,00)

const arg = (name: string): string | undefined => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : undefined;
};

const randomPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => alphabet[randomInt(0, alphabet.length)]).join('');
};

// Номер карты с корректной контрольной цифрой Луна, чтобы проходил /cards/validate
const demoCardNumber = () => {
  const prefix = binPrefixFor('n-cards');
  let body = '';
  for (let i = 0; i < 11; i++) body += randomInt(0, 10).toString();
  return prefix + body + luhnCheckDigit(prefix + body);
};

(async () => {
  const balance = Number(arg('balance') ?? DEFAULT_BALANCE);
  const password = arg('password') ?? randomPassword();

  if (!Number.isFinite(balance) || balance <= 0) {
    console.log('Некорректный баланс: используйте --balance=100000');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { login: DEMO_LOGIN }, include: { account: true, cards: true } });

  if (existing) {
    // Сброс: восстанавливаем эталонный баланс и перевыпускаем пароль
    await prisma.account.update({ where: { userId: existing.id }, data: { balance, held: 0, currency: 'RUB', isBlocked: false } });
    const hashed = await import('bcryptjs').then((bcrypt) => bcrypt.default.hash(password, 10));
    await prisma.user.update({ where: { id: existing.id }, data: { password: hashed } });
    await prisma.paymentRequest.deleteMany({ where: { userId: existing.id } });

    console.log('♻️  Демо-счёт сброшен:');
    console.log(JSON.stringify({
      userId: existing.id,
      login: DEMO_LOGIN,
      password,
      phone: DEMO_PHONE,
      currency: 'RUB',
      balance,
      cardLast4: existing.cards[0]?.number.slice(-4) ?? null,
      cardNumber: existing.cards[0]?.number ?? null
    }, null, 2));
  } else {
    const number = demoCardNumber();
    const user = await prisma.user.create({
      data: {
        firstName: 'Demo',
        lastName: 'NXT',
        phone: DEMO_PHONE,
        login: DEMO_LOGIN,
        password: await import('bcryptjs').then((bcrypt) => bcrypt.default.hash(password, 10)),
        account: { create: { balance, currency: 'RUB' } },
        cards: {
          create: {
            number,
            expiryDate: '12/32',
            cvv: String(randomInt(100, 1000)),
            ownerName: 'DEMO NXT',
            cardName: 'Демо-счёт'
          }
        }
      },
      include: { account: true, cards: true }
    });

    console.log('✅ Демо-счёт создан:');
    console.log(JSON.stringify({
      userId: user.id,
      login: DEMO_LOGIN,
      password,
      phone: DEMO_PHONE,
      currency: user.account!.currency,
      balance: user.account!.balance,
      cardLast4: number.slice(-4),
      cardNumber: number
    }, null, 2));
  }

  await prisma.$disconnect();
})();
