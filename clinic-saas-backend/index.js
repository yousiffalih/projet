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
import prescriptionRoutes from './routes/prescriptionRoutes.js';

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
app.use('/api/prescriptions', prescriptionRoutes);

// ─── Public: Clinic / Doctor Finder ─────────────────────────────────────────
// No auth needed — used by the public "Find a Doctor" page
app.get('/api/public/clinics', async (req, res) => {
  try {
    const { city, specialty, lat, lng, search } = req.query;
    let query = `
      SELECT id, name, email, phone, address, city, specialty, description,
             working_hours, website, latitude, longitude,
             subscription_plan, subscription_status,
             created_at
      FROM clinics
      WHERE subscription_status = 'Active'
    `;
    const params = [];

    if (city) {
      params.push(`%${city}%`);
      query += ` AND city ILIKE $${params.length}`;
    }
    if (specialty) {
      params.push(`%${specialty}%`);
      query += ` AND specialty ILIKE $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR specialty ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    // If coordinates provided, order by distance (Haversine approximation)
    if (lat && lng) {
      query += `
        ORDER BY (
          6371 * acos(
            cos(radians(${parseFloat(lat)})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${parseFloat(lng)})) +
            sin(radians(${parseFloat(lat)})) * sin(radians(latitude))
          )
        ) ASC
      `;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[public/clinics Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء البحث عن العيادات' });
  }
});

// ─── Public: Booking Info & Reserved Slots for a Clinic ─────────────────────────
app.get('/api/public/clinics/:id/booking-info', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    // Get availability configuration
    const availResult = await pool.query(
      'SELECT working_days, start_time, end_time, slot_duration, break_start, break_end FROM doctor_availability WHERE clinic_id = $1 LIMIT 1',
      [id]
    );

    const availability = availResult.rows.length > 0 ? availResult.rows[0] : {
      working_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
      start_time: '09:00',
      end_time: '17:00',
      slot_duration: 30,
      break_start: null,
      break_end: null
    };

    // Get active doctors in this clinic
    const doctorsResult = await pool.query(
      "SELECT id, full_name, specialty, role FROM users WHERE clinic_id = $1 AND role = 'DOCTOR' ORDER BY full_name ASC",
      [id]
    );

    // Get booked slots for the date if provided
    let bookedSlots = [];
    if (date) {
      const bookedResult = await pool.query(
        "SELECT appointment_time, doctor_id FROM appointments WHERE clinic_id = $1 AND appointment_date = $2 AND status != 'cancelled'",
        [id, date]
      );
      bookedSlots = bookedResult.rows;
    }

    res.json({
      availability,
      doctors: doctorsResult.rows,
      bookedSlots
    });
  } catch (err) {
    console.error('[public/booking-info Error]:', err.message);
    res.status(500).json({ error: 'تعذر جلب بيانات الحجز' });
  }
});

// ─── Public: Create Patient Online Appointment ────────────────────────────────
app.post('/api/public/appointments', async (req, res) => {
  try {
    const { clinic_id, doctor_id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, notes, type } = req.body;

    if (!clinic_id || !patient_name || !patient_phone || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة (الاسم، الهاتف، التاريخ، الوقت)' });
    }

    const cleanClinicId = parseInt(clinic_id, 10);
    const cleanDoctorId = doctor_id ? parseInt(doctor_id, 10) : null;
    const cleanName = patient_name.trim();
    const cleanPhone = patient_phone.trim();
    const cleanEmail = patient_email?.trim() || null;
    const cleanDate = appointment_date.trim();
    const cleanTime = appointment_time.trim();
    const cleanNotes = notes?.trim() || 'حجز عبر الموقع الإشعاعي أونلاين';
    const cleanType = type?.trim() || 'كشف أونلاين';

    // 1. Check if clinic exists & is active
    const clinicCheck = await pool.query("SELECT id, name FROM clinics WHERE id = $1 AND subscription_status = 'Active'", [cleanClinicId]);
    if (clinicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير متاحة أو غير نَشِطة حالياً' });
    }
    const clinicName = clinicCheck.rows[0].name;

    // 2. Prevent Double Booking / Conflict Check
    const conflictQuery = `
      SELECT id FROM appointments 
      WHERE clinic_id = $1 
        AND appointment_date = $2 
        AND appointment_time = $3 
        AND status != 'cancelled'
        ${cleanDoctorId ? 'AND doctor_id = $4' : ''}
    `;
    const conflictParams = cleanDoctorId 
      ? [cleanClinicId, cleanDate, cleanTime, cleanDoctorId]
      : [cleanClinicId, cleanDate, cleanTime];

    const conflictCheck = await pool.query(conflictQuery, conflictParams);
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'عذراً، هذا الموعد محجوز بالفعل! يرجى اختيار وقت أو تاريخ آخر.' });
    }

    // 3. Find or Create Patient automatically
    let patientId;
    const existingPatient = await pool.query(
      "SELECT id FROM patients WHERE clinic_id = $1 AND phone = $2",
      [cleanClinicId, cleanPhone]
    );

    if (existingPatient.rows.length > 0) {
      patientId = existingPatient.rows[0].id;
    } else {
      const newPatient = await pool.query(
        `INSERT INTO patients (clinic_id, full_name, phone, email, medical_history)
         VALUES ($1, $2, $3, $4, 'تم التسجيل عبر الحجز الأونلاين')
         RETURNING id`,
        [cleanClinicId, cleanName, cleanPhone, cleanEmail]
      );
      patientId = newPatient.rows[0].id;
    }

    // 4. Create Pending Appointment
    const apptResult = await pool.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, appointment_date, appointment_time, type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [cleanClinicId, patientId, cleanDoctorId, cleanDate, cleanTime, cleanType, cleanNotes]
    );

    res.status(201).json({
      message: 'تم حجز الموعد بنجاح! سينتظر تأكيد العيادة.',
      clinic_name: clinicName,
      appointment: apptResult.rows[0]
    });
  } catch (err) {
    console.error('[public/appointments Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء إجراء الحجز، يرجى المحاولة لاحقاً' });
  }
});



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