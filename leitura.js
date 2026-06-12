const express = require('express');
const router = express.Router();

// Importação do Middleware adaptado que aceita RM via Header e Query String
const authMiddleware = require('../middlewares/auth');

// Importação do Controller adaptado para o fluxo do SESI Leitura
const {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
} = require('../controllers/leituraController');

// ============ 🔓 ROTAS PÚBLICAS ============
// Acessíveis livremente pelo front-end para renderizar os painéis globais da escola

// Trata: GET /api/leitura/termometro ou GET /leitura/termometro
router.get('/termometro', termometroGeral);

// Trata: GET /api/leitura/ranking ou GET /leitura/ranking
router.get('/ranking', rankingTurmas);


// ============ 🔐 BARREIRA DE AUTENTICAÇÃO INDESTRUTÍVEL ============
// Intercepta a requisição, valida o RM e injeta o objeto "req.aluno" para os controllers abaixo
router.use(authMiddleware);


// ============ 🔒 ROTAS PRIVADAS PROTEGIDAS ============
// Exigem validação prévia e são alimentadas pelo RM enviado pelo seu script.js

// Trata: POST /api/leitura/registrar ou POST /leitura/registrar
router.post('/registrar', registrarMinutos);

// Trata: GET /api/leitura/progresso ou GET /leitura/progresso
router.get('/progresso', progressoSemana);

module.exports = router;