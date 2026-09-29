import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Телефон в БД может быть записан в свободном формате («+7 999 000-00-00»).
// Готовим все вероятные варианты, чтобы поиск сработал в любом случае.
export const phoneCandidates = (raw: string): string[] => {
  const withoutSpaces = raw.replace(/[\s\-()]/g, '');
  const digits = withoutSpaces.replace(/\D/g, '');
  return Array.from(new Set([withoutSpaces, digits, digits ? `+${digits}` : ''].filter(Boolean)));
};

export const onlyDigits = (raw: string): string => String(raw || '').replace(/\D/g, '');

// Поиск пользователя по любому идентификатору: id, телефон или номер карты.
// Используется и внутри банка (CEO-пополнение), и во внешнем API v1.
export const findUserByAnyTarget = async (rawTarget: string) => {
  const target = String(rawTarget || '').trim();
  if (!target) return null;

  const candidates = phoneCandidates(target);
  const digits = onlyDigits(target);

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: target },
        { phone: { in: candidates } },
        { cards: { some: { number: digits || target } } }
      ]
    },
    include: { account: true }
  });

  // Запасной путь: телефон записан в свободном формате, поэтому сравниваем только цифры
  if (!user && digits.length >= 6) {
    const allUsers = await prisma.user.findMany({ select: { id: true, phone: true } });
    const match = allUsers.find((u) => u.phone.replace(/\D/g, '') === digits);
    if (match) {
      user = await prisma.user.findUnique({ where: { id: match.id }, include: { account: true } });
    }
  }

  return user;
};
