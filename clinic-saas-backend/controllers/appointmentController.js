import pool from '../db/index.js';

// ─── إضافة index تلقائياً عند أول تحميل ───────────────
pool.query(`
  CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON appointments(clinic_id, appointment_date)
`).catch(() => {});

// جلب جميع مواعيد العيادة مع بيانات المرضى والأطباء
export const getAppointments = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    
    const result = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone, u.full_name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.clinic_id = $1
       ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
      [clinic_id]
    );
    
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المواعيد' });
  }
};

const nullIfEmpty = (val) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);

// إضافة موعد جديد
export const createAppointment = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { patient_id, doctor_id, appointment_date, appointment_time, type, notes } = req.body;

    if (!patient_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'المريض، تاريخ ووقت الموعد حقول مطلوبة' });
    }

    const cleanPatientId = parseInt(patient_id, 10);
    const cleanDoctorId  = doctor_id ? parseInt(doctor_id, 10) : null;
    let cleanDate        = nullIfEmpty(appointment_date);
    const cleanTime      = nullIfEmpty(appointment_time);
    const cleanType      = nullIfEmpty(type) || 'فحص عام';
    const cleanNotes     = nullIfEmpty(notes);

    if (isNaN(cleanPatientId)) {
      return res.status(400).json({ error: 'المريض غير صالح' });
    }

    if (cleanDate && cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const result = await pool.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, appointment_date, appointment_time, type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [clinic_id, cleanPatientId, (cleanDoctorId && !isNaN(cleanDoctorId)) ? cleanDoctorId : null, cleanDate, cleanTime, cleanType, 'pending', cleanNotes]
    );

    // جلب الأسماء لإعادتها للـ frontend فوراً
    const joinedResult = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone, u.full_name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ message: 'تم جدولة الموعد بنجاح', appointment: joinedResult.rows[0] || result.rows[0] });
  } catch (err) {
    console.error('[createAppointment Error]:', err.message);
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء جدولة الموعد' });
  }
};

// تحديث تفاصيل الموعد بالكامل (إعادة الجدولة / تعديل الطبيب / الملاحظات)
export const updateAppointment = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    const { patient_id, doctor_id, appointment_date, appointment_time, type, status, notes } = req.body;

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'تاريخ ووقت الموعد مطلوبان' });
    }

    const cleanDoctorId = doctor_id ? parseInt(doctor_id, 10) : null;
    let cleanDate       = nullIfEmpty(appointment_date);
    const cleanTime     = nullIfEmpty(appointment_time);
    const cleanType     = nullIfEmpty(type) || 'فحص عام';
    const cleanNotes    = nullIfEmpty(notes);

    if (cleanDate && cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const result = await pool.query(
      `UPDATE appointments
       SET doctor_id = $1,
           appointment_date = $2,
           appointment_time = $3,
           type = $4,
           notes = $5,
           status = COALESCE($6, status)
       WHERE id = $7 AND clinic_id = $8
       RETURNING *`,
      [(cleanDoctorId && !isNaN(cleanDoctorId)) ? cleanDoctorId : null, cleanDate, cleanTime, cleanType, cleanNotes, status || null, id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموعد غير موجود' });
    }

    // جلب الأسماء المحدثة
    const joinedResult = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone, u.full_name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    res.status(200).json({ message: 'تم تعديل الموعد بنجاح', appointment: joinedResult.rows[0] || result.rows[0] });
  } catch (err) {
    console.error('[updateAppointment Error]:', err.message);
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء تعديل الموعد' });
  }
};

// تحديث حالة الموعد (مؤكد، معلق، ملغي)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'حالة الموعد غير صالحة' });
    }

    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 AND clinic_id = $3 RETURNING *',
      [status, id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموعد غير موجود' });
    }

    res.status(200).json({ message: 'تم تحديث حالة الموعد بنجاح', appointment: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة الموعد' });
  }
};

// حذف موعد
export const deleteAppointment = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND clinic_id = $2 RETURNING *',
      [id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الموعد غير موجود' });
    }

    res.status(200).json({ message: 'تم إلغاء وحذف الموعد بنجاح' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الموعد' });
  }
};
// جلب مواعيد اليوم فقط
export const getTodayAppointments = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await pool.query(
      `SELECT a.*, p.full_name AS patient_name, p.phone AS patient_phone, u.full_name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.clinic_id = $1 AND a.appointment_date = $2
       ORDER BY a.appointment_time ASC`,
      [clinic_id, today]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب مواعيد اليوم' });
  }
};
