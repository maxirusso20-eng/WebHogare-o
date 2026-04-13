import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caewphtmlhatimnsfubl.supabase.co';
const supabaseKey = 'sb_publishable_Mj-TG1nvq7D_Q-6PUOiOXA_LxeUuJIn';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('mensajes').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
  console.error(error);
}

check();
