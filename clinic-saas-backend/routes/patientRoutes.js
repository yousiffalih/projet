import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import { getPatients, createPatient, getPatientById, updatePatient, deletePatient } from '../controllers/patientController.js';

const router = express.Router();

// جميع مسارات المرضى محمية بالتوكن
router.get('/', verifyToken, getPatients);
router.post('/', verifyToken, createPatient);
router.get('/:id', verifyToken, getPatientById);
router.put('/:id', verifyToken, updatePatient);
router.delete('/:id', verifyToken, deletePatient);

export default router;
