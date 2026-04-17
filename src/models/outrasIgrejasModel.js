const { pool } = require('../config/db');

async function listOutrasIgrejas({ igrejaId, termo }) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (termo) {
        where.push('(nome LIKE ? OR cidade LIKE ? OR responsavel LIKE ?)');
        values.push(`%${termo}%`, `%${termo}%`, `%${termo}%`);
    }

    const [rows] = await pool.query(
        `SELECT id, nome, sede, endereco, bairro, cidade, cep, estado, telefone, celular, email,
                responsavel, cargo, nascimento, declaracao, created_at, updated_at
         FROM outras_igrejas
         WHERE ${where.join(' AND ')}
         ORDER BY nome ASC
         LIMIT 300`,
        values
    );

    return rows;
}

async function getOutrasIgrejaById({ igrejaId, id }) {
    const [rows] = await pool.query(
        `SELECT id, nome, sede, endereco, bairro, cidade, cep, estado, telefone, celular, email,
                responsavel, cargo, nascimento, declaracao, created_at, updated_at
         FROM outras_igrejas
         WHERE igreja_id = ? AND id = ?
         LIMIT 1`,
        [igrejaId, id]
    );

    return rows[0] || null;
}

async function createOutrasIgreja(payload) {
    const [result] = await pool.query(
        `INSERT INTO outras_igrejas (
            igreja_id, nome, sede, endereco, bairro, cidade, cep, estado,
            telefone, celular, email, responsavel, cargo, nascimento, declaracao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.nome,
            payload.sede,
            payload.endereco,
            payload.bairro,
            payload.cidade,
            payload.cep,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.responsavel,
            payload.cargo,
            payload.nascimento,
            payload.declaracao
        ]
    );

    return result.insertId;
}

async function updateOutrasIgreja({ igrejaId, id, payload }) {
    const [result] = await pool.query(
        `UPDATE outras_igrejas
         SET nome = ?, sede = ?, endereco = ?, bairro = ?, cidade = ?, cep = ?, estado = ?,
             telefone = ?, celular = ?, email = ?, responsavel = ?, cargo = ?, nascimento = ?, declaracao = ?
         WHERE igreja_id = ? AND id = ?`,
        [
            payload.nome,
            payload.sede,
            payload.endereco,
            payload.bairro,
            payload.cidade,
            payload.cep,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.responsavel,
            payload.cargo,
            payload.nascimento,
            payload.declaracao,
            igrejaId,
            id
        ]
    );

    return result.affectedRows;
}

async function deleteOutrasIgreja({ igrejaId, id }) {
    const [result] = await pool.query(
        'DELETE FROM outras_igrejas WHERE igreja_id = ? AND id = ?',
        [igrejaId, id]
    );

    return result.affectedRows;
}

module.exports = {
    createOutrasIgreja,
    deleteOutrasIgreja,
    getOutrasIgrejaById,
    listOutrasIgrejas,
    updateOutrasIgreja
};
