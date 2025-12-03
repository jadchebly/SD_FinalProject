const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log('Testing connection to:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

pool.query('SELECT NOW() as current_time, version() as version')
  .then((result) => {
    console.log('✅ Connection successful!');
    console.log('   Current time:', result.rows[0].current_time);
    console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  });

