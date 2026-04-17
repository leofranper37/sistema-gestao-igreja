const { pool } = require('../config/db');

async function findChurchByName(name) {
    const [rows] = await pool.query('SELECT id, nome FROM igrejas WHERE nome = ? LIMIT 1', [name]);
    return rows[0] || null;
}

async function createChurch(name) {
    const [result] = await pool.query('INSERT INTO igrejas (nome) VALUES (?)', [name]);
    return result.insertId;
}

async function createUser(payload) {
    const [result] = await pool.query(
        'INSERT INTO users (igreja, igreja_id, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        [payload.igreja, payload.igrejaId, payload.nome, payload.email, payload.passwordHash, payload.role]
    );

    return result.insertId;
}

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        'SELECT id, igreja, igreja_id, role, nome, email, password_hash FROM users WHERE email = ? LIMIT 1',
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