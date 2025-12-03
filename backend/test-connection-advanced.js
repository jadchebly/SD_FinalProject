const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

console.log('🔍 Testing database connection...\n');
console.log('Connection string (masked):', connectionString?.replace(/:[^:@]+@/, ':****@'));

// Try different connection configurations
const configs = [
  {
    name: 'Direct connection with SSL',
    config: {
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    name: 'Connection with connectionTimeoutMillis',
    config: {
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    },
  },
  {
    name: 'Parsed connection (if connection string format is wrong)',
    config: (() => {
      try {
        const url = new URL(connectionString.replace('postgresql://', 'http://'));
        return {
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          database: url.pathname.slice(1) || 'postgres',
          user: url.username || 'postgres',
          password: url.password,
          ssl: { rejectUnauthorized: false },
        };
      } catch (e) {
        return null;
      }
    })(),
  },
];

async function testConnection(config, name) {
  if (!config) return false;
  
  const pool = new Pool(config);
  
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log(`✅ ${name}: SUCCESS`);
    console.log(`   Time: ${result.rows[0].time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ ${name}: FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}\n`);
    await pool.end();
    return false;
  }
}

async function runTests() {
  for (const { name, config } of configs) {
    if (config) {
      const success = await testConnection(config, name);
      if (success) {
        console.log('✅ Connection successful! Use this configuration.');
        process.exit(0);
      }
    }
  }
  
  console.log('❌ All connection attempts failed.\n');
  console.log('💡 Troubleshooting:');
  console.log('   1. Verify your Supabase project is fully provisioned (green checkmark)');
  console.log('   2. Check the connection string in Supabase: Settings → Database → Connection string → URI');
  console.log('   3. Try the Connection Pooling string (port 6543) instead');
  console.log('   4. Make sure your internet connection is working');
  console.log('   5. Check if there are any firewall restrictions');
  
  process.exit(1);
}

runTests();

