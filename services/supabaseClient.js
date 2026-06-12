const { createClient } = require('@supabase/supabase-js');

// Captura as credenciais injetadas nas variáveis de ambiente do seu projeto
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 🚨 Validação Crítica e Blindada para o SEU PROJETO
if (!supabaseUrl || !supabaseKey) {
  const mensagemErro = '❌ ERRO DE CONFIGURAÇÃO: As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY não foram detectadas. Verifique o seu arquivo .env ou as configurações de Environment Variables na sua plataforma de deploy (Vercel/Render).';
  console.error(mensagemErro);
  
  // Lança o erro explicitamente para evitar que o servidor suba quebrado sem banco
  throw new Error(mensagemErro);
}

// Inicializa a instância de conexão com o banco de dados do Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Desativa a persistência de sessão local no Node.js (otimiza o backend do seu projeto para rotas de API sem estado)
    autoRefreshToken: false // Desativa atualizações de tokens em segundo plano, já que o seu front controla o fluxo pelo RM
  }
});

console.log('📦 Conexão com o Supabase do projeto SESI Leitura inicializada com sucesso!');

module.exports = supabase;