const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
} = require('../controllers/leituraController');

// 🔓 ROTAS PÚBLICAS (Acessíveis livremente)
router.get('/termometro', termometroGeral);
router.get('/ranking', rankingTurmas);

// 🔐 BARREIRA DE AUTENTICAÇÃO (Bloqueia o que está abaixo)
router.use(authMiddleware);

router.post('/registrar', registrarMinutos);
router.get('/progresso', progressoSemana);

module.exports = router;
