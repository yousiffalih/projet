import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getTodayAppointments
} from '../controllers/appointmentController.js';

const router = express.Router();

// جميع مسارات المواعيد تتطلب تسجيل الدخول وتوفر التوكن
router.get('/', verifyToken, getAppointments);
router.get('/today', verifyToken, getTodayAppointments);
router.post('/', verifyToken, createAppointment);
router.put('/:id', verifyToken, updateAppointment);
router.patch('/:id/status', verifyToken, updateAppointmentStatus);
router.delete('/:id', verifyToken, deleteAppointment);

export default router;
