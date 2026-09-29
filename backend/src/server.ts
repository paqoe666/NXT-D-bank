import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes'; // <-- Подключили наши роуты
import bankRoutes from './routes/bankRoutes';
import v1Routes from './routes/v1'; // Внешний API v1 для сторонних проектов (например, игры друга)

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Проверочный роут
app.get('/api/status', (req, res) => {
  res.json({ message: 'NXT D-Bank API работает! 🚀' });
});

// Роуты авторизации (теперь регистрация доступна по адресу /api/auth/register)
app.use('/api/auth', authRoutes);

// Роуты банка (теперь дашборд доступен по адресу /api/bank/dashboard)
app.use('/api/bank', bankRoutes);

// Публичный API v1 для сторонних приложений:
// справочник BIN-ов и чтение данных игрока (по ключу X-API-Key)
app.use('/api/v1', v1Routes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Сервер банка запущен на порту ${PORT}`);
});