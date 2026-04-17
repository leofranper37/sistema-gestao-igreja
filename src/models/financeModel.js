const { pool } = require('../config/db');

async function getLatestSaldoInicial(igrejaId) {
    const [[row]] = await pool.query(
        'SELECT saldo_inicial, competencia FROM caixa_saldo_inicial WHERE igreja_id = ? ORDER BY competencia DESC LIMIT 1',
        [igrejaId]
    );

    return row || null;
}

async function getTotais(igrejaId) {
    const [[row]] = await pool.query(
        `SELECT
            COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE 0 END), 0) AS total_entradas,
            COALESCE(SUM(CASE WHEN type = 'saida' THEN amount ELSE 0 END), 0) AS total_saidas
         FROM transacoes
         WHERE igreja_id = ?`,
        [igrejaId]
    );

    return row;
}

async function listTransacoes(igrejaId) {
    const [rows] = await pool.query(
        'SELECT * FROM transacoes WHERE igreja_id = ? ORDER BY id DESC LIMIT 200',
        [igrejaId]
    );

    return rows;
}

async function listTransacoesWithFilters(filters) {
    const where = ['igreja_id = ?'];
    const values = [filters.igrejaId];

    if (filters.tipo) {
        where.push('type = ?');
        values.push(filters.tipo);
    }

    if (filters.descricao) {
        where.push('description LIKE ?');
        values.push(`%${filters.descricao}%`);
    }

    if (filters.startDate) {
        where.push('DATE(created_at) >= ?');
        values.push(filters.startDate);
    }

    if (filters.endDate) {
        where.push('DATE(created_at) <= ?');
        values.push(filters.endDate);
    }

    const sortByMap = {
        id: 'id',
        created_at: 'created_at',
        amount: 'amount',
        description: 'description',
        type: 'type'
    };

    const sortBy = sortByMap[filters.sortBy] || 'id';
    const sortOrder = String(filters.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM transacoes
         WHERE ${where.join(' AND ')}`,
        values
    );

    const total = Number(countRows[0]?.total || 0);
    const limit = Number(filters.limit || 200);
    const page = Number(filters.page || 1);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
        `SELECT *
         FROM transacoes
         WHERE ${where.join(' AND ')}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return {
        items: rows,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit))
        }
    };
}

async function createTransacao(payload) {
    await pool.query(
        'INSERT INTO transacoes (description, type, amount, igreja_id) VALUES (?, ?, ?, ?)',
        [payload.descricao, payload.tipo, payload.amount, payload.igrejaId]
    );
}

async function findSaldoInicialByCompetencia(igrejaId, competencia) {
    const [rows] = await pool.query(
        'SELECT id FROM caixa_saldo_inicial WHERE igreja_id = ? AND competencia = ? LIMIT 1',
        [igrejaId, competencia]
    );

    return rows[0] || null;
}

async function updateSaldoInicialById(id, saldoInicial) {
    await pool.query('UPDATE caixa_saldo_inicial SET saldo_inicial = ? WHERE id = ?', [saldoInicial, id]);
}

async function createSaldoInicial(payload) {
    await pool.query(
        'INSERT INTO caixa_saldo_inicial (competencia, saldo_inicial, igreja_id) VALUES (?, ?, ?)',
        [payload.competencia, payload.saldoInicial, payload.igrejaId]
    );
}

// ─── Dízimos ────────────────────────────────────────────────────────────────

async function listDizimos(filters) {
    const where = ['igreja_id = ?'];
    const values = [filters.igrejaId];

    if (filters.competencia) {
        where.push('competencia = ?');
        values.push(filters.competencia);
    }

    if (filters.tipo) {
        where.push('tipo = ?');
        values.push(filters.tipo);
    }

    if (filters.membroNome) {
        where.push('membro_nome LIKE ?');
        values.push(`%${filters.membroNome}%`);
    }

    const limit = Math.min(Number(filters.limit || 100), 500);
    const page = Math.max(Number(filters.page || 1), 1);
    const offset = (page - 1) * limit;

    const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM dizimos WHERE ${where.join(' AND ')}`,
        values
    );

    const [rows] = await pool.query(
        `SELECT * FROM dizimos WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return {
        items: rows,
        meta: { page, limit, total: Number(countRow.total), totalPages: Math.max(1, Math.ceil(countRow.total / limit)) }
    };
}

async function getTotaisDizimos(igrejaId, competencia) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (competencia) {
        where.push('competencia = ?');
        values.push(competencia);
    }

    const [[row]] = await pool.query(
        `SELECT
            COALESCE(SUM(valor), 0) AS total_geral,
            COALESCE(SUM(CASE WHEN tipo = 'dizimo' THEN valor ELSE 0 END), 0) AS total_dizimos,
            COALESCE(SUM(CASE WHEN tipo = 'oferta' THEN valor ELSE 0 END), 0) AS total_ofertas,
            COALESCE(SUM(CASE WHEN tipo = 'missoes' THEN valor ELSE 0 END), 0) AS total_missoes,
            COALESCE(SUM(CASE WHEN tipo = 'outros' THEN valor ELSE 0 END), 0) AS total_outros,
            COUNT(*) AS total_lancamentos
         FROM dizimos
         WHERE ${where.join(' AND ')}`,
        values
    );

    return row;
}

async function createDizimo(payload) {
    const [result] = await pool.query(
        `INSERT INTO dizimos (igreja_id, membro_id, membro_nome, valor, competencia, tipo, observacao, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.membroId || null,
            payload.membroNome,
            payload.valor,
            payload.competencia,
            payload.tipo || 'dizimo',
            payload.observacao || null,
            payload.createdBy || null
        ]
    );

    return result.insertId;
}

async function deleteDizimo(id, igrejaId) {
    await pool.query('DELETE FROM dizimos WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
}

module.exports = {
    createSaldoInicial,
    createTransacao,
    findSaldoInicialByCompetencia,
    getLatestSaldoInicial,
    getTotais,
    listTransacoesWithFilters,
    listTransacoes,
    updateSaldoInicialById,
    createDizimo,
    deleteDizimo,
    getTotaisDizimos,
    listDizimos
};