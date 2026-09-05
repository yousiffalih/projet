import jwt from 'jsonwebtoken';
import pool from '../db/index.js';

// حارس الأمان (Middleware) للتحقق من التوكن وحالة اشتراك العيادة
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // التحقق من وجود التوكن في الترويسة (Header)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح لك بالدخول، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1]; // استخراج التوكن الفعلي

  try {
    // فك تشفير التوكن والتأكد من صحته
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // id, clinic_id, role

    // إذا كان المستخدم ينتمي لعيادة (وليس سوبر أدمن)، نتأكد أن العيادة نشطة
    if (decoded.clinic_id && decoded.role !== 'SUPER_ADMIN') {
      const clinicCheck = await pool.query(
        'SELECT subscription_status, name FROM clinics WHERE id = $1',
        [decoded.clinic_id]
      );
      if (clinicCheck.rows.length === 0 || clinicCheck.rows[0].subscription_status === 'Inactive') {
        return res.status(403).json({
          error: 'تم تجميد حساب هذه العيادة مؤقتاً من قِبل إدارة المنصة.',
          clinic_suspended: true
        });
      }
    }

    next(); // السماح بالعبور
  } catch (err) {
    return res.status(403).json({ error: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
};

export default verifyToken;
