const express = require('express');

const { createConta, login } = require('../controllers/accountController');
const { createContaSchema, loginSchema, validateBody } = require('../utils/validation');
const { requireAuth, authorize } = require('../middlewares/auth');

const router = express.Router();

// Rota fechada: apenas super-admin ou admin autenticado pode criar novas igrejas/contas.
router.post('/criar-conta', requireAuth, authorize(['super-admin', 'admin']), validateBody(createContaSchema), createConta);
router.post('/login', validateBody(loginSchema), login);

module.exports = router;