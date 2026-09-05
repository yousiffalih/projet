import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import {
  getAllPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription
} from '../controllers/prescriptionController.js';

const router = express.Router();

// جميع المسارات محمية بـ verifyToken
router.use(verifyToken);

router.get('/',        getAllPrescriptions);
router.get('/:id',     getPrescriptionById);
router.post('/',       createPrescription);
router.put('/:id',     updatePrescription);
router.delete('/:id',  deletePrescription);

export default router;
