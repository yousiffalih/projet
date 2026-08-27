import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import verifyToken from './middlewares/authMiddleware.js';
dotenv.config();

// تشغيل الاتصال بقاعدة البيانات عند بدء الخادم
import pool from './db/index.js';

// استيراد المسارات
import clinicRoutes from './routes/clinicRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';

const app = express();
const port = Number(process.env.PORT) || 5001;

// --------- Middleware ---------
app.use(cors());
app.use(express.json());

// --------- API Routes ---------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Clinic SaaS API is running perfectly.' });
});

app.use('/api/clinics', clinicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/superadmin', superAdminRoutes);

// جلب أطباء العيادة (للاستخدام في قائمة الاختيار عند جدولة المواعيد)
app.get('/api/doctors', verifyToken, async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const result = await pool.query(
      "SELECT id, full_name, role, specialty FROM users WHERE clinic_id = $1 AND role = 'DOCTOR' ORDER BY full_name ASC",
      [clinic_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأطباء' });
  }
});

// تهيئة جدول المرضى (استخدم مرة واحدة فقط)
app.get('/api/setup-patients', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        clinic_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        date_of_birth DATE,
        gender VARCHAR(20),
        address TEXT,
        medical_history TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
      );
    `);
    // تهيئة جدول المواعيد
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        clinic_id INT NOT NULL,
        patient_id INT NOT NULL,
        doctor_id INT,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        type VARCHAR(100) DEFAULT 'فحص عام',
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    res.status(200).json({ message: 'تم إنشاء جداول المرضى والمواعيد بنجاح!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------- Start Server ---------
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});