const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function verifyTables() {
  try {
    console.log('🔍 Checking database tables...\n');

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const expectedTables = ['comments', 'follows', 'likes', 'posts', 'users'];
    const existingTables = tablesResult.rows.map(row => row.table_name);

    console.log('📊 Found tables:');
    existingTables.forEach(table => {
      const isExpected = expectedTables.includes(table);
      console.log(`   ${isExpected ? '✅' : '⚠️ '} ${table}`);
    });

    console.log('\n📋 Expected tables:');
    expectedTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      console.log('\n✅ All tables created successfully!');
      
      // Count rows in each table
      console.log('\n📈 Table row counts:');
      for (const table of expectedTables) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`   ${table}: ${countResult.rows[0].count} rows`);
        } catch (err) {
          console.log(`   ${table}: Error reading table`);
        }
      }
    } else {
      console.log(`\n❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('   Please run the SQL schema in Supabase SQL Editor');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTables();

