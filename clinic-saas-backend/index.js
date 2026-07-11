import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

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

// Temporary route to create the clinics table once
app.get('/api/setup', async (req, res) => {
  try {
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
    res.status(200).json({ message: 'تم إنشاء جدول العيادات بنجاح!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الجدول' });
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});