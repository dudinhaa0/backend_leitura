const express = require('express');
const router = express.Router();
const path = require('path'); // Adicione essa linha se não tiver

// 🔄 RESOLUÇÃO ABSOLUTA: Força o Node a achar os arquivos saindo da pasta routes da forma correta
const authMiddleware = require(path.resolve(__dirname, '../middlewares/auth'));
const {
  registrarMinutos,
  progressoSemana,
  termometroGeral,
  rankingTurmas
} = require(path.resolve(__dirname, '../controllers/leituraController'));

// ============ 🔓 ROTAS PÚBLICAS ============
router.get('/termometro', termometroGeral);
router.get('/ranking', rankingTurmas);

// ============ 🔐 BARREIRA DE AUTENTICAÇÃO ============
router.use(authMiddleware);

// ============ 🔒 ROTAS PRIVADAS PROTEGIDAS ============
router.post('/registrar', registrarMinutos);
router.get('/progresso', progressoSemana);

module.exports = router;