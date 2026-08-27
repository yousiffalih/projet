import pool from '../db/index.js';

// منطق لوحة التحكم والتقارير — مسارات محمية بالتوكن
export const getDashboardStats = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const userRole = req.user.role;

    const clinicResult = await pool.query('SELECT name FROM clinics WHERE id = $1', [clinicId]);

    res.status(200).json({
      message: 'أهلاً بك في لوحة التحكم',
      clinic_name: clinicResult.rows[0]?.name || 'العيادة',
      your_role: userRole
    });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// تحليلات وتقارير العيادة المتقدمة
export const getReportsAnalytics = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;

    // 1. أرقام المؤشرات الرئيسية (KPIs)
    const statsQuery = pool.query(
      `SELECT 
        (SELECT COUNT(*)::int FROM patients WHERE clinic_id = $1) AS total_patients,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1) AS total_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1 AND status = 'confirmed') AS confirmed_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1 AND status = 'pending') AS pending_appointments,
        (SELECT COUNT(*)::int FROM appointments WHERE clinic_id = $1 AND status = 'cancelled') AS cancelled_appointments,
        (SELECT COUNT(*)::int FROM users WHERE clinic_id = $1 AND role = 'DOCTOR') AS total_doctors`,
      [clinicId]
    );

    // 2. توزيع أنواع المواعيد (Types)
    const typesQuery = pool.query(
      `SELECT COALESCE(type, 'فحص عام') AS type_name, COUNT(*)::int AS count
       FROM appointments
       WHERE clinic_id = $1
       GROUP BY type_name
       ORDER BY count DESC`,
      [clinicId]
    );

    // 3. أعلى الأطباء إنجازاً للمواعيد المؤكدة
    const topDoctorsQuery = pool.query(
      `SELECT u.id, u.full_name, COALESCE(u.specialty, 'طبيب عام') AS specialty,
              COUNT(a.id)::int AS completed_count
       FROM users u
       LEFT JOIN appointments a ON a.doctor_id = u.id AND a.status = 'confirmed'
       WHERE u.clinic_id = $1 AND u.role = 'DOCTOR'
       GROUP BY u.id
       ORDER BY completed_count DESC
       LIMIT 5`,
      [clinicId]
    );

    // 4. نمو المرضى المسجلين لآخر 6 أشهر
    const monthlyGrowthQuery = pool.query(
      `SELECT 
         TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month_key,
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month_label,
         COUNT(*)::int AS patient_count
       FROM patients
       WHERE clinic_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at) ASC`,
      [clinicId]
    );

    const [statsRes, typesRes, topDoctorsRes, monthlyGrowthRes] = await Promise.all([
      statsQuery,
      typesQuery,
      topDoctorsQuery,
      monthlyGrowthQuery
    ]);

    const kpi = statsRes.rows[0];
    const totalAppts = kpi.total_appointments || 1; // لتفادي القسمة على صفر

    // إعداد توزيع الأنواع مع النسبة المئوية
    const byType = typesRes.rows.map(row => ({
      name: row.type_name,
      count: row.count,
      percentage: Math.round((row.count / totalAppts) * 100)
    }));

    // إعداد حالات المواعيد بنسب مئوية
    const byStatus = [
      { key: 'confirmed', label: 'مؤكد', count: kpi.confirmed_appointments, percentage: Math.round((kpi.confirmed_appointments / totalAppts) * 100) || 0, color: 'teal' },
      { key: 'pending',   label: 'معلق', count: kpi.pending_appointments,   percentage: Math.round((kpi.pending_appointments / totalAppts) * 100) || 0, color: 'amber' },
      { key: 'cancelled', label: 'ملغي', count: kpi.cancelled_appointments, percentage: Math.round((kpi.cancelled_appointments / totalAppts) * 100) || 0, color: 'red' }
    ];

    // معدل إنجاز المواعيد المؤكدة
    const completionRate = Math.round((kpi.confirmed_appointments / totalAppts) * 100) || 0;

    res.status(200).json({
      kpi: {
        ...kpi,
        completion_rate: completionRate
      },
      by_type: byType,
      by_status: byStatus,
      top_doctors: topDoctorsRes.rows,
      monthly_growth: monthlyGrowthRes.rows
    });
  } catch (err) {
    console.error('[getReportsAnalytics Error]:', err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب تقارير العيادة' });
  }
};
