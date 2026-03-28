const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('--- Supabase Connection Test ---');
  console.log('Project URL:', url);
  
  if (!url || !key) {
    console.error('❌ FAILED: Missing Supabase environment variables in .env.local');
    return;
  }

  const supabase = createClient(url, key);

  try {
    const { data, error } = await supabase.from('equipment').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ FAILED: Supabase Error:', error.message);
    } else {
      console.log('✅ SUCCESS: Supabase is connected!');
      console.log(`Initial DB Check: Found ${data || 0} items in equipment table.`);
    }
  } catch (error) {
    console.error('❌ FAILED: Exception:', error.message);
  }
}

testSupabase();
