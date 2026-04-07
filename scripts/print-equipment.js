const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('equipment').select('id, name');
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  data.forEach(item => {
    console.log(`EQUIPMENT_NAME: ${item.name} | ID: ${item.id}`);
  });
}

run();
