import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database!');
  }
  if (client) release();
});

// A simple test API endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Clinic SaaS API is running perfectly.' });
});

// Initialize database tables for clinics and users
app.get('/api/setup', async (req, res) => {
  try {
    // إنشاء جدول العيادات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinics (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          subscription_plan VARCHAR(50),
          subscription_status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // إنشاء جدول المستخدمين (المرتبط بالعيادة)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          clinic_id INT NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          specialty VARCHAR(100),
          FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
      );
    `);

    res.status(200).json({ message: 'تم تهيئة جداول العيادات والمستخدمين بنجاح!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء تهيئة الجداول' });
  }
});

// Route to add a new clinic
app.post('/api/clinics', async (req, res) => {
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
});

// Route to list all registered clinics
app.get('/api/clinics', async (req, res) => {
  try {
    const allClinics = await pool.query('SELECT * FROM clinics ORDER BY created_at DESC');
    res.status(200).json(allClinics.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب البيانات' });
  }
});

// مسار تسجيل مستخدم جديد (طبيب أو موظف)
app.post('/api/users/register', async (req, res) => {
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
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});