import { Router } from 'express';
import { 
  getDashboard, 
  updateCardDesign, 
  markNotificationsRead, 
  updateCurrency, 
  updatePassword, 
  resolveRecipient,
  updateCardName // <--- добавили этот метод
} from '../controllers/bank';
import { transferMoney, getHistory, clearHistory } from '../controllers/transaction';
import { ceoDeposit } from '../controllers/ceoController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { connectStream } from '../controllers/streamController';
import { transferLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(authenticateToken);

router.get('/stream', connectStream);
router.get('/dashboard', getDashboard);
router.get('/resolve-recipient', resolveRecipient);
router.post('/transfer', transferLimiter, transferMoney);
router.get('/history', getHistory);
router.delete('/history', clearHistory);
router.post('/deposit', ceoDeposit);
router.post('/card/design', updateCardDesign);
router.post('/notifications/read', markNotificationsRead);
router.post('/currency', updateCurrency);
router.post('/password', updatePassword);
router.post('/card/name', updateCardName); // <--- и новый маршрут

export default router;