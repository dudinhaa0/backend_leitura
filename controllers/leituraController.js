const supabase = require('../services/supabaseClient');

// Registrar minutos lidos (Limite de 16 min por dia)
async function registrarMinutos(req, res) {
  const { minutos } = req.body;
  const alunoId = req.aluno.id;
  
  const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];

  if (!minutos || minutos <= 0 || minutos > 16) {
    return res.status(400).json({ error: 'Minutos inválidos (deve ser entre 1 e 16)' });
  }

  try {
    const { data: registrosHoje, error: selectError } = await supabase
      .from('registros_leitura')
      .select('minutos')
      .eq('aluno_id', alunoId)
      .eq('data_registro', hoje);

    if (selectError) {
      return res.status(500).json({ error: 'Erro ao verificar registros de hoje' });
    }

    const totalHoje = registrosHoje.reduce((sum, r) => sum + r.minutos, 0);

    if (totalHoje + minutos > 16) {
      const restante = 16 - totalHoje;
      return res.status(400).json({
        error: `Limite diário de 16 minutos atingido. Você já leu ${totalHoje} min hoje. Restam apenas ${restante} min.`
      });
    }

    const { error: insertError } = await supabase
      .from('registros_leitura')
      .insert([{ aluno_id: alunoId, minutos, data_registro: hoje }]);

    if (insertError) {
      return res.status(500).json({ error: 'Erro ao salvar o registro de leitura' });
    }

    return res.json({ success: true, message: 'Leitura registrada com sucesso!' });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno no servidor: ' + e.message });
  }
}

// Progresso semanal do usuário conectado
async function progressoSemana(req, res) {
  const alunoId = req.aluno.id;
  
  try {
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos, data_registro')
      .eq('aluno_id', alunoId);

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar progresso do aluno' });
    }

    return res.json({ progresso: data || [] });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// Termômetro geral (Soma total da escola)
async function termometroGeral(req, res) {
  try {
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos');

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar dados do termômetro' });
    }

    const totalMinutos = data.reduce((sum, r) => sum + r.minutos, 0);
    return res.json({ total_escola: totalMinutos, meta: 1000000 });
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// RANKING DIÁRIO SEGURO E BLINDADO (QUEM LEU MAIS HOJE)
async function rankingTurmas(req, res) {
  try {
    const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];

    // Busca todos os alunos para mapear as turmas de forma independente
    const { data: todosAlunos, error: erroAlunos } = await supabase
      .from('alunos')
      .select('id, turma');

    if (erroAlunos) {
      return res.status(500).json({ error: 'Erro ao processar alunos para o ranking' });
    }

    // Busca apenas as leituras de hoje
    const { data: leiturasHoje, error: erroLeituras } = await supabase
      .from('registros_leitura')
      .select('aluno_id, minutos')
      .eq('data_registro', hoje);

    if (erroLeituras) {
      return res.status(500).json({ error: 'Erro ao processar leituras para o ranking' });
    }

    if (!leiturasHoje || leiturasHoje.length === 0) {
      return res.json([]);
    }

    const mapaAlunosTurma = {};
    todosAlunos.forEach(aluno => {
      mapaAlunosTurma[aluno.id] = aluno.turma;
    });

    const minutosPorTurma = {};
    leiturasHoje.forEach(reg => {
      const turmaAluno = mapaAlunosTurma[reg.aluno_id];
      if (turmaAluno) {
        minutosPorTurma[turmaAluno] = (minutosPorTurma[turmaAluno] || 0) + reg.minutos;
      }
    });

    const rankingFinal = Object.entries(minutosPorTurma)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total);

    return res.json(rankingFinal);

  } catch (e) {
    return res.status(500).json({ error: 'Erro interno no servidor: ' + e.message });
  }
}

module.exports = {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
};
