const express = require('express');
const { authorize, requireAuth } = require('../middlewares/auth');
const { bancoContaSchema, validateBody } = require('../utils/validation');
const { createConta, deleteConta, getConta, listContas, updateConta } = require('../controllers/bancoController');

const router = express.Router();
const rw = ['admin', 'financeiro', 'secretaria'];
const ro = ['admin', 'financeiro', 'secretaria', 'pastor'];

router.get('/banco/contas', requireAuth, authorize(ro), listContas);
router.get('/banco/contas/:id', requireAuth, authorize(ro), getConta);
router.post('/banco/contas', requireAuth, authorize(rw), validateBody(bancoContaSchema), createConta);
router.put('/banco/contas/:id', requireAuth, authorize(rw), validateBody(bancoContaSchema), updateConta);
router.delete('/banco/contas/:id', requireAuth, authorize(['admin', 'financeiro']), deleteConta);

module.exports = router;
