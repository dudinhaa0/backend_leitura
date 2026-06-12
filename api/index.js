const express = require('express');
const cors = require('cors');
const path = require('path');

// 🟢 LINK DIRETO PARA O .ENV NA RAIZ (Subindo uma pasta da pasta 'api')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Importações protegidas
const supabase = require(path.resolve(__dirname, '../services/supabaseClient'));
const authMiddleware = require(path.resolve(__dirname, '../middlewares/auth'));
const leituraRoutes = require(path.resolve(__dirname, '../routes/leitura'));

const app = express();
// ... O resto do seu código do index.js continua igual abaixo daqui

// Configuração robusta de CORS para evitar bloqueios no navegador do Aluno
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'rm'],
    credentials: true
}));

// Middleware interceptador para responder requisições de teste (OPTIONS) do CORS
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

// Rota raiz de verificação de status (Health Check)
app.get('/', (req, res) => {
    res.json({ message: 'API SESI Leitura online e integrada com sucesso!', status: 'online' });
});

// ============ LÓGICA DE AUTENTICAÇÃO CENTRALIZADA NO SERVIDOR ============
async function tratarLoginCadastro(req, res) {
    const { rm, nome, turma } = req.body;
    
    if (!rm) {
        return res.status(400).json({ error: 'O número do RM é obrigatório para acessar.' });
    }

    try {
        // Busca o aluno de forma blindada com maybeSingle() evitando estourar erro interno
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('*')
            .eq('rm', rm)
            .maybeSingle();

        if (erroBusca) return res.status(500).json({ error: 'Erro de leitura no banco: ' + erroBusca.message });

        // Se encontrou o aluno cadastrado, retorna os dados para o localStorage do front
        if (alunoExistente) {
            return res.json({ success: true, message: 'Login efetuado com sucesso!', aluno: alunoExistente });
        }

        // Se o RM não existe e o aluno não passou os dados cadastrais, barra o fluxo indicando registro
        if (!nome || !turma) {
            return res.status(404).json({ error: 'Aluno não cadastrado. Preencha o formulário de Registro.' });
        }

        // Se o formulário de Registro foi preenchido, insere o aluno automaticamente
        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('alunos')
            .insert([{ rm, nome, turma }])
            .select()
            .single();

        if (erroInsercao) return res.status(500).json({ error: 'Erro ao registrar aluno: ' + erroInsercao.message });

        return res.status(201).json({ success: true, message: 'Cadastro efetuado com sucesso!', aluno: novoAluno });
    } catch (err) {
        return res.status(500).json({ error: 'Falha interna no processamento: ' + err.message });
    }
}

// Vinculação dos endpoints de login/cadastro (Duplo caminho preventivo contra 404 da Vercel)
app.post('/api/auth/login-ou-cadastro', tratarLoginCadastro);
app.post('/auth/login-ou-cadastro', tratarLoginCadastro);

// Acoplamento do ecossistema mapeado de rotas de leitura (Termômetro, Ranking, Progresso e Registro)
app.use('/api/leitura', leituraRoutes);
app.use('/leitura', leituraRoutes);

// ============ TRATAMENTO CENTRALIZADO DE ROTAS INEXISTENTES ============
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não localizada no servidor da API.', 
        path: req.originalUrl,
        message: 'Verifique se o método HTTP ou o endereço da URL correspondem aos padrões do projeto.'
    });
});

// ... todo o seu código anterior continua aqui em cima ...

// 🚀 ESSA PARTE LIGA O SERVIDOR LOCALMENTE E MOSTRA O LINK NO TERMINAL
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor do projeto SESI Leitura online com sucesso!`);
        console.log(`📍 Link para acessar: http://localhost:${PORT}\n`);
    });
}

module.exports = app;