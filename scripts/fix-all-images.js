const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const replacements = [
  {
    name: 'JBL Speaker',
    url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000'
  },
  {
    name: 'Extension Wire',
    url: 'https://images.unsplash.com/photo-1618413155175-68a8f1127d82?q=80&w=1000'
  },
  {
    name: 'LCD PROJECTOR',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1000'
  },
  {
    name: 'Asus Zenbook Laptop',
    url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000'
  },
  {
    name: 'Standard Electric Fan',
    url: 'https://images.unsplash.com/photo-1618961734760-466979ce35b0?q=80&w=1000'
  },
  {
    name: 'Panasonic Microwave',
    url: 'https://images.unsplash.com/photo-1574269910231-7bc179040842?q=80&w=1000'
  },
  {
    name: 'Water Dispenser',
    url: 'https://images.unsplash.com/photo-1523362622747-ba0badd55430?q=80&w=1000'
  },
  {
    name: 'Canon EOS Digital Camera',
    url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1000'
  }
];

async function updateImages() {
  console.log('Updating all equipment images with stable Unsplash IDs...');
  for (const item of replacements) {
    const { error } = await supabase
      .from('equipment')
      .update({ image_url: item.url })
      .ilike('name', `%${item.name}%`);
    if (error) console.error(`Error updating ${item.name}:`, error);
    else console.log(`Successfully updated ${item.name}`);
  }
  console.log('Update complete!');
}

updateImages();
