import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
dotenv.config();
const { Pool } = pg;

async function run() {
  console.log('🔎 Debugging admin login against DB...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to DB');

    const { rows } = await client.query(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
      ['admin@containerstacks.com']
    );

    if (rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const user = rows[0];
    console.log('👤 Admin row:', { id: user.id, email: user.email, role: user.role });
    console.log('🔐 Hash prefix:', user.password_hash?.slice(0, 7));

    const tests = ['admin123', 'Admin123', 'admin123 '];
    for (const candidate of tests) {
      const ok = await bcrypt.compare(candidate, user.password_hash);
      console.log(`🧪 Compare("${candidate}") => ${ok}`);
    }

    client.release();
  } catch (err) {
    console.error('❌ Debug failed:', err);
  } finally {
    await pool.end();
  }
}

run();