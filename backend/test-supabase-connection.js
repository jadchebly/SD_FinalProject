require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...\n');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('\nPlease set in .env file:');
  console.error('   SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('   SUPABASE_ANON_KEY=eyJhbGc...');
  console.error('\nSee GET_SUPABASE_CREDENTIALS.md for instructions');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Try to query a table (even if it doesn't exist, we'll get a specific error)
    const { data, error } = await supabase.from('users').select('count').limit(0);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('✅ Supabase connection successful!');
        console.log('   Note: Tables may not be created yet (this is OK)');
        console.log('   Run the SQL schema in Supabase SQL Editor to create tables');
        process.exit(0);
      } else {
        throw error;
      }
    }

    console.log('✅ Supabase connection successful!');
    console.log('   Tables are accessible');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code || 'N/A');
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    console.error('   2. Check GET_SUPABASE_CREDENTIALS.md for how to get credentials');
    console.error('   3. Make sure your Supabase project is active');
    process.exit(1);
  }
}

testConnection();

