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

// ─── Lançamentos ─────────────────────────────────────────────────────────────

async function listLancamentos(contaId, igrejaId) {
    const [rows] = await pool.query(
        `SELECT bl.*, bc.nome AS conta_nome
         FROM banco_lancamentos bl
         JOIN banco_contas bc ON bc.id = bl.conta_id
         WHERE bl.conta_id = ? AND bl.igreja_id = ?
         ORDER BY bl.data_lancamento DESC, bl.id DESC`,
        [contaId, igrejaId]
    );
    return rows;
}

async function createLancamento(payload) {
    const { contaId, igrejaId, descricao, tipo, valor, dataLancamento, observacao, createdBy } = payload;
    const [result] = await pool.query(
        `INSERT INTO banco_lancamentos (conta_id, igreja_id, descricao, tipo, valor, data_lancamento, observacao, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [contaId, igrejaId, descricao, tipo, valor, dataLancamento, observacao || null, createdBy || null]
    );
    return result.insertId;
}

async function deleteLancamento(id, igrejaId) {
    await pool.query(`DELETE FROM banco_lancamentos WHERE id = ? AND igreja_id = ?`, [id, igrejaId]);
}

async function getSaldoConta(contaId, igrejaId) {
    const [[conta]] = await pool.query(
        `SELECT saldo_inicial FROM banco_contas WHERE id = ? AND igreja_id = ?`,
        [contaId, igrejaId]
    );
    if (!conta) return null;
    const [[totais]] = await pool.query(
        `SELECT
            COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE 0 END),0) AS total_entrada,
            COALESCE(SUM(CASE WHEN tipo='saida'   THEN valor ELSE 0 END),0) AS total_saida
         FROM banco_lancamentos WHERE conta_id = ? AND igreja_id = ?`,
        [contaId, igrejaId]
    );
    return Number(conta.saldo_inicial) + Number(totais.total_entrada) - Number(totais.total_saida);
}

module.exports = {
    listContas,
    getConta,
    createConta,
    updateConta,
    deleteConta,
    listLancamentos,
    createLancamento,
    deleteLancamento,
    getSaldoConta
};
