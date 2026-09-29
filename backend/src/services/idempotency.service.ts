import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const IDEMPOTENCY_TTL_HOURS = 24;

// Канонизируем тело: повтор должен присылать то же самое содержимое,
// необязательные поля «пустое» и «не передан» считаем одинаковыми.
export const hashBody = (parts: {
  operation: string;
  userId: string;
  amountMinor: number;
  currency: string;
  comment?: string;
  reference?: string;
  dryRun?: boolean;
}): string => {
  const canonical = JSON.stringify({
    operation: parts.operation,
    userId: parts.userId,
    amountMinor: parts.amountMinor,
    currency: parts.currency,
    comment: parts.comment ?? '',
    reference: parts.reference ?? '',
    dryRun: parts.dryRun === true
  });
  return createHash('sha256').update(canonical).digest('hex');
};

export const hashKey = (key: string): string => createHash('sha256').update(key).digest('hex');

// Живая запись по (приложение, ключ). Истёкшие считаем отсутствующими.
export const findIdempotent = async (appName: string, key: string) => {
  const record = await prisma.idempotencyRecord.findUnique({ where: { appName_key: { appName, key } } });
  if (!record) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return record;
};

// Чистим истёкшие записи, чтобы таблица не росла бесконечно
export const pruneExpired = async (): Promise<number> => {
  const result = await prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
};
