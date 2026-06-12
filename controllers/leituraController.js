const supabase = require('../services/supabaseClient');

// Função auxiliar para pegar a data atual no fuso de São Paulo
function getDataSaoPaulo() {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];
}

// Função para buscar usuário pelo RM (coluna 'RM' maiúscula)
async function buscarUsuarioPorRm(rm) {
  if (!rm) return null;
  
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nome, turma')
    .eq('RM', String(rm))  // ← 'RM' maiúsculo
    .maybeSingle();
  
  if (error || !usuario) return null;
  return usuario;
}

// ============================================
// REGISTRAR MINUTOS LIDOS
// ============================================
async function registrarMinutos(req, res) {
  console.log('🔵 registrarMinutos chamado');
  console.log('Body:', req.body);
  console.log('Headers.rm:', req.headers.rm);
  
  const { minutos } = req.body;
  const rm = req.headers.rm || req.query.rm;
  
  console.log('RM recebido:', rm);
  
  if (!rm) {
    return res.status(401).json({ error: 'RM não informado' });
  }
  
  if (!minutos || minutos <= 0 || minutos > 16) {
    return res.status(400).json({ error: 'Minutos inválidos (deve ser entre 1 e 16)' });
  }

  try {
    // 1. Buscar o usuário pelo RM (coluna 'RM' maiúscula)
    console.log('Buscando usuário com RM:', rm);
    const usuario = await buscarUsuarioPorRm(rm);
    
    if (!usuario) {
      console.error('Usuário NÃO encontrado para RM:', rm);
      return res.status(404).json({ error: 'Usuário não encontrado. Faça login novamente.' });
    }
    
    console.log('✅ Usuário encontrado:', usuario.id, usuario.nome);
    
    const hoje = getDataSaoPaulo();
    console.log('Data de hoje:', hoje);
    
    // 2. Verificar registros de hoje do usuário
    const { data: registrosHoje, error: selectError } = await supabase
      .from('registros_leitura')
      .select('minutos')
      .eq('usuario_id', usuario.id)
      .eq('data', hoje);
    
    if (selectError) {
      console.error('Erro ao buscar registros:', selectError);
      return res.status(500).json({ error: 'Erro ao verificar registros: ' + selectError.message });
    }
    
    const totalHoje = registrosHoje?.reduce((sum, r) => sum + r.minutos, 0) || 0;
    console.log(`Total lido hoje: ${totalHoje} minutos`);
    
    // 3. Verificar limite diário de 16 minutos
    if (totalHoje + minutos > 16) {
      const restante = 16 - totalHoje;
      return res.status(400).json({
        error: `Limite diário de 16 minutos. Você já leu ${totalHoje} min hoje. Faltam ${restante} min.`
      });
    }
    
    // 4. Inserir o novo registro
    const { error: insertError } = await supabase
      .from('registros_leitura')
      .insert([{ 
        usuario_id: usuario.id, 
        minutos: minutos,
        data: hoje,
        livro: req.body.livro || 'Leitura registrada'  // Campo obrigatório
      }]);
    
    if (insertError) {
      console.error('Erro ao inserir registro:', insertError);
      return res.status(500).json({ error: 'Erro ao salvar leitura: ' + insertError.message });
    }
    
    console.log('✅ Leitura registrada com sucesso!');
    return res.json({ success: true, message: 'Leitura registrada com sucesso!' });
    
  } catch (e) {
    console.error('❌ Erro fatal:', e);
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// ============================================
// PROGRESSO DO USUÁRIO
// ============================================
async function progressoSemana(req, res) {
  const rm = req.headers.rm || req.query.rm;
  
  if (!rm) {
    return res.status(401).json({ error: 'RM não informado' });
  }
  
  try {
    const usuario = await buscarUsuarioPorRm(rm);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos, data')
      .eq('usuario_id', usuario.id)
      .order('data', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar progresso' });
    }
    
    return res.json({ progresso: data || [] });
    
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}

// ============================================
// TERMÔMETRO GERAL DA ESCOLA
// ============================================
async function termometroGeral(req, res) {
  try {
    const { data, error } = await supabase
      .from('registros_leitura')
      .select('minutos');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    const totalMinutos = data?.reduce((sum, r) => sum + r.minutos, 0) || 0;
    const metaEmMinutos = 10000;
    
    res.json({ 
      total_escola: totalMinutos, 
      meta: metaEmMinutos,
      porcentagem: (totalMinutos / metaEmMinutos) * 100
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ============================================
// RANKING POR TURMA
// ============================================
async function rankingTurmas(req, res) {
  try {
    const hoje = getDataSaoPaulo();
    
    // Buscar todos os usuários com suas turmas
    const { data: usuarios, error: errUsers } = await supabase
      .from('usuarios')
      .select('id, turma');
    
    if (errUsers) {
      return res.json([]);
    }
    
    // Buscar leituras de hoje
    const { data: leiturasHoje, error: errLeituras } = await supabase
      .from('registros_leitura')
      .select('usuario_id, minutos')
      .eq('data', hoje);
    
    if (errLeituras) {
      return res.json([]);
    }
    
    if (!leiturasHoje || leiturasHoje.length === 0) {
      return res.json([]);
    }
    
    // Criar mapa de usuário -> turma
    const mapaTurma = {};
    usuarios.forEach(u => { mapaTurma[u.id] = u.turma; });
    
    // Somar minutos por turma
    const minutosPorTurma = {};
    leiturasHoje.forEach(reg => {
      const turma = mapaTurma[reg.usuario_id];
      if (turma) {
        minutosPorTurma[turma] = (minutosPorTurma[turma] || 0) + reg.minutos;
      }
    });
    
    // Converter para array e ordenar
    const ranking = Object.entries(minutosPorTurma)
      .map(([turma, total]) => ({ turma, total }))
      .sort((a, b) => b.total - a.total);
    
    res.json(ranking);
  } catch (e) {
    res.json([]);
  }
}

module.exports = {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
};