const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listEquipment() {
  const { data, error } = await supabase.from('equipment').select('id, name');
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

listEquipment();
