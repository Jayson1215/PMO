const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const replacements = [
  {
    name: 'Standard Electric Fan',
    url: 'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?q=80&w=1000'
  },
  {
    name: 'Panasonic Microwave',
    url: 'https://images.unsplash.com/photo-1582236814272-a0b411130dcf?q=80&w=1000'
  },
  {
    name: 'Water Dispenser',
    url: 'https://images.unsplash.com/photo-1585807955891-fc5653b655b3?q=80&w=1000'
  },
  {
    name: 'Extension Wire',
    url: 'https://images.unsplash.com/photo-1544006659-f0b21f04cb1b?q=80&w=1000'
  }
];

async function updateImages() {
  console.log('Updating broken images...');
  for (const item of replacements) {
    const { error } = await supabase
      .from('equipment')
      .update({ image_url: item.url })
      .ilike('name', `%${item.name}%`);
    if (error) console.error(`Error updating ${item.name}:`, error);
    else console.log(`Successfully updated ${item.name}`);
  }
}

updateImages();
