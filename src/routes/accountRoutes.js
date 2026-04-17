const express = require('express');

const { createConta, login } = require('../controllers/accountController');
const { createContaSchema, loginSchema, validateBody } = require('../utils/validation');

const router = express.Router();

router.post('/criar-conta', validateBody(createContaSchema), createConta);
router.post('/login', validateBody(loginSchema), login);

module.exports = router;