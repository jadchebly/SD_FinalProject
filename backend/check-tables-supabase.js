require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  const expectedTables = ['users', 'posts', 'follows', 'likes', 'comments'];
  const foundTables = [];
  const missingTables = [];

  for (const table of expectedTables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(0);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          missingTables.push(table);
          console.log(`❌ ${table} - Table does not exist`);
        } else {
          console.log(`⚠️  ${table} - Error: ${error.message}`);
        }
      } else {
        foundTables.push(table);
        console.log(`✅ ${table} - Table exists`);
      }
    } catch (error) {
      console.log(`⚠️  ${table} - Unexpected error`);
      missingTables.push(table);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Found: ${foundTables.length}/${expectedTables.length} tables`);
  console.log(`   ❌ Missing: ${missingTables.length} tables`);

  if (missingTables.length > 0) {
    console.log('\n💡 Next step:');
    console.log('   Run the SQL schema in Supabase SQL Editor:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Open: backend/database-schema.sql');
    console.log('   3. Copy and paste the SQL');
    console.log('   4. Click Run');
  } else {
    console.log('\n✅ All tables are created!');
  }
}

checkTables();

