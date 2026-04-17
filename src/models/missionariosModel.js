const { pool } = require('../config/db');

async function listMissionarios({ igrejaId, termo }) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (termo) {
        where.push('(nome LIKE ? OR cidade LIKE ? OR pais LIKE ?)');
        values.push(`%${termo}%`, `%${termo}%`, `%${termo}%`);
    }

    const [rows] = await pool.query(
        `SELECT *
         FROM missionarios
         WHERE ${where.join(' AND ')}
         ORDER BY nome ASC
         LIMIT 400`,
        values
    );

    return rows;
}

async function getMissionarioById({ igrejaId, id }) {
    const [rows] = await pool.query(
        'SELECT * FROM missionarios WHERE igreja_id = ? AND id = ? LIMIT 1',
        [igrejaId, id]
    );

    return rows[0] || null;
}

async function createMissionario(payload) {
    const [result] = await pool.query(
        `INSERT INTO missionarios (
            igreja_id, nome, titulo, cep, endereco, bairro, cidade, estado, pais,
            telefone, telefone2, email, email2, banco, nome_agencia, agencia, tipo_conta, numero_conta,
            nome_contato, parentesco_contato, cep_contato, endereco_contato, bairro_contato, cidade_contato,
            estado_contato, pais_contato, telefone_contato, telefone2_contato, email_contato, obs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.nome,
            payload.titulo,
            payload.cep,
            payload.endereco,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.pais,
            payload.telefone,
            payload.telefone2,
            payload.email,
            payload.email2,
            payload.banco,
            payload.nomeAgencia,
            payload.agencia,
            payload.tipoConta,
            payload.numeroConta,
            payload.nomeContato,
            payload.parentescoContato,
            payload.cepContato,
            payload.enderecoContato,
            payload.bairroContato,
            payload.cidadeContato,
            payload.estadoContato,
            payload.paisContato,
            payload.telefoneContato,
            payload.telefone2Contato,
            payload.emailContato,
            payload.obs
        ]
    );

    return result.insertId;
}

async function updateMissionario({ igrejaId, id, payload }) {
    const [result] = await pool.query(
        `UPDATE missionarios
         SET nome = ?, titulo = ?, cep = ?, endereco = ?, bairro = ?, cidade = ?, estado = ?, pais = ?,
             telefone = ?, telefone2 = ?, email = ?, email2 = ?, banco = ?, nome_agencia = ?, agencia = ?,
             tipo_conta = ?, numero_conta = ?, nome_contato = ?, parentesco_contato = ?, cep_contato = ?,
             endereco_contato = ?, bairro_contato = ?, cidade_contato = ?, estado_contato = ?, pais_contato = ?,
             telefone_contato = ?, telefone2_contato = ?, email_contato = ?, obs = ?
         WHERE igreja_id = ? AND id = ?`,
        [
            payload.nome,
            payload.titulo,
            payload.cep,
            payload.endereco,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.pais,
            payload.telefone,
            payload.telefone2,
            payload.email,
            payload.email2,
            payload.banco,
            payload.nomeAgencia,
            payload.agencia,
            payload.tipoConta,
            payload.numeroConta,
            payload.nomeContato,
            payload.parentescoContato,
            payload.cepContato,
            payload.enderecoContato,
            payload.bairroContato,
            payload.cidadeContato,
            payload.estadoContato,
            payload.paisContato,
            payload.telefoneContato,
            payload.telefone2Contato,
            payload.emailContato,
            payload.obs,
            igrejaId,
            id
        ]
    );

    return result.affectedRows;
}

async function deleteMissionario({ igrejaId, id }) {
    const [result] = await pool.query(
        'DELETE FROM missionarios WHERE igreja_id = ? AND id = ?',
        [igrejaId, id]
    );

    return result.affectedRows;
}

module.exports = {
    createMissionario,
    deleteMissionario,
    getMissionarioById,
    listMissionarios,
    updateMissionario
};
