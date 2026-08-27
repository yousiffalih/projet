import { Router } from 'express';
import { registerUser, registerClinic, loginUser, getDoctors, createDoctor, deleteDoctor } from '../controllers/userController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = Router();

// تسجيل عيادة جديدة مع مديرها
router.post('/register-clinic', registerClinic);

// تسجيل مستخدم جديد
router.post('/register', registerUser);

// تسجيل الدخول
router.post('/login', loginUser);

// مسارات الأطباء (تتطلب تسجيل دخول)
router.get('/doctors', verifyToken, getDoctors);
router.post('/doctors', verifyToken, createDoctor);
router.delete('/doctors/:id', verifyToken, deleteDoctor);

export default router;
