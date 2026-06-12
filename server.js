const express = require('express');
const cors = require('cors');
require('dotenv').config();

const leituraRoutes = require('./routes/leitura');
const supabase = require('./services/supabaseClient');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'rm'],
    credentials: true
}));

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

app.get('/', (req, res) => {
    res.json({ message: 'API online e integrada ao Supabase!', status: 'online' });
});

// LÓGICA DE AUTENTICAÇÃO CENTRALIZADA NO SERVIDOR
async function tratarLoginCadastro(req, res) {
    const { rm, nome, turma } = req.body;
    if (!rm) return res.status(400).json({ error: 'RM é obrigatório' });

    try {
        const { data: alunoExistente, error: erroBusca } = await supabase
            .from('alunos')
            .select('*')
            .eq('rm', rm)
            .maybeSingle();

        if (erroBusca) return res.status(500).json({ error: erroBusca.message });

        if (alunoExistente) {
            return res.json({ message: 'Login efetuado com sucesso!', aluno: alunoExistente });
        }

        if (!nome || !turma) {
            return res.status(404).json({ error: 'RM não cadastrado. Preencha todos os campos para se cadastrar.' });
        }

        const { data: novoAluno, error: erroInsercao } = await supabase
            .from('alunos')
            .insert([{ rm, nome, turma }])
            .select()
            .single();

        if (erroInsercao) return res.status(500).json({ error: erroInsercao.message });

        return res.status(201).json({ message: 'Cadastro efetuado com sucesso!', aluno: novoAluno });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

app.post('/api/auth/login-ou-cadastro', tratarLoginCadastro);
app.post('/auth/login-ou-cadastro', tratarLoginCadastro);

app.use('/api/leitura', leituraRoutes);
app.use('/leitura', leituraRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));

module.exports = app;
