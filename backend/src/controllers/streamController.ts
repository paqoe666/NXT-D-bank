import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';

const clients = new Map<string, Response>();

export const connectStream = (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Универсальное получение ID (зависит от того, как он записан в твоем токене)
  const userId = req.user?.userId || req.user?.id;
  
  if (!userId) {
    res.status(400).end();
    return;
  }

  clients.set(userId, res);
  console.log(`🟢 Пользователь ${userId} подключился к Push-стриму`);

  req.on('close', () => {
    clients.delete(userId);
    console.log(`🔴 Пользователь ${userId} отключился от стрима`);
  });
};

export const notifyUser = (userId: string, data: any) => {
  const res = clients.get(userId);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};