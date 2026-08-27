import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';

// منطق تسجيل عيادة جديدة مع مستخدم مدير (Admin) وتوليد التوكن مباشرة
export const registerClinic = async (req, res) => {
  try {
    const { clinic_name, full_name, email, password, phone, address } = req.body;

    if (!clinic_name || !clinic_name.trim()) {
      return res.status(400).json({ error: 'اسم العيادة مطلوب' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'اسم الطبيب / المدير مطلوب' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. التحقق من عدم وجود المستخدم مسبقاً
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 2. إنشاء سجل العيادة
    const clinicResult = await pool.query(
      `INSERT INTO clinics (name, address, phone, email, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, 'Basic', 'Active')
       RETURNING id, name, address, phone, email, subscription_plan, subscription_status, created_at`,
      [clinic_name.trim(), address?.trim() || null, phone?.trim() || null, cleanEmail]
    );
    const newClinic = clinicResult.rows[0];

    // 3. تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 4. إنشاء المستخدم المدير
    const userResult = await pool.query(
      `INSERT INTO users (clinic_id, full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, 'ADMIN', $5)
       RETURNING id, full_name, email, role, clinic_id, created_at`,
      [newClinic.id, full_name.trim(), cleanEmail, password_hash, phone?.trim() || null]
    );
    const newUser = userResult.rows[0];

    // 5. توليد JWT Token للدخول التلقائي
    const token = jwt.sign(
      { id: newUser.id, clinic_id: newUser.clinic_id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'تم تسجيل العيادة وإنشاء الحساب بنجاح',
      token,
      user: newUser,
      clinic: newClinic
    });
  } catch (err) {
    console.error('[registerClinic Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل العيادة' });
  }
};

// منطق تسجيل مستخدم جديد (طبيب أو موظف)
export const registerUser = async (req, res) => {
  try {
    const { clinic_id, full_name, email, password, role, specialty } = req.body;

    // 1. التحقق من عدم وجود المستخدم مسبقاً
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 2. تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. حفظ المستخدم في قاعدة البيانات
    const newUser = await pool.query(
      'INSERT INTO users (clinic_id, full_name, email, password_hash, role, specialty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role',
      [clinic_id, full_name, email, password_hash, role, specialty]
    );

    res.status(201).json({
      message: 'تم تسجيل المستخدم بنجاح',
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل المستخدم' });
  }
};

// منطق تسجيل الدخول (Login)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. البحث عن المستخدم في قاعدة البيانات
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // إذا لم يتم العثور على المستخدم
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const user = userResult.rows[0];

    // 2. مطابقة كلمة المرور المشفرة
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // 3. توليد توكن الدخول (JWT)
    // لاحظ أننا نضع clinic_id داخل التوكن لمعرفة العيادة التي ينتمي إليها
    const token = jwt.sign(
      { id: user.id, clinic_id: user.clinic_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // صلاحية التوكن 7 أيام
    );

    // 4. إرسال الاستجابة بنجاح
    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token: token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        clinic_id: user.clinic_id
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};

const nullIfEmpty = (val) => (val && typeof val === 'string' && val.trim() !== '' ? val.trim() : null);

// جلب قائمة الأطباء مع عدد المواعيد المسندة لكل طبيب
export const getDoctors = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.specialty, u.role, u.created_at,
              COUNT(a.id)::int AS appointment_count
       FROM users u
       LEFT JOIN appointments a ON a.doctor_id = u.id
       WHERE u.clinic_id = $1 AND u.role = 'DOCTOR'
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [clinic_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[getDoctors Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الأطباء' });
  }
};

// إضافة طبيب جديد
export const createDoctor = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { full_name, email, password, specialty, phone } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'اسم الطبيب مطلوب' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // التحقق من عدم وجود البريد مسبقاً
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const cleanSpecialty = nullIfEmpty(specialty) || 'طبيب عام';
    const cleanPhone     = nullIfEmpty(phone);

    const result = await pool.query(
      `INSERT INTO users (clinic_id, full_name, email, password_hash, role, specialty, phone)
       VALUES ($1, $2, $3, $4, 'DOCTOR', $5, $6)
       RETURNING id, clinic_id, full_name, email, role, specialty, phone, created_at`,
      [clinic_id, full_name.trim(), cleanEmail, password_hash, cleanSpecialty, cleanPhone]
    );

    const newDoctor = {
      ...result.rows[0],
      appointment_count: 0
    };

    res.status(201).json({ message: 'تم إضافة الطبيب بنجاح', doctor: newDoctor });
  } catch (err) {
    console.error('[createDoctor Error]:', err.message);
    res.status(400).json({ error: err.message || 'حدث خطأ أثناء إضافة الطبيب' });
  }
};

// حذف طبيب
export const deleteDoctor = async (req, res) => {
  try {
    const { clinic_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 AND clinic_id = $2 AND role = \'DOCTOR\' RETURNING id',
      [id, clinic_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'الطبيب غير موجود' });
    }

    res.status(200).json({ message: 'تم حذف الطبيب بنجاح' });
  } catch (err) {
    console.error('[deleteDoctor Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الطبيب' });
  }
};
