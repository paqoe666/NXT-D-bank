import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', register);
router.post('/login', authLimiter, login); // Защита от подбора пароля (макс 10 раз за 5 минут)

export default router;