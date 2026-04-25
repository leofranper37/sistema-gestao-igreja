const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const {
    gerarPix,
    gerarCartao,
    listarPlanos,
    statusAssinatura,
    webhookMercadoPago,
} = require('../controllers/paymentController');

const router = express.Router();

// Rotas públicas (sem auth) — usadas na tela de assinatura
router.get('/api/pagamentos/planos', listarPlanos);

// Webhook do Mercado Pago (sem auth — autenticado pela assinatura HMAC)
// Precisa de raw body para verificar assinatura; usamos express.json() localmente.
router.post(
    '/api/pagamentos/webhook/mercado-pago',
    express.json(),
    webhookMercadoPago
);

// Rotas autenticadas
router.get('/api/pagamentos/status', requireAuth, statusAssinatura);
router.post('/api/pagamentos/pix', requireAuth, gerarPix);
router.post('/api/pagamentos/cartao', requireAuth, gerarCartao);

module.exports = router;
