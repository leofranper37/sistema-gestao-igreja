const { createHttpError } = require('../utils/httpError');
const accountService = require('../services/accountService');
const { audit } = require('../services/auditService');

async function createConta(req, res) {
    const payload = req.validatedBody;

    try {
        const auth = await accountService.registerAccount(payload);
        audit('account.create', req, { email: payload.email, igreja: payload.igreja });

        res.status(201).json({
            message: 'Conta criada com sucesso.',
            token: auth.token,
            user: auth.user
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw createHttpError(409, 'Já existe uma conta cadastrada com esse e-mail.');
        }
        throw error;
    }
}

async function login(req, res) {
    const payload = req.validatedBody;
    const auth = await accountService.login(payload);

    if (!auth) {
        throw createHttpError(401, 'E-mail ou senha inválidos.');
    }

    audit('account.login', req, { email: payload.email, userId: auth.user.id });

    res.json({
        message: 'Login realizado com sucesso.',
        token: auth.token,
        user: auth.user
    });
}

module.exports = {
    createConta,
    login
};