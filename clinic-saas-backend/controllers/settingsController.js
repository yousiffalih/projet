import bcrypt from 'bcrypt';
import pool from '../db/index.js';

// ─── جلب معلومات العيادة الحالية ────────────────────────────────────────────
export const getClinicInfo = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const result = await pool.query(
      'SELECT id, name, address, phone, email, subscription_plan, subscription_status, created_at FROM clinics WHERE id = $1',
      [clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[getClinicInfo Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب معلومات العيادة' });
  }
};

// ─── تحديث معلومات العيادة ───────────────────────────────────────────────────
export const updateClinicInfo = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { name, address, phone, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم العيادة مطلوب' });
    }

    const result = await pool.query(
      `UPDATE clinics
       SET name    = $1,
           address = $2,
           phone   = $3,
           email   = $4
       WHERE id = $5
       RETURNING id, name, address, phone, email, subscription_plan, subscription_status, created_at`,
      [name.trim(), address?.trim() || null, phone?.trim() || null, email?.trim() || null, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    res.status(200).json({ message: 'تم تحديث معلومات العيادة بنجاح', clinic: result.rows[0] });
  } catch (err) {
    console.error('[updateClinicInfo Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث معلومات العيادة' });
  }
};

// ─── جلب معلومات المستخدم الحالي ────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const result = await pool.query(
      'SELECT id, full_name, email, phone, role, specialty, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[getMyProfile Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الملف الشخصي' });
  }
};

// ─── تحديث الملف الشخصي للمستخدم ────────────────────────────────────────────
export const updateMyProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { full_name, phone } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'الاسم الكامل مطلوب' });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           phone     = $2
       WHERE id = $3
       RETURNING id, full_name, email, phone, role, specialty`,
      [full_name.trim(), phone?.trim() || null, id]
    );

    res.status(200).json({ message: 'تم تحديث الملف الشخصي بنجاح', user: result.rows[0] });
  } catch (err) {
    console.error('[updateMyProfile Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
  }
};

// ─── تغيير كلمة المرور ───────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    // جلب كلمة المرور المشفرة الحالية
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(10);
    const new_hash = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, id]);

    res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('[changePassword Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
};

// ─── جلب جدول أوقات وتوفر العيادة ──────────────────────────────────────────
export const getAvailability = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const result = await pool.query(
      'SELECT working_days, start_time, end_time, slot_duration, break_start, break_end FROM doctor_availability WHERE clinic_id = $1 LIMIT 1',
      [clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        working_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        start_time: '09:00',
        end_time: '17:00',
        slot_duration: 30,
        break_start: null,
        break_end: null
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('[getAvailability Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب أوقات العمل' });
  }
};

// ─── تحديث جدول أوقات وتوفر العيادة ────────────────────────────────────────
export const updateAvailability = async (req, res) => {
  try {
    const { clinic_id, id: user_id } = req.user;
    const { working_days, start_time, end_time, slot_duration, break_start, break_end } = req.body;

    const daysJson = JSON.stringify(working_days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']);
    const cleanStart = start_time || '09:00';
    const cleanEnd = end_time || '17:00';
    const cleanDuration = parseInt(slot_duration, 10) || 30;

    const check = await pool.query('SELECT id FROM doctor_availability WHERE clinic_id = $1 LIMIT 1', [clinic_id]);

    let result;
    if (check.rows.length > 0) {
      result = await pool.query(
        `UPDATE doctor_availability
         SET working_days = $1, start_time = $2, end_time = $3, slot_duration = $4, break_start = $5, break_end = $6, updated_at = CURRENT_TIMESTAMP
         WHERE clinic_id = $7
         RETURNING working_days, start_time, end_time, slot_duration, break_start, break_end`,
        [daysJson, cleanStart, cleanEnd, cleanDuration, break_start || null, break_end || null, clinic_id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO doctor_availability (clinic_id, doctor_id, working_days, start_time, end_time, slot_duration, break_start, break_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING working_days, start_time, end_time, slot_duration, break_start, break_end`,
        [clinic_id, user_id, daysJson, cleanStart, cleanEnd, cleanDuration, break_start || null, break_end || null]
      );
    }

    res.status(200).json({
      message: 'تم حفظ جدول وساعات الدوام بنجاح',
      availability: result.rows[0]
    });
  } catch (err) {
    console.error('[updateAvailability Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ أوقات العمل' });
  }
};

