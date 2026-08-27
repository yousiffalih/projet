import { Router } from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import { getDashboardStats, getReportsAnalytics } from '../controllers/dashboardController.js';

const router = Router();

// مسار محمي: لا يمكن الدخول إليه إلا بتوكن صحيح
router.get('/stats', verifyToken, getDashboardStats);
router.get('/reports', verifyToken, getReportsAnalytics);

export default router;
