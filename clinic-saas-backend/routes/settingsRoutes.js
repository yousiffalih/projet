import { Router } from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import {
  getClinicInfo,
  updateClinicInfo,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getAvailability,
  updateAvailability
} from '../controllers/settingsController.js';

const router = Router();

// جميع مسارات الإعدادات تتطلب تسجيل دخول
router.use(verifyToken);

// معلومات العيادة
router.get('/clinic',    getClinicInfo);
router.put('/clinic',    updateClinicInfo);

// الملف الشخصي للمستخدم
router.get('/profile',   getMyProfile);
router.put('/profile',   updateMyProfile);

// تغيير كلمة المرور
router.put('/password',  changePassword);

// أوقات وتوفر العمل
router.get('/availability', getAvailability);
router.put('/availability', updateAvailability);

export default router;
