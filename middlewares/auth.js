const supabase = require('../services/supabaseClient');

async function authMiddleware(req, res, next) {
  // Adaptado: Captura o RM tanto do Header quanto da Query String (Compatível com o seu front)
  const rm = req.headers['rm'] || req.query.rm;

  if (!rm) {
    return res.status(401).json({ error: 'Acesso negado. RM não informado.' });
  }

  try {
    // Busca o aluno no banco de dados do Supabase usando o RM localizado
    const { data, error } = await supabase
      .from('alunos')
      .select('id, rm, turma, nome')
      .eq('rm', rm)
      .maybeSingle(); // Uso do maybeSingle para evitar lançar exceções brutas caso não encontre

    if (error || !data) {
      return res.status(401).json({ error: 'Aluno não encontrado ou não cadastrado no sistema.' });
    }

    // Injeta os dados tratados do aluno na requisição para uso dos controllers seguintes
    req.aluno = data;
    
    // Passa o controle para o próximo passo da rota (Controller)
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no middleware de autenticação: ' + err.message });
  }
}

module.exports = authMiddleware;