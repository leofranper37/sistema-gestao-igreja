const { pool } = require('../config/db');

async function findChurchByName(name) {
    const [rows] = await pool.query(
        `SELECT id, nome, plano, status_assinatura, trial_starts_at, trial_ends_at, max_cadastros, max_congregacoes
         FROM igrejas
         WHERE nome = ?
         LIMIT 1`,
        [name]
    );
    return rows[0] || null;
}

async function createChurch(name) {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const [result] = await pool.query(
        `INSERT INTO igrejas (
            nome, plano, status_assinatura, trial_starts_at, trial_ends_at, max_cadastros, max_congregacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            name,
            'teste-7-dias',
            'trial',
            now.toISOString(),
            trialEndsAt.toISOString(),
            40,
            1
        ]
    );
    return result.insertId;
}

async function createUser(payload) {
    const [result] = await pool.query(
        'INSERT INTO usuarios (igreja, igreja_id, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        [payload.igreja, payload.igrejaId, payload.nome, payload.email, payload.passwordHash, payload.role]
    );

    return result.insertId;
}

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `SELECT u.id, u.igreja, u.igreja_id, u.role, u.nome, u.email, u.password_hash,
                i.plano, i.status_assinatura, i.trial_starts_at, i.trial_ends_at, i.max_cadastros, i.max_congregacoes
         FROM usuarios u
         LEFT JOIN igrejas i ON i.id = u.igreja_id
         WHERE u.email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

module.exports = {
    createChurch,
    createUser,
    findChurchByName,
    findUserByEmail
};