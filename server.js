const express = require('express');
const cors = require('cors');
// Força o carregamento do .env apontando o caminho exato na raiz
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

// Importação das rotas e serviços adaptados para o ecossistema SESI Leitura
const leituraRoutes = require('./routes/leitura');
const supabase = require('./services/supabaseClient');

const app = express();

// Configuração robusta de CORS para evitar bloqueios de segurança no navegador do Aluno
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'rm'],
    credentials: true
}));

// Middleware interceptador para responder requisições de pré-voo (CORS Pre-flight OPTIONS)
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
        return res.status(400).json({ error: 'O número do RM é obrigatório.' });
    }

    try {
        // ✅ CORRIGIDO: usa 'usuarios' e 'RM' maiúsculo
        const { data: usuarioExistente, error: erroBusca } = await supabase
            .from('usuarios')
            .select('*')
            .eq('RM', String(rm))
            .maybeSingle();

        if (erroBusca) {
            console.error('Erro no Supabase:', erroBusca);
            return res.status(500).json({ error: 'Erro de leitura no banco: ' + erroBusca.message });
        }

        // Se encontrou o usuário
        if (usuarioExistente) {
            return res.json({ 
                success: true, 
                message: 'Login efetuado com sucesso!', 
                aluno: usuarioExistente 
            });
        }

        // Se não encontrou e faltam dados, não cria
        if (!nome || !turma) {
            return res.status(404).json({ 
                error: 'RM não cadastrado. Preencha todos os campos para se cadastrar.' 
            });
        }

        // ✅ CORRIGIDO: insere na tabela 'usuarios'
        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('usuarios')
            .insert([{ 
                RM: String(rm),
                nome: nome, 
                turma: turma,
                email: `${rm}@sesi.com.br`,
                senha: '123456'
            }])
            .select()
            .single();

        if (erroInsercao) {
            console.error('Erro ao inserir:', erroInsercao);
            return res.status(500).json({ error: 'Erro ao cadastrar aluno: ' + erroInsercao.message });
        }

        return res.status(201).json({ 
            success: true, 
            message: 'Cadastro efetuado com sucesso!', 
            aluno: novoAluno 
        });
    } catch (err) {
        console.error('Erro fatal:', err);
        return res.status(500).json({ error: 'Falha interna: ' + err.message });
    }
}

// Vinculação dos endpoints de login/cadastro (Duplo caminho preventivo contra 404 da Vercel)
app.post('/api/auth/login-ou-cadastro', tratarLoginCadastro);
app.post('/auth/login-ou-cadastro', tratarLoginCadastro);

// Acoplamento do ecossistema de rotas de leitura
app.use('/api/registros_leitura', leituraRoutes);
app.use('/registros_leitura', leituraRoutes);

// ============ TRATAMENTO CENTRALIZADO DE ROTAS INEXISTENTES ============
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não localizada no servidor da API.', 
        path: req.originalUrl,
        message: 'Verifique se o método HTTP ou o endereço da URL correspondem aos padrões do projeto.'
    });
});

// Inicialização da escuta de requisições no ambiente local/produção
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor do projeto SESI Leitura rodando na porta ${PORT}`);
    console.log(`📍 Endereço local: http://localhost:${PORT}`);
    console.log(`📡 Endpoints principais e barreiras de segurança carregados com sucesso!\n`);
});

module.exports = app;