import pool from '../db/index.js';

// ─── جلب كل الوصفات الطبية الخاصة بالعيادة ────────────────────────────────
export const getAllPrescriptions = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { search, patient_id } = req.query;

    let query = `
      SELECT 
        p.id,
        p.clinic_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medicines,
        p.notes,
        p.created_at,
        pt.full_name AS patient_name,
        pt.phone     AS patient_phone,
        pt.gender    AS patient_gender,
        u.full_name  AS doctor_name,
        u.specialty  AS doctor_specialty,
        c.name       AS clinic_name,
        c.phone      AS clinic_phone,
        c.address    AS clinic_address
      FROM prescriptions p
      JOIN patients pt ON pt.id = p.patient_id
      LEFT JOIN users u ON u.id = p.doctor_id
      JOIN clinics c ON c.id = p.clinic_id
      WHERE p.clinic_id = $1
    `;

    const params = [clinic_id];

    if (patient_id) {
      params.push(patient_id);
      query += ` AND p.patient_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (pt.full_name ILIKE $${params.length} OR p.diagnosis ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[getAllPrescriptions Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الوصفات الطبية' });
  }
};

// ─── جلب وصفة محددة بالتفصيل (للطباعة أو العرض) ──────────────────────────
export const getPrescriptionById = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.id,
        p.clinic_id,
        p.patient_id,
        p.doctor_id,
        p.diagnosis,
        p.medicines,
        p.notes,
        p.created_at,
        pt.full_name AS patient_name,
        pt.phone     AS patient_phone,
        pt.gender    AS patient_gender,
        pt.date_of_birth AS patient_dob,
        u.full_name  AS doctor_name,
        u.specialty  AS doctor_specialty,
        c.name       AS clinic_name,
        c.phone      AS clinic_phone,
        c.address    AS clinic_address,
        c.email      AS clinic_email
      FROM prescriptions p
      JOIN patients pt ON pt.id = p.patient_id
      LEFT JOIN users u ON u.id = p.doctor_id
      JOIN clinics c ON c.id = p.clinic_id
      WHERE p.id = $1 AND p.clinic_id = $2`,
      [id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الوصفة الطبية غير موجودة' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[getPrescriptionById Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الوصفة الطبية' });
  }
};

// ─── إنشاء وصفة طبية جديدة ───────────────────────────────────────────────
export const createPrescription = async (req, res) => {
  try {
    const { clinic_id, id: userId } = req.user;
    const { patient_id, doctor_id, diagnosis, medicines, notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'يرجى تحديد المريض' });
    }

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ error: 'التشخيص الطبي مطلوب' });
    }

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة دواء واحد على الأقل في الوصفة' });
    }

    // الطبيب المسؤول (إذا لم يُحدد نأخذ المستخدم الحالي إن كان طبيباً أو مديراً)
    const effectiveDoctorId = doctor_id || userId;

    const result = await pool.query(
      `INSERT INTO prescriptions (clinic_id, patient_id, doctor_id, diagnosis, medicines, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        clinic_id,
        patient_id,
        effectiveDoctorId,
        diagnosis.trim(),
        JSON.stringify(medicines),
        notes?.trim() || null
      ]
    );

    res.status(201).json({
      message: 'تم إصدار الوصفة الطبية وحفظها بنجاح',
      prescription: result.rows[0]
    });
  } catch (err) {
    console.error('[createPrescription Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ الوصفة الطبية: ' + err.message });
  }
};

// ─── تعديل وصفة طبية ────────────────────────────────────────────────────
export const updatePrescription = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;
    const { doctor_id, diagnosis, medicines, notes } = req.body;

    if (!diagnosis || !diagnosis.trim()) {
      return res.status(400).json({ error: 'التشخيص الطبي مطلوب' });
    }

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ error: 'يرجى إضافة دواء واحد على الأقل' });
    }

    const result = await pool.query(
      `UPDATE prescriptions
       SET doctor_id = COALESCE($1, doctor_id),
           diagnosis = $2,
           medicines = $3,
           notes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND clinic_id = $6
       RETURNING *`,
      [
        doctor_id || null,
        diagnosis.trim(),
        JSON.stringify(medicines),
        notes?.trim() || null,
        id,
        clinic_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الوصفة الطبية غير موجودة' });
    }

    res.status(200).json({
      message: 'تم تحديث الوصفة الطبية بنجاح',
      prescription: result.rows[0]
    });
  } catch (err) {
    console.error('[updatePrescription Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تعديل الوصفة الطبية' });
  }
};

// ─── حذف وصفة طبية ──────────────────────────────────────────────────────
export const deletePrescription = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM prescriptions WHERE id = $1 AND clinic_id = $2 RETURNING id',
      [id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الوصفة الطبية غير موجودة' });
    }

    res.status(200).json({ message: 'تم حذف الوصفة الطبية بنجاح' });
  } catch (err) {
    console.error('[deletePrescription Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الوصفة الطبية' });
  }
};
