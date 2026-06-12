const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
} = require('../controllers/leituraController');

// ROTAS PÚBLICAS (Qualquer um pode ver, mesmo sem estar logado)
router.get('/termometro', termometroGeral);
router.get('/ranking', rankingTurmas);

// BARREIRA DE AUTENTICAÇÃO (Tudo abaixo daqui precisa de RM)
router.use(authMiddleware);

router.post('/registrar', registrarMinutos);
router.get('/progresso', progressoSemana);

module.exports = router;