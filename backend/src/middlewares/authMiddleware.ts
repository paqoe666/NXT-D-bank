import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Если токена нет в заголовке, ищем в URL (нужно для нашего SSE стрима)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    console.log('🔴 AuthMiddleware: Отклонено (Нет токена)');
    res.status(401).json({ message: 'Нет токена доступа' });
    return;
  }

  // ВАЖНО: Если у тебя в authController.ts используется другой секрет (не 'secret'), 
  // обязательно поменяй слово 'secret' ниже на своё!
const secret = process.env.JWT_SECRET || 'nxt_super_secret';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.log('🔴 AuthMiddleware: Ошибка проверки токена ->', err.message);
      res.status(403).json({ message: 'Недействительный токен' });
      return;
    }
    
    req.user = decoded;
    next();
  });
};  