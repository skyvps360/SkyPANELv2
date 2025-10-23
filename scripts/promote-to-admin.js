/**
 * Promote a user to admin role
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function promoteToAdmin() {
  const email = 'john@example.com';
  
  console.log(`🔧 Promoting ${email} to admin role...\n`);

  try {
    // Check if user exists
    const checkResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length === 0) {
      console.error(`❌ User ${email} not found`);
      return;
    }

    const user = checkResult.rows[0];
    console.log(`Found user: ${user.email} (current role: ${user.role})`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin');
      return;
    }

    // Update role to admin
    await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['admin', email]
    );

    console.log(`✅ Successfully promoted ${email} to admin`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

promoteToAdmin();
