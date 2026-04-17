const { pool } = require('../config/db');

async function listCargos(igrejaId) {
    const [rows] = await pool.query('SELECT * FROM cargos WHERE igreja_id = ? ORDER BY id DESC', [igrejaId]);
    return rows;
}

async function createCargo(igrejaId, descricao) {
    await pool.query('INSERT INTO cargos (descricao, igreja_id) VALUES (?, ?)', [descricao, igrejaId]);
}

async function updateCargo(id, igrejaId, descricao) {
    const [result] = await pool.query(
        'UPDATE cargos SET descricao = ? WHERE id = ? AND igreja_id = ?',
        [descricao, id, igrejaId]
    );

    return result.affectedRows;
}

async function deleteCargo(id, igrejaId) {
    const [result] = await pool.query('DELETE FROM cargos WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
    return result.affectedRows;
}

module.exports = {
    createCargo,
    deleteCargo,
    listCargos,
    updateCargo
};