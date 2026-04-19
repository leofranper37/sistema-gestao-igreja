const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const config = require('../config');
const accountModel = require('../models/accountModel');

function buildAuthResponse(userRecord) {
    const user = {
        id: userRecord.id,
        nome: userRecord.nome,
        email: userRecord.email,
        igreja: userRecord.igreja,
        igrejaId: userRecord.igreja_id,
        role: userRecord.role,
        plano: userRecord.plano || 'teste-7-dias',
        statusAssinatura: userRecord.status_assinatura || 'trial',
        trialStartsAt: userRecord.trial_starts_at || null,
        trialEndsAt: userRecord.trial_ends_at || null,
        maxCadastros: userRecord.max_cadastros || 40,
        maxCongregacoes: userRecord.max_congregacoes || 1
    };

    const token = jwt.sign(
        {
            sub: userRecord.id,
            email: userRecord.email,
            igreja: userRecord.igreja,
            igrejaId: userRecord.igreja_id,
            role: userRecord.role,
            nome: userRecord.nome,
            plano: user.plano,
            statusAssinatura: user.statusAssinatura
        },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn }
    );

    return { token, user };
}

async function registerAccount(payload) {
    const passwordHash = await bcrypt.hash(payload.senha, config.security.passwordSaltRounds);

    const existingChurch = await accountModel.findChurchByName(payload.igreja);
    let igrejaId = existingChurch?.id;
    let churchMetadata = existingChurch || null;

    if (!igrejaId) {
        igrejaId = await accountModel.createChurch(payload.igreja);
        churchMetadata = await accountModel.findChurchByName(payload.igreja);
    }

    const userId = await accountModel.createUser({
        igreja: payload.igreja,
        igrejaId,
        nome: payload.nome,
        email: payload.email,
        passwordHash,
        role: 'admin'
    });

    return buildAuthResponse({
        id: userId,
        igreja: payload.igreja,
        igreja_id: igrejaId,
        nome: payload.nome,
        email: payload.email,
        role: 'admin',
        plano: churchMetadata?.plano,
        status_assinatura: churchMetadata?.status_assinatura,
        trial_starts_at: churchMetadata?.trial_starts_at,
        trial_ends_at: churchMetadata?.trial_ends_at,
        max_cadastros: churchMetadata?.max_cadastros,
        max_congregacoes: churchMetadata?.max_congregacoes
    });
}

async function login(payload) {
    const userRecord = await accountModel.findUserByEmail(payload.email);

    if (!userRecord) {
        return null;
    }

    const passwordMatches = await bcrypt.compare(payload.senha, userRecord.password_hash);

    if (!passwordMatches) {
        return null;
    }

    return buildAuthResponse(userRecord);
}

module.exports = {
    login,
    registerAccount
};