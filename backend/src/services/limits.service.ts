import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Часовой пояс банка для расчета границ «дня» и «месяца» (по умолчанию МСК, UTC+3).
// Меняется переменной окружения, например BANK_UTC_OFFSET_MINUTES=0 для UTC.
const TZ_OFFSET_MINUTES = Number(process.env.BANK_UTC_OFFSET_MINUTES ?? 180);

const round2 = (value: number) => Math.round(value * 100) / 100;

// Начало текущего дня или месяца в часовом поясе банка
export const periodStart = (kind: 'day' | 'month', now: Date = new Date()): Date => {
  const local = new Date(now.getTime() + TZ_OFFSET_MINUTES * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const startLocal = kind === 'day' ? Date.UTC(year, month, day) : Date.UTC(year, month, 1);
  return new Date(startLocal - TZ_OFFSET_MINUTES * 60 * 1000);
};

// Статусы, которые уже тратят деньги: исполненные и зарезервированные (pending/processing)
const COUNTED_STATUSES = ['pending', 'processing', 'completed'];

type Db = Prisma.TransactionClient | PrismaClient;

// Сколько пользователь перевел сегодня и за текущий месяц.
// Возвраты средств (type = 'refund') не учитываем: это не новая трата, а движение своих денег.
export const getSpentAmounts = async (userId: string, db: Db = prisma) => {
  const [day, month] = await Promise.all([
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { senderId: userId, type: 'transfer', status: { in: COUNTED_STATUSES }, createdAt: { gte: periodStart('day') } }
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { senderId: userId, type: 'transfer', status: { in: COUNTED_STATUSES }, createdAt: { gte: periodStart('month') } }
    })
  ]);
  return { day: round2(day._sum.amount || 0), month: round2(month._sum.amount || 0) };
};

// Текущие лимиты пользователя вместе с расходом за день/месяц (для настроек)
export const getLimits = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user) return null;

  const spent = await getSpentAmounts(userId);
  const currency = user.account?.currency || 'RUB';
  const remaining = (limit: number | null | undefined, used: number) =>
    limit == null ? null : Math.max(0, round2(limit - used));

  return {
    currency,
    dailyLimit: user.dailyLimit,
    monthlyLimit: user.monthlyLimit,
    spentToday: spent.day,
    spentMonth: spent.month,
    remainingToday: remaining(user.dailyLimit, spent.day),
    remainingMonth: remaining(user.monthlyLimit, spent.month)
  };
};

// Проверка лимита перед переводом: возвращает понятный текст ошибки или null, если переводить можно.
// Вызывается внутри транзакции перевода, поэтому два одновременных перевода лимит не обойдут.
export const checkTransferLimit = async (db: Db, userId: string, amount: number): Promise<string | null> => {
  const user = await db.user.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user) return 'Пользователь не найден';

  const currency = user.account?.currency || 'RUB';
  const money = (value: number) => `${value} ${currency}`;
  const spent = await getSpentAmounts(userId, db);

  if (user.dailyLimit != null && spent.day + amount > user.dailyLimit) {
    return `Превышен дневной лимит. Сегодня переведено ${money(spent.day)} из ${money(user.dailyLimit)}. Осталось ${money(Math.max(0, user.dailyLimit - spent.day))}.`;
  }

  if (user.monthlyLimit != null && spent.month + amount > user.monthlyLimit) {
    return `Превышен месячный лимит. За месяц переведено ${money(spent.month)} из ${money(user.monthlyLimit)}. Осталось ${money(Math.max(0, user.monthlyLimit - spent.month))}.`;
  }

  return null;
};
