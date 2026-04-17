const { pool } = require('../config/db');

async function listContas(igrejaId) {
    const [rows] = await pool.query(
        `SELECT * FROM banco_contas WHERE igreja_id = ? ORDER BY nome`,
        [igrejaId]
    );

    return rows;
}

async function getConta(id, igrejaId) {
    const [[row]] = await pool.query(
        `SELECT * FROM banco_contas WHERE id = ? AND igreja_id = ?`,
        [id, igrejaId]
    );

    return row || null;
}

async function createConta(payload) {
    const { igrejaId, nome, banco, agencia, conta, tipo, saldoInicial, observacao, createdBy } = payload;
    const [result] = await pool.query(
        `INSERT INTO banco_contas (igreja_id, nome, banco, agencia, conta, tipo, saldo_inicial, observacao, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [igrejaId, nome, banco || null, agencia || null, conta || null, tipo || 'corrente', saldoInicial || 0, observacao || null, createdBy || null]
    );

    return result.insertId;
}

async function updateConta(id, igrejaId, payload) {
    const { nome, banco, agencia, conta, tipo, saldoInicial, observacao, ativo } = payload;
    await pool.query(
        `UPDATE banco_contas SET nome=?, banco=?, agencia=?, conta=?, tipo=?, saldo_inicial=?, observacao=?, ativo=?, updated_at=NOW()
         WHERE id=? AND igreja_id=?`,
        [nome, banco || null, agencia || null, conta || null, tipo || 'corrente', saldoInicial || 0, observacao || null, ativo !== undefined ? ativo : 1, id, igrejaId]
    );
}

async function deleteConta(id, igrejaId) {
    await pool.query(`DELETE FROM banco_contas WHERE id=? AND igreja_id=?`, [id, igrejaId]);
}

module.exports = {
    listContas,
    getConta,
    createConta,
    updateConta,
    deleteConta
};
