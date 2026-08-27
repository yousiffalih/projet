import pool from '../db/index.js';

// وظيفة: إضافة عيادة جديدة
export const createClinic = async (req, res) => {
  try {
    const { name, address, subscription_plan } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'اسم العيادة مطلوب لتسجيل الاشتراك' });
    }

    const newClinic = await pool.query(
      'INSERT INTO clinics (name, address, subscription_plan, subscription_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, address, subscription_plan || 'Basic', 'Active']
    );

    res.status(201).json({
      message: 'تم تسجيل العيادة بنجاح',
      clinic: newClinic.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ في الخادم الداخلي' });
  }
};

// وظيفة: جلب جميع العيادات
export const getClinics = async (req, res) => {
  try {
    const allClinics = await pool.query('SELECT * FROM clinics ORDER BY created_at DESC');
    res.status(200).json(allClinics.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
  }
};
