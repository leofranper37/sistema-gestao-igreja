const { pool } = require('../config/db');

async function listEventosByPeriodo({ igrejaId, startDate, endDate }) {
    const [rows] = await pool.query(
        `SELECT id, titulo, descricao, inicio, fim, created_at, updated_at
         FROM agenda_eventos
         WHERE igreja_id = ?
           AND inicio < ?
           AND fim > ?
         ORDER BY inicio ASC`,
        [igrejaId, endDate, startDate]
    );

    return rows;
}

async function getEventoById({ igrejaId, id }) {
    const [rows] = await pool.query(
        `SELECT id, titulo, descricao, inicio, fim, created_at, updated_at
         FROM agenda_eventos
         WHERE igreja_id = ? AND id = ?
         LIMIT 1`,
        [igrejaId, id]
    );

    return rows[0] || null;
}

async function createEvento({ igrejaId, titulo, descricao, inicio, fim }) {
    const [result] = await pool.query(
        'INSERT INTO agenda_eventos (igreja_id, titulo, descricao, inicio, fim) VALUES (?, ?, ?, ?, ?)',
        [igrejaId, titulo, descricao, inicio, fim]
    );

    return result.insertId;
}

async function updateEvento({ igrejaId, id, titulo, descricao, inicio, fim }) {
    const [result] = await pool.query(
        `UPDATE agenda_eventos
         SET titulo = ?, descricao = ?, inicio = ?, fim = ?
         WHERE igreja_id = ? AND id = ?`,
        [titulo, descricao, inicio, fim, igrejaId, id]
    );

    return result.affectedRows;
}

async function deleteEvento({ igrejaId, id }) {
    const [result] = await pool.query(
        'DELETE FROM agenda_eventos WHERE igreja_id = ? AND id = ?',
        [igrejaId, id]
    );

    return result.affectedRows;
}

module.exports = {
    createEvento,
    deleteEvento,
    getEventoById,
    listEventosByPeriodo,
    updateEvento
};
