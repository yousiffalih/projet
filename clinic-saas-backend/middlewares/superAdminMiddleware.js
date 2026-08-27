import jwt from 'jsonwebtoken';

/**
 * Middleware للتحقق من أن المستخدم هو Super Admin
 * يتحقق من التوكن ومن الدور (SUPER_ADMIN)
 */
const superAdminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح لك، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'هذه الصفحة مخصصة للمشرف العام فقط' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
};

export default superAdminMiddleware;
