const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Configuração robusta de CORS para evitar bloqueios no navegador
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'rm'],
    credentials: true
}));

// Middleware para responder imediatamente às requisições de teste (OPTIONS) do CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, rm');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rota de teste na raiz do servidor
app.get('/', (req, res) => {
    res.json({ message: 'API online e integrada ao Supabase!', status: 'online' });
});

// ============ FUNÇÃO AUXILIAR DA ROTA DE AUTENTICAÇÃO ============
async function tratarLoginCadastro(req, res) {
    const { rm, nome, turma } = req.body;

    if (!rm) {
        return res.status(400).json({ error: 'RM é obrigatório' });
    }

    try {
        // Verifica se o aluno já existe no Supabase
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('*')
            .eq('rm', rm)
            .maybeSingle();

        if (erroBusca) {
            return res.status(500).json({ error: 'Erro no banco: ' + erroBusca.message });
        }

        // Se encontrou o aluno, faz Login
        if (alunoExistente) {
            return res.json({ message: 'Login efetuado com sucesso!', aluno: alunoExistente });
        }

        // Se não encontrou e faltam dados, não cria (É uma tentativa de login inválida)
        if (!nome || !turma) {
            return res.status(404).json({ error: 'RM não cadastrado. Preencha todos os campos para se cadastrar.' });
        }

        // Se não encontrou e tem os dados, faz o Cadastro completo
        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('alunos')
            .insert([{ rm, nome, turma }])
            .select()
            .single();

        if (erroInsercao) {
            return res.status(500).json({ error: 'Erro ao cadastrar aluno: ' + erroInsercao.message });
        }

        return res.status(201).json({ message: 'Cadastro efetuado com sucesso!', aluno: novoAluno });

    } catch (err) {
        return res.status(500).json({ error: 'Erro interno: ' + err.message });
    }
}

// SOLUÇÃO DO 404: Escuta a rota com e sem o prefixo /api que a Vercel altera
app.post('/api/auth/login-ou-cadastro', tratarLoginCadastro);
app.post('/auth/login-ou-cadastro', tratarLoginCadastro);


// Auxiliar para capturar o RM enviado pelo Front-end (via Query string ou via Headers)
const obterRM = (req) => req.query.rm || req.headers.rm || req.headers['rm'];

// ============ MAPEAMENTO DAS ROTAS DE LEITURA (DUPLO CAMINHO) ============

app.get(['/api/leitura/termometro', '/leitura/termometro'], async (req, res) => {
    try {
        const { data, error } = await supabase.from('registros_leitura').select('minutos');
        if (error) throw error;
        const total = data?.reduce((s, r) => s + r.minutos, 0) || 0;
        res.json({ total_escola: total, meta: 1000000 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get(['/api/leitura/ranking', '/leitura/ranking'], async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('registros_leitura')
            .select('minutos, alunos(turma)');
        
        if (error || !data) return res.json([]);
        
        const turmas = {};
        data.forEach(reg => {
            const turma = reg.alunos?.turma;
            if (turma) turmas[turma] = (turmas[turma] || 0) + reg.minutos;
        });
        
        const ranking = Object.entries(turmas)
            .map(([turma, total]) => ({ turma, total }))
            .sort((a, b) => b.total - a.total);
        
        res.json(ranking);
    } catch (e) {
        res.json([]);
    }
});

app.get(['/api/leitura/progresso', '/leitura/progresso'], async (req, res) => {
    const rm = obterRM(req);
    if (!rm) return res.status(401).json({ error: 'RM não informado' });

    try {
        const { data: aluno, error: erroAluno } = await supabase
            .from('alunos').select('id').eq('rm', rm).single();
        
        if (erroAluno || !aluno) return res.status(401).json({ error: 'Aluno não encontrado' });

        const { data: registros, error: erroRegistros } = await supabase
            .from('registros_leitura')
            .select('minutos, data_registro')
            .eq('aluno_id', aluno.id);
        
        if (erroRegistros) throw erroRegistros;
        
        res.json({ progresso: registros || [] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post(['/api/leitura/registrar', '/leitura/registrar'], async (req, res) => {
    const { minutos } = req.body;
    const rm = obterRM(req);
    
    if (!rm) return res.status(401).json({ error: 'RM não informado' });
    if (!minutos || minutos <= 0 || minutos > 16) return res.status(400).json({ error: 'Minutos inválidos (1-16)' });

    try {
        const { data: aluno, error: erroAluno } = await supabase
            .from('alunos').select('id').eq('rm', rm).single();
        
        if (erroAluno || !aluno) return res.status(401).json({ error: 'Aluno não encontrado' });

        const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];
        
        const { data: registrosHoje } = await supabase
            .from('registros_leitura')
            .select('minutos')
            .eq('aluno_id', aluno.id)
            .eq('data_registro', hoje);
        
        const totalHoje = registrosHoje?.reduce((s, r) => s + r.minutos, 0) || 0;
        if (totalHoje + minutos > 16) {
            return res.status(400).json({ error: `Limite diário atingido. Você já leu ${totalHoje} min hoje.` });
        }

        const { error: insertError } = await supabase
            .from('registros_leitura')
            .insert([{ aluno_id: aluno.id, minutos, data_registro: hoje }]);
        
        if (insertError) return res.status(500).json({ error: 'Erro ao salvar leitura' });
        
        res.json({ success: true, message: 'Leitura registrada com sucesso!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;