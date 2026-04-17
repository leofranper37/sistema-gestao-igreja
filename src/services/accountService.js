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
        role: userRecord.role
    };

    const token = jwt.sign(
        {
            sub: userRecord.id,
            email: userRecord.email,
            igreja: userRecord.igreja,
            igrejaId: userRecord.igreja_id,
            role: userRecord.role,
            nome: userRecord.nome
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

    if (!igrejaId) {
        igrejaId = await accountModel.createChurch(payload.igreja);
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
        role: 'admin'
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