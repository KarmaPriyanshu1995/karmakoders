
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function testConnection() {
  console.log('Testing connection to:', connectionString ? connectionString.split('@')[1] : 'UNDEFINED');
  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err: any) {
    console.error('Connection error:', err.message);
    if (err.code) console.error('Error code:', err.code);
  } finally {
    await pool.end();
  }
}

testConnection();
