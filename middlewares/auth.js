const supabase = require('../services/supabaseClient');

async function authMiddleware(req, res, next) {
  const rm = req.headers['rm'];

  if (!rm) {
    return res.status(401).json({ error: 'RM não informado' });
  }

  const { data, error } = await supabase
    .from('alunos')
    .select('id, rm, turma')
    .eq('rm', rm)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Aluno não encontrado' });
  }

  req.aluno = data;
  next();
}

module.exports = authMiddleware;