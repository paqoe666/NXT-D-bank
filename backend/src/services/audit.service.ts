import { Request } from 'express';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AppAuthRequest } from '../middlewares/apiAppAuth';

const prisma = new PrismaClient();

export interface AuditInput {
  req: Request;
  operation: string;
  userId?: string | null;
  txId?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  direction?: string | null;
  statusCode: number;
  result: string;
  startedAt: number;
}

// Аудит каждой денежной операции (успех и ошибка).
// Сам секретный ключ не пишем: только его префикс (8 символов) и sha256.
export const writeAudit = async (input: AuditInput): Promise<void> => {
  const { req } = input;
  const apiApp = (req as AppAuthRequest).apiApp;
  const keyPrefix = apiApp?.keyPrefix ?? null;
  const keyHash = apiApp ? createHash('sha256').update(apiApp.key).digest('hex') : null;
  const durationMs = Date.now() - input.startedAt;
  const ip = req.ip || (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || null;
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 256) || null;

  try {
    await prisma.apiAuditLog.create({
      data: {
        appName: apiApp?.name ?? null,
        keyPrefix,
        keyHash,
        operation: input.operation,
        userId: input.userId ?? null,
        txId: input.txId ?? null,
        amountMinor: input.amountMinor ?? null,
        currency: input.currency ?? null,
        // направление выводится из типа операции, если не передано явно
        direction: input.direction ?? (input.operation === 'debit' ? 'out' : input.operation === 'credit' ? 'in' : null),
        ip,
        userAgent,
        statusCode: input.statusCode,
        result: input.result,
        durationMs
      }
    });
  } catch (error) {
    // Аудит не должен ломать саму операцию
    console.error('⚠️ не удалось записать аудит:', error);
  }

  console.log(
    `[api-v1] ${input.operation} app=${apiApp?.name ?? '-'} key=${keyPrefix ?? '-'} user=${input.userId ?? '-'} tx=${input.txId ?? '-'} amount=${input.amountMinor ?? '-'} ${input.currency ?? '-'} ${input.direction ?? '-'} -> ${input.statusCode} ${input.result} (${durationMs}ms) ip=${ip}`
  );
};
