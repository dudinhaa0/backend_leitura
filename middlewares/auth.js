const supabase = require('../services/supabaseClient');

async function authMiddleware(req, res, next) {
  // Captura o RM tanto do Header quanto da Query String
  const rm = req.headers['rm'] || req.query.rm;

  if (!rm) {
    return res.status(401).json({ error: 'Acesso negado. RM não informado.' });
  }

  try {
    // Busca o usuário na tabela 'usuarios' usando a coluna 'RM' (maiúsculo)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, RM, turma, nome')  // ← 'RM' maiúsculo
      .eq('RM', String(rm))            // ← 'RM' maiúsculo
      .maybeSingle();

    if (error || !data) {
      console.error('Usuário não encontrado para RM:', rm);
      return res.status(401).json({ error: 'Usuário não encontrado ou não cadastrado no sistema.' });
    }

    // Injeta os dados do usuário na requisição
    req.aluno = data;
    req.usuario = data;
    
    next();
  } catch (err) {
    console.error('Erro no authMiddleware:', err);
    return res.status(500).json({ error: 'Erro interno no middleware de autenticação: ' + err.message });
  }
}

module.exports = authMiddleware;