const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_KEY são obrigatórios');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;