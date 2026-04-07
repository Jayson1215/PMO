const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populate() {
  console.log('Starting population...');

  // 1. Ensure "Appliances" category exists
  let { data: applianceCat, error: catError } = await supabase
    .from('equipment_categories')
    .select('id')
    .eq('name', 'Appliances')
    .single();

  if (!applianceCat) {
    const { data: newCat, error: insertCatError } = await supabase
      .from('equipment_categories')
      .insert({ name: 'Appliances', description: 'Household appliances and devices', icon: 'zap' })
      .select()
      .single();
    if (insertCatError) {
      console.error('Error creating Appliances category:', insertCatError);
    } else {
      applianceCat = newCat;
      console.log('Created Appliances category');
    }
  } else {
    console.log('Appliances category already exists');
  }

  // Get other category IDs
  const { data: categories } = await supabase.from('equipment_categories').select('id, name');
  const getCatId = (name) => categories.find(c => c.name === name)?.id;

  // 2. Update existing equipment with images
  const updates = [
    { name: 'JBL Speaker', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000' },
    { name: 'Extension Wire', url: 'https://images.unsplash.com/photo-1621503934579-994df7e016b8?q=80&w=1000' },
    { name: 'LCD PROJECTOR', url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000' }
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from('equipment')
      .update({ image_url: update.url })
      .ilike('name', update.name);
    if (error) console.error(`Error updating ${update.name}:`, error);
    else console.log(`Updated ${update.name} image`);
  }

  // 3. Add new equipment
  const newEquipment = [
    {
      name: 'Asus Zenbook Laptop',
      category_id: getCatId('Computing'),
      description: 'High-performance laptop for presentation and office work',
      total_quantity: 5,
      available_quantity: 5,
      image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000',
      status: 'available',
      condition: 'excellent'
    },
    {
      name: 'Standard Electric Fan',
      category_id: applianceCat.id,
      description: 'Oscillating stand fan for cooling',
      total_quantity: 10,
      available_quantity: 10,
      image_url: 'https://plus.unsplash.com/premium_photo-1664195101185-bc659424f07a?q=80&w=1000',
      status: 'available',
      condition: 'good'
    },
    {
      name: 'Panasonic Microwave',
      category_id: applianceCat.id,
      description: 'Compact microwave for office use',
      total_quantity: 2,
      available_quantity: 2,
      image_url: 'https://images.unsplash.com/photo-1574269910231-7bc179040842?q=80&w=1000',
      status: 'available',
      condition: 'good'
    },
    {
      name: 'Water Dispenser',
      category_id: applianceCat.id,
      description: 'Hot and cold water dispenser',
      total_quantity: 3,
      available_quantity: 3,
      image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5962?q=80&w=1000',
      status: 'available',
      condition: 'good'
    },
    {
      name: 'Canon EOS Digital Camera',
      category_id: getCatId('Others'),
      description: 'DSLR camera for university events',
      total_quantity: 3,
      available_quantity: 3,
      image_url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1000',
      status: 'available',
      condition: 'excellent'
    }
  ];

  for (const item of newEquipment) {
    // Check if exists first
    const { data: existing } = await supabase.from('equipment').select('id').ilike('name', item.name).single();
    if (existing) {
      console.log(`Skipping ${item.name}, already exists`);
      continue;
    }

    const { error } = await supabase.from('equipment').insert(item);
    if (error) console.error(`Error adding ${item.name}:`, error);
    else console.log(`Added ${item.name} with image`);
  }

  console.log('Population complete!');
}

populate();
