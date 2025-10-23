import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestAdmin() {
  console.log('🔐 Creating test admin user...\n');
  
  try {
    const email = 'admin@skyvps360.xyz';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists');
      console.log(`   Email: ${existingUser.rows[0].email}`);
      console.log(`   Role: ${existingUser.rows[0].role}`);
      
      // Update password and ensure admin role
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3',
        [hashedPassword, 'admin', email]
      );
      console.log('✅ Password updated to: admin123');
      console.log('✅ Role set to: admin\n');
    } else {
      // Create new admin user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role`,
        [email, hashedPassword, 'admin', 'Admin User']
      );
      
      console.log('✅ Admin user created successfully');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Role: ${result.rows[0].role}`);
      console.log(`   Password: admin123\n`);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createTestAdmin();
