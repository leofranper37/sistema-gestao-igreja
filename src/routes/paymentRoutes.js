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

// Diagnóstico de configuração (apenas booleanos — sem expor valores)
router.get('/api/pagamentos/config-check', (req, res) => {
    res.json({
        MP_ACCESS_TOKEN: !!process.env.MP_ACCESS_TOKEN,
        MERCADOPAGO_ACCESS_TOKEN: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
        PIX_KEY: !!process.env.PIX_KEY,
        PIX_CHAVE: !!process.env.PIX_CHAVE,
        PIX_RECEIVER_NAME: !!process.env.PIX_RECEIVER_NAME,
        PIX_RECEIVER_CITY: !!process.env.PIX_RECEIVER_CITY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV || '(não definido)',
    });
});

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
