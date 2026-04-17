const jwt = require('jsonwebtoken');

const config = require('../config');
const { pool } = require('../config/db');
const { createHttpError } = require('../utils/httpError');

async function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || '';
    const queryToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';

    if (!authorization.startsWith('Bearer ') && !queryToken) {
        return next(createHttpError(401, 'Token de acesso não informado.'));
    }

    const token = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : queryToken;

    try {
        const payload = jwt.verify(token, config.security.jwtSecret);
        const [rows] = await pool.query(
            `SELECT id, nome, email, igreja, igreja_id, role
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [payload.sub]
        );

        const user = rows[0];

        if (!user) {
            return next(createHttpError(401, 'Usuário do token não encontrado.'));
        }

        req.auth = {
            ...payload,
            id: user.id,
            nome: user.nome,
            email: user.email,
            igreja: user.igreja,
            igrejaId: user.igreja_id,
            role: user.role
        };

        next();
    } catch (error) {
        next(createHttpError(401, 'Token inválido ou expirado.'));
    }
}

function authorize(allowedRoles = []) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
        if (!req.auth) {
            return next(createHttpError(401, 'Usuário não autenticado.'));
        }

        if (!roles.length) {
            return next();
        }

        if (!roles.includes(req.auth.role)) {
            return next(createHttpError(403, 'Acesso negado para este perfil.'));
        }

        next();
    };
}

module.exports = {
    authorize,
    requireAuth
};