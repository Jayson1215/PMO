const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const replacements = [
  { id: 'b03b67e5-6684-4f7d-8562-f17b9a07e844', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000' },
  { id: '36053ac9-06e8-422e-a389-054405cea31a', url: 'https://images.unsplash.com/photo-1618961734760-466979ce35b0?q=80&w=1000' },
  { id: '109300c8-907d-4e4e-9ed4-c29d66ac00d0', url: 'https://images.unsplash.com/photo-1574269910231-7bc179040842?q=80&w=1000' },
  { id: '6fab8765-0579-4189-be95-c33c4d0b3bbc', url: 'https://images.unsplash.com/photo-1523362622747-ba0badd55430?q=80&w=1000' },
  { id: '8fb9622f-468d-4683-b8bf-b677c84c2280', url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=1000' },
  { id: '92b7992f-b697-4ecb-b1d3-17a38e9e3185', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000' },
  { id: '534aa8e3-7cd1-4f3d-885d-7d27d7c2b8f7', url: 'https://images.unsplash.com/photo-1618413155175-68a8f1127d82?q=80&w=1000' },
  { id: '1de5c867-4071-4671-b4d1-488ec44e3b64', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1000' }
];

async function updateImages() {
  console.log('Updating all equipment images by ID...');
  for (const item of replacements) {
    const { error } = await supabase
      .from('equipment')
      .update({ image_url: item.url })
      .eq('id', item.id);
    if (error) console.error(`Error updating ID ${item.id}:`, error);
    else console.log(`Successfully updated ID ${item.id}`);
  }
  console.log('Update complete!');
}

updateImages();
