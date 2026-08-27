import pool from '../db/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ─── إنشاء حساب Super Admin ─────────────────────────────────────────────────
// محمي بـ secret key في الـ body (SUPER_ADMIN_SECRET في .env)
export const createSuperAdmin = async (req, res) => {
  try {
    const { full_name, email, password, secret_key } = req.body;

    // التحقق من الـ secret key
    if (secret_key !== (process.env.SUPER_ADMIN_SECRET || 'clinic_super_2026')) {
      return res.status(403).json({ error: 'مفتاح الأمان غير صحيح' });
    }

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // التحقق من عدم وجود البريد مسبقاً
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // إنشاء Super Admin بدون clinic_id
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, clinic_id)
       VALUES ($1, $2, $3, 'SUPER_ADMIN', NULL)
       RETURNING id, full_name, email, role`,
      [full_name.trim(), cleanEmail, password_hash]
    );

    res.status(201).json({
      message: 'تم إنشاء حساب المشرف العام بنجاح',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('[createSuperAdmin Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب: ' + err.message });
  }
};

// ─── تسجيل الدخول كـ Super Admin ────────────────────────────────────────────
export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND role = 'SUPER_ADMIN'`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, clinic_id: null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('[superAdminLogin Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};

// ─── إحصائيات المنصة العامة ─────────────────────────────────────────────────
export const getPlatformStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM clinics)                     AS total_clinics,
        (SELECT COUNT(*)::int FROM clinics WHERE subscription_status = 'Active')   AS active_clinics,
        (SELECT COUNT(*)::int FROM clinics WHERE subscription_status = 'Inactive') AS inactive_clinics,
        (SELECT COUNT(*)::int FROM patients)                    AS total_patients,
        (SELECT COUNT(*)::int FROM appointments)                AS total_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE status = 'confirmed') AS confirmed_appointments,
        (SELECT COUNT(*)::int FROM users WHERE role = 'DOCTOR') AS total_doctors,
        (SELECT COUNT(*)::int FROM clinics WHERE subscription_plan = 'Basic')      AS basic_plan,
        (SELECT COUNT(*)::int FROM clinics WHERE subscription_plan = 'Pro')        AS pro_plan,
        (SELECT COUNT(*)::int FROM clinics WHERE subscription_plan = 'Enterprise') AS enterprise_plan
    `);

    // آخر 6 عيادات مسجلة
    const recentClinics = await pool.query(`
      SELECT c.id, c.name, c.subscription_plan, c.subscription_status, c.created_at,
             COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'DOCTOR') AS doctors_count,
             COUNT(DISTINCT p.id) AS patients_count
      FROM clinics c
      LEFT JOIN users u ON u.clinic_id = c.id
      LEFT JOIN patients p ON p.clinic_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 6
    `);

    res.status(200).json({
      stats: result.rows[0],
      recent_clinics: recentClinics.rows
    });
  } catch (err) {
    console.error('[getPlatformStats Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
};

// ─── جلب كل العيادات مع إحصائياتها ─────────────────────────────────────────
export const getAllClinicsWithStats = async (req, res) => {
  try {
    const { search, plan, status } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (c.name ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    if (plan && plan !== 'all') {
      params.push(plan);
      whereClause += ` AND c.subscription_plan = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND c.subscription_status = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.subscription_plan,
        c.subscription_status,
        c.created_at,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'ADMIN')   AS admins_count,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'DOCTOR')  AS doctors_count,
        COUNT(DISTINCT p.id)                                     AS patients_count,
        COUNT(DISTINCT a.id)                                     AS appointments_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'confirmed') AS confirmed_count
      FROM clinics c
      LEFT JOIN users u ON u.clinic_id = c.id
      LEFT JOIN patients p ON p.clinic_id = c.id
      LEFT JOIN appointments a ON a.clinic_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, params);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('[getAllClinicsWithStats Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب العيادات' });
  }
};

// ─── تعديل خطة الاشتراك ──────────────────────────────────────────────────────
export const updateClinicPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    const validPlans = ['Basic', 'Pro', 'Enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'خطة الاشتراك غير صالحة' });
    }

    const result = await pool.query(
      `UPDATE clinics SET subscription_plan = $1 WHERE id = $2
       RETURNING id, name, subscription_plan, subscription_status`,
      [plan, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    res.status(200).json({
      message: `تم تحديث خطة الاشتراك إلى ${plan}`,
      clinic: result.rows[0]
    });
  } catch (err) {
    console.error('[updateClinicPlan Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تعديل خطة الاشتراك' });
  }
};

// ─── تفعيل / تعطيل عيادة ────────────────────────────────────────────────────
export const toggleClinicStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await pool.query(
      'SELECT subscription_status FROM clinics WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    const newStatus = current.rows[0].subscription_status === 'Active' ? 'Inactive' : 'Active';

    const result = await pool.query(
      `UPDATE clinics SET subscription_status = $1 WHERE id = $2
       RETURNING id, name, subscription_plan, subscription_status`,
      [newStatus, id]
    );

    res.status(200).json({
      message: `تم ${newStatus === 'Active' ? 'تفعيل' : 'تعطيل'} العيادة بنجاح`,
      clinic: result.rows[0]
    });
  } catch (err) {
    console.error('[toggleClinicStatus Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير حالة العيادة' });
  }
};

// ─── الدخول كمدير عيادة (Impersonate Clinic) ─────────────────────────────────
export const impersonateClinic = async (req, res) => {
  try {
    const { id } = req.params;

    // البحث عن مدير العيادة (ADMIN)
    const userResult = await pool.query(
      "SELECT id, full_name, email, role, clinic_id FROM users WHERE clinic_id = $1 AND role = 'ADMIN' LIMIT 1",
      [id]
    );

    let targetUser = userResult.rows[0];

    // إذا لم يوجد مدير، نبحث عن أي مستخدم في العيادة
    if (!targetUser) {
      const anyUser = await pool.query(
        "SELECT id, full_name, email, role, clinic_id FROM users WHERE clinic_id = $1 LIMIT 1",
        [id]
      );
      targetUser = anyUser.rows[0];
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'لا يوجد مستخدمون مسجلون في هذه العيادة' });
    }

    // توليد توكن العيادة
    const token = jwt.sign(
      { id: targetUser.id, clinic_id: targetUser.clinic_id, role: targetUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'تم توليد تصريح الدخول للعيادة',
      token,
      user: targetUser
    });
  } catch (err) {
    console.error('[impersonateClinic Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء الدخول للعيادة' });
  }
};

// ─── إنشاء عيادة جديدة بواسطة السوبر أدمن ───────────────────────────────────
export const createClinicByAdmin = async (req, res) => {
  try {
    const { name, owner_name, email, password, phone, address, subscription_plan } = req.body;

    if (!name || !owner_name || !email || !password) {
      return res.status(400).json({ error: 'الاسم، اسم المدير، البريد وكلمة المرور مطلوبة' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 1. إنشاء العيادة
    const clinicRes = await pool.query(
      `INSERT INTO clinics (name, address, phone, email, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5, 'Active')
       RETURNING *`,
      [name.trim(), address?.trim() || null, phone?.trim() || null, cleanEmail, subscription_plan || 'Basic']
    );
    const newClinic = clinicRes.rows[0];

    // 2. تشفير كلمة المرور وإنشاء المدير
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userRes = await pool.query(
      `INSERT INTO users (clinic_id, full_name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, 'ADMIN', $5)
       RETURNING id, full_name, email, role, clinic_id`,
      [newClinic.id, owner_name.trim(), cleanEmail, password_hash, phone?.trim() || null]
    );

    res.status(201).json({
      message: 'تم إنشاء العيادة وحساب المدير بنجاح',
      clinic: newClinic,
      user: userRes.rows[0]
    });
  } catch (err) {
    console.error('[createClinicByAdmin Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء العيادة: ' + err.message });
  }
};

// ─── تحديث بيانات العيادة بالكامل ──────────────────────────────────────────
export const updateClinicFull = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, subscription_plan, subscription_status, new_password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم العيادة مطلوب' });
    }

    const clinicRes = await pool.query(
      `UPDATE clinics
       SET name = $1, email = $2, phone = $3, address = $4, subscription_plan = $5, subscription_status = $6
       WHERE id = $7
       RETURNING *`,
      [
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        subscription_plan || 'Basic',
        subscription_status || 'Active',
        id
      ]
    );

    if (clinicRes.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    // إذا طلب تغيير كلمة مرور المدير
    if (new_password && new_password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(new_password, salt);
      await pool.query(
        "UPDATE users SET password_hash = $1 WHERE clinic_id = $2 AND role = 'ADMIN'",
        [hash, id]
      );
    }

    res.status(200).json({
      message: 'تم تحديث بيانات العيادة بنجاح',
      clinic: clinicRes.rows[0]
    });
  } catch (err) {
    console.error('[updateClinicFull Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العيادة' });
  }
};

// ─── جلب تفاصيل عيادة مع أطبائها ───────────────────────────────────────────
export const getClinicDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const clinicRes = await pool.query('SELECT * FROM clinics WHERE id = $1', [id]);
    if (clinicRes.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    const doctorsRes = await pool.query(
      "SELECT id, full_name, email, phone, specialty, role, created_at FROM users WHERE clinic_id = $1 ORDER BY role ASC, full_name ASC",
      [id]
    );

    const statsRes = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM patients WHERE clinic_id = $1) AS patients_count,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1) AS appointments_count,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1 AND status = 'confirmed') AS confirmed_count
    `, [id]);

    res.status(200).json({
      clinic: clinicRes.rows[0],
      staff: doctorsRes.rows,
      stats: statsRes.rows[0]
    });
  } catch (err) {
    console.error('[getClinicDetails Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل العيادة' });
  }
};

// ─── حذف عيادة ───────────────────────────────────────────────────────────────
export const deleteClinic = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM clinics WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'العيادة غير موجودة' });
    }

    res.status(200).json({
      message: `تم حذف عيادة "${result.rows[0].name}" بنجاح`
    });
  } catch (err) {
    console.error('[deleteClinic Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف العيادة: ' + err.message });
  }
};
