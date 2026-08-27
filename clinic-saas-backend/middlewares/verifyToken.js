import jwt from 'jsonwebtoken';

// حارس الأمان (Middleware) للتحقق من التوكن
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // التحقق من وجود التوكن في الترويسة (Header)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح لك بالدخول، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1]; // استخراج التوكن الفعلي

  try {
    // فك تشفير التوكن والتأكد من صحته
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // الآن أصبح (req.user) يحتوي على id, clinic_id, role
    next(); // السماح للمستخدم بالعبور إلى المسار المطلوب
  } catch (err) {
    return res.status(403).json({ error: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
};

export default verifyToken;
