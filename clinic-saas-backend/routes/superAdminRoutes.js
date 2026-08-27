import express from 'express';
import superAdminMiddleware from '../middlewares/superAdminMiddleware.js';
import {
  createSuperAdmin,
  superAdminLogin,
  getPlatformStats,
  getAllClinicsWithStats,
  updateClinicPlan,
  toggleClinicStatus,
  deleteClinic,
  impersonateClinic,
  createClinicByAdmin,
  updateClinicFull,
  getClinicDetails
} from '../controllers/superAdminController.js';

const router = express.Router();

// ─── Auth (بدون middleware) ──────────────────────────────────────────────────
router.post('/login', superAdminLogin);
router.post('/create-admin', createSuperAdmin); // محمي بـ secret_key في الـ body

// ─── محمية بـ superAdminMiddleware ──────────────────────────────────────────
router.get('/stats',                  superAdminMiddleware, getPlatformStats);
router.get('/clinics',                superAdminMiddleware, getAllClinicsWithStats);
router.post('/clinics',               superAdminMiddleware, createClinicByAdmin);
router.get('/clinics/:id/details',    superAdminMiddleware, getClinicDetails);
router.put('/clinics/:id',            superAdminMiddleware, updateClinicFull);
router.patch('/clinics/:id/plan',     superAdminMiddleware, updateClinicPlan);
router.patch('/clinics/:id/status',   superAdminMiddleware, toggleClinicStatus);
router.post('/clinics/:id/impersonate', superAdminMiddleware, impersonateClinic);
router.delete('/clinics/:id',         superAdminMiddleware, deleteClinic);

export default router;
