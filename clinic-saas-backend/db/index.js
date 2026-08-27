import pg from 'pg';
import dotenv from 'dotenv';

// تحميل متغيرات البيئة
dotenv.config();

const { Pool } = pg;

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// فحص الاتصال
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database!');
  }
  if (client) release();
});

// تصدير الاتصال لاستخدامه في باقي الملفات
export default pool;
