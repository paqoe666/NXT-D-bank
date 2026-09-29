import { Router } from 'express';
import { 
  getDashboard, 
  updateCardDesign, 
  markNotificationsRead, 
  updateCurrency, 
  updatePassword, 
  resolveRecipient,
  updateCardName,
  getTransferLimits,
  updateTransferLimits
} from '../controllers/bank';
import { transferMoney, getHistory, clearHistory, cancelTransfer, refundTransfer } from '../controllers/transaction';
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
router.post('/transfer/:id/cancel', cancelTransfer);
router.post('/transfer/:id/refund', refundTransfer);
router.get('/history', getHistory);
router.delete('/history', clearHistory);
router.post('/deposit', ceoDeposit);
router.post('/card/design', updateCardDesign);
router.post('/notifications/read', markNotificationsRead);
router.post('/currency', updateCurrency);
router.post('/password', updatePassword);
router.post('/card/name', updateCardName);
router.get('/limits', getTransferLimits);
router.post('/limits', updateTransferLimits);

export default router;