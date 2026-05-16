
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL.replace('.tech', '-pooler.c-7.us-east-1.aws.neon.tech');
// Wait, I'll just hardcode it for the test
const pooledConnectionString = "postgresql://neondb_owner:npg_Wyxj3YhKbu4e@ep-late-lab-ap5bz145-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=verify-full";

async function testConnection() {
  console.log('Testing connection to:', connectionString ? connectionString.split('@')[1] : 'UNDEFINED');
  const pool = new Pool({ 
    connectionString: pooledConnectionString,
    connectionTimeoutMillis: 5000, // 5 seconds timeout
  });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection error:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.stack) console.error('Stack:', err.stack);
  } finally {
    await pool.end();
  }
}

testConnection();
