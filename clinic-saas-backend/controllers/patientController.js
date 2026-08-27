import pool from '../db/index.js';

// جلب جميع مرضى العيادة
export const getPatients = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const result = await pool.query(
      'SELECT * FROM patients WHERE clinic_id = $1 ORDER BY created_at DESC',
      [clinic_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المرضى' });
  }
};

const nullIfEmpty = (val) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);

// إضافة مريض جديد
export const createPatient = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { full_name, email, phone, date_of_birth, gender, address, medical_history } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'اسم المريض مطلوب' });
    }

    const cleanEmail   = nullIfEmpty(email);
    const cleanPhone   = nullIfEmpty(phone);
    let cleanDob       = nullIfEmpty(date_of_birth);
    const cleanGender  = nullIfEmpty(gender);
    const cleanAddress = nullIfEmpty(address);
    const cleanHistory = nullIfEmpty(medical_history);

    // تحويل صيغة التاريخ إذا لزم الأمر
    if (cleanDob && cleanDob.includes('/')) {
      const parts = cleanDob.split('/');
      if (parts.length === 3) {
        cleanDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const result = await pool.query(
      `INSERT INTO patients (clinic_id, full_name, email, phone, date_of_birth, gender, address, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [clinic_id, full_name.trim(), cleanEmail, cleanPhone, cleanDob, cleanGender, cleanAddress, cleanHistory]
    );

    res.status(201).json({ message: 'تم إضافة المريض بنجاح', patient: result.rows[0] });
  } catch (err) {
    console.error('[createPatient Error]:', err.message);
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء إضافة المريض' });
  }
};

// جلب مريض واحد
export const getPatientById = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM patients WHERE id = $1 AND clinic_id = $2',
      [id, clinic_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المريض غير موجود' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// تعديل بيانات مريض
export const updatePatient = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    const { full_name, email, phone, date_of_birth, gender, address, medical_history } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'اسم المريض مطلوب' });
    }

    const cleanEmail   = nullIfEmpty(email);
    const cleanPhone   = nullIfEmpty(phone);
    let cleanDob       = nullIfEmpty(date_of_birth);
    const cleanGender  = nullIfEmpty(gender);
    const cleanAddress = nullIfEmpty(address);
    const cleanHistory = nullIfEmpty(medical_history);

    if (cleanDob && cleanDob.includes('/')) {
      const parts = cleanDob.split('/');
      if (parts.length === 3) {
        cleanDob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const result = await pool.query(
      `UPDATE patients
       SET full_name = $1,
           email = $2,
           phone = $3,
           date_of_birth = $4,
           gender = $5,
           address = $6,
           medical_history = $7
       WHERE id = $8 AND clinic_id = $9
       RETURNING *`,
      [full_name.trim(), cleanEmail, cleanPhone, cleanDob, cleanGender, cleanAddress, cleanHistory, id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المريض غير موجود' });
    }

    res.status(200).json({ message: 'تم تحديث بيانات المريض بنجاح', patient: result.rows[0] });
  } catch (err) {
    console.error('[updatePatient Error]:', err.message);
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء تعديل بيانات المريض' });
  }
};

// حذف مريض
export const deletePatient = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM patients WHERE id = $1 AND clinic_id = $2', [id, clinic_id]);
    res.status(200).json({ message: 'تم حذف المريض بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء الحذف' });
  }
};
