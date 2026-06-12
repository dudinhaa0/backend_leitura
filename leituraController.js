const supabase = require('../services/supabaseClient');

// Registrar minutos lidos (Limite de 16 min por dia)
async function registrarMinutos(req, res) {
  const { minutos } = req.body;
  const alunoId = req.aluno.id;
  
  // Garante a data local formatada como YYYY-MM-DD baseado no fuso horário de Brasília
  const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];

  // VALIDAÇÃO BACK-END: Minutos válidos
  if (!minutos || minutos <= 0 || minutos > 16) {
    return res.status(400).json({ error: 'Minutos inválidos (deve ser entre 1 e 16)' });
  }

  try {
    // Buscar registros do aluno no dia de hoje
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

    // Inserir o novo registro de leitura
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
    // Busca todos os registros de leitura do aluno
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

// Ranking por turma (À prova de falhas de relacionamento no banco)
async function rankingTurmas(req, res) {
  try {
    // Busca os minutos e traz os dados do aluno relacionado usando a relação padrão
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos, alunos(turma)');

    if (error) {
      console.error('Erro na consulta do Supabase para o ranking:', error);
      return res.status(500).json({ error: 'Erro ao processar dados do ranking' });
    }

    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Agrupa e soma os minutos de cada turma de forma manual
    const turmas = {};
    data.forEach(reg => {
      const turma = reg.alunos?.turma;
      if (turma) {
        turmas[turma] = (turmas[turma] || 0) + reg.minutos;
      }
    });

    // Transforma o objeto de turmas em um array estruturado e ordena do maior para o menor total
    const ranking = Object.entries(turmas)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total);

    return res.json(ranking);
  } catch (e) {
    console.error('Erro interno na rota de ranking:', e);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}

module.exports = {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
};