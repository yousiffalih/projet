import express from 'express';
import { createClinic, getClinics } from '../controllers/clinicController.js';

const router = express.Router();

// توجيه الروابط إلى الوظائف المناسبة
router.post('/', createClinic);
router.get('/', getClinics);

export default router;
