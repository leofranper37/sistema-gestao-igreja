const { pool } = require('../config/db');

async function listMembros(filters) {
    const where = ['igreja_id = ?'];
    const values = [filters.igrejaId];

    if (filters.nome) {
        where.push('nome LIKE ?');
        values.push(`%${filters.nome}%`);
    }

    if (filters.email) {
        where.push('email LIKE ?');
        values.push(`%${filters.email}%`);
    }

    if (filters.telefone) {
        where.push('(telefone LIKE ? OR celular LIKE ?)');
        values.push(`%${filters.telefone}%`, `%${filters.telefone}%`);
    }

    if (filters.cidade) {
        where.push('cidade LIKE ?');
        values.push(`%${filters.cidade}%`);
    }

    const [rows] = await pool.query(
        `SELECT
            id,
            nome,
            nome AS full_name,
            email,
            telefone,
            telefone AS phone,
            celular AS mobile_phone,
            cidade,
            cidade AS city,
            created_at
         FROM membros
         WHERE ${where.join(' AND ')}
         ORDER BY id DESC`,
        values
    );

    return rows;
}

async function listMembrosWithFilters(filters) {
    const where = ['igreja_id = ?'];
    const values = [filters.igrejaId];

    if (filters.nome) {
        where.push('nome LIKE ?');
        values.push(`%${filters.nome}%`);
    }

    if (filters.email) {
        where.push('email LIKE ?');
        values.push(`%${filters.email}%`);
    }

    if (filters.telefone) {
        where.push('(telefone LIKE ? OR celular LIKE ?)');
        values.push(`%${filters.telefone}%`, `%${filters.telefone}%`);
    }

    if (filters.cidade) {
        where.push('cidade LIKE ?');
        values.push(`%${filters.cidade}%`);
    }

    const sortByMap = {
        id: 'id',
        created_at: 'created_at',
        nome: 'nome',
        email: 'email',
        cidade: 'cidade'
    };

    const sortBy = sortByMap[filters.sortBy] || 'id';
    const sortOrder = String(filters.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM membros
         WHERE ${where.join(' AND ')}`,
        values
    );

    const total = Number(countRows[0]?.total || 0);
    const limit = Number(filters.limit || 50);
    const page = Number(filters.page || 1);
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
        `SELECT
            id,
            nome,
            nome AS full_name,
            email,
            telefone,
            telefone AS phone,
            celular AS mobile_phone,
            cidade,
            cidade AS city,
            created_at
         FROM membros
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

async function createMembro(payload) {
    await pool.query(
        `INSERT INTO membros (
            igreja_id,
            nome, email, telefone, apelido, nascimento, sexo, estado_civil, profissao,
            cep, endereco, numero, bairro, cidade, estado, celular, cpf, rg, nacionalidade, naturalidade
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.nome,
            payload.email,
            payload.telefone,
            payload.apelido,
            payload.nascimento,
            payload.sexo,
            payload.estadoCivil,
            payload.profissao,
            payload.cep,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.celular,
            payload.cpf,
            payload.rg,
            payload.nacionalidade,
            payload.naturalidade
        ]
    );
}

async function listVisitantes({ igrejaId, search }) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (search) {
        where.push('(full_name LIKE ? OR phone LIKE ? OR city LIKE ? OR congregation LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
        `SELECT
            id,
            full_name,
            phone,
            visit_date,
            observation,
            birth_date,
            gender,
            civil_status,
            address,
            number,
            neighborhood,
            city,
            state,
            zip_code,
            mobile_phone,
            email,
            congregation,
            accepted_jesus_at,
            return_at,
            created_at
         FROM visitantes
         WHERE ${where.join(' AND ')}
         ORDER BY visit_date DESC, id DESC`,
        values
    );

    return rows;
}

async function createVisitante(payload) {
    await pool.query(
        `INSERT INTO visitantes (
            full_name, phone, visit_date, observation, igreja_id,
            birth_date, gender, civil_status, address, number, neighborhood, city, state,
            zip_code, mobile_phone, email, congregation, accepted_jesus_at, return_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.nome,
            payload.telefone,
            payload.data,
            payload.observacao,
            payload.igrejaId,
            payload.nascimento,
            payload.sexo,
            payload.estadoCivil,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.cep,
            payload.celular,
            payload.email,
            payload.congregacao,
            payload.aceitouJesusEm,
            payload.retornoEm
        ]
    );
}

async function updateVisitante(payload) {
    const [result] = await pool.query(
        `UPDATE visitantes
         SET full_name = ?, phone = ?, visit_date = ?, observation = ?,
             birth_date = ?, gender = ?, civil_status = ?, address = ?, number = ?, neighborhood = ?,
             city = ?, state = ?, zip_code = ?, mobile_phone = ?, email = ?, congregation = ?,
             accepted_jesus_at = ?, return_at = ?
         WHERE id = ? AND igreja_id = ?`,
        [
            payload.nome,
            payload.telefone,
            payload.data,
            payload.observacao,
            payload.nascimento,
            payload.sexo,
            payload.estadoCivil,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.cep,
            payload.celular,
            payload.email,
            payload.congregacao,
            payload.aceitouJesusEm,
            payload.retornoEm,
            payload.id,
            payload.igrejaId
        ]
    );

    return result.affectedRows;
}

async function deleteVisitante({ id, igrejaId }) {
    const [result] = await pool.query('DELETE FROM visitantes WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
    return result.affectedRows;
}

async function listCongregados({ igrejaId, search }) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (search) {
        where.push('(nome LIKE ? OR telefone LIKE ? OR celular LIKE ? OR cidade LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
        `SELECT
            id,
            nome,
            nascimento,
            sexo,
            estado_civil,
            cpf,
            cep,
            endereco,
            numero,
            bairro,
            cidade,
            estado,
            telefone,
            celular,
            email,
            data_cadastro,
            obs,
            foto_url,
            created_at
         FROM congregados
         WHERE ${where.join(' AND ')}
         ORDER BY nome ASC`,
        values
    );

    return rows;
}

async function createCongregado(payload) {
    await pool.query(
        `INSERT INTO congregados (
            igreja_id, nome, nascimento, sexo, estado_civil, cpf, cep, endereco, numero,
            bairro, cidade, estado, telefone, celular, email, data_cadastro, obs, foto_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.nome,
            payload.nascimento,
            payload.sexo,
            payload.estadoCivil,
            payload.cpf,
            payload.cep,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.dataCadastro,
            payload.obs,
            payload.fotoUrl
        ]
    );
}

async function updateCongregado(payload) {
    const [result] = await pool.query(
        `UPDATE congregados
         SET nome = ?, nascimento = ?, sexo = ?, estado_civil = ?, cpf = ?, cep = ?, endereco = ?, numero = ?,
             bairro = ?, cidade = ?, estado = ?, telefone = ?, celular = ?, email = ?, data_cadastro = ?,
             obs = ?, foto_url = ?
         WHERE id = ? AND igreja_id = ?`,
        [
            payload.nome,
            payload.nascimento,
            payload.sexo,
            payload.estadoCivil,
            payload.cpf,
            payload.cep,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.cidade,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.dataCadastro,
            payload.obs,
            payload.fotoUrl,
            payload.id,
            payload.igrejaId
        ]
    );

    return result.affectedRows;
}

async function deleteCongregado({ id, igrejaId }) {
    const [result] = await pool.query('DELETE FROM congregados WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
    return result.affectedRows;
}

async function listCriancas({ igrejaId, search }) {
    const where = ['igreja_id = ?'];
    const values = [igrejaId];

    if (search) {
        where.push('(nome LIKE ? OR pai LIKE ? OR mae LIKE ? OR telefone LIKE ? OR cidade LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.query(
        `SELECT
            id,
            nome,
            nascimento,
            apresentacao,
            sexo,
            situacao,
            pai,
            mae,
            nome_pai,
            nome_mae,
            cep,
            endereco,
            numero,
            bairro,
            complemento,
            cidade,
            estado,
            telefone,
            celular,
            email,
            foto_url,
            created_at
         FROM criancas
         WHERE ${where.join(' AND ')}
         ORDER BY nome ASC`,
        values
    );

    return rows;
}

async function createCrianca(payload) {
    await pool.query(
        `INSERT INTO criancas (
            igreja_id, nome, nascimento, apresentacao, sexo, situacao, pai, mae, nome_pai, nome_mae,
            cep, endereco, numero, bairro, complemento, cidade, estado, telefone, celular, email, foto_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.nome,
            payload.nascimento,
            payload.apresentacao,
            payload.sexo,
            payload.situacao,
            payload.pai,
            payload.mae,
            payload.nomePai,
            payload.nomeMae,
            payload.cep,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.complemento,
            payload.cidade,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.fotoUrl
        ]
    );
}

async function updateCrianca(payload) {
    const [result] = await pool.query(
        `UPDATE criancas
         SET nome = ?, nascimento = ?, apresentacao = ?, sexo = ?, situacao = ?, pai = ?, mae = ?, nome_pai = ?,
             nome_mae = ?, cep = ?, endereco = ?, numero = ?, bairro = ?, complemento = ?, cidade = ?, estado = ?,
             telefone = ?, celular = ?, email = ?, foto_url = ?
         WHERE id = ? AND igreja_id = ?`,
        [
            payload.nome,
            payload.nascimento,
            payload.apresentacao,
            payload.sexo,
            payload.situacao,
            payload.pai,
            payload.mae,
            payload.nomePai,
            payload.nomeMae,
            payload.cep,
            payload.endereco,
            payload.numero,
            payload.bairro,
            payload.complemento,
            payload.cidade,
            payload.estado,
            payload.telefone,
            payload.celular,
            payload.email,
            payload.fotoUrl,
            payload.id,
            payload.igrejaId
        ]
    );

    return result.affectedRows;
}

async function deleteCrianca({ id, igrejaId }) {
    const [result] = await pool.query('DELETE FROM criancas WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
    return result.affectedRows;
}

async function listOracoesMy({ igrejaId, userId, status }) {
    const where = ['igreja_id = ?', 'user_id = ?'];
    const values = [igrejaId, userId];

    if (status) {
        where.push('status = ?');
        values.push(status);
    }

    const [rows] = await pool.query(
        `SELECT id, user_id, user_name, pedido, is_private, status, resposta, created_at, updated_at
         FROM oracoes_pedidos
         WHERE ${where.join(' AND ')}
         ORDER BY id DESC`,
        values
    );

    return rows;
}

async function listOracoesMural({ igrejaId }) {
    const [rows] = await pool.query(
        `SELECT id, user_name, pedido, status, resposta, created_at, updated_at
         FROM oracoes_pedidos
         WHERE igreja_id = ? AND is_private = 0
         ORDER BY id DESC`,
        [igrejaId]
    );

    return rows;
}

async function getOracaoById({ igrejaId, id }) {
    const [rows] = await pool.query(
        `SELECT id, igreja_id, user_id, user_name, pedido, is_private, status, resposta, created_at, updated_at
         FROM oracoes_pedidos
         WHERE igreja_id = ? AND id = ?
         LIMIT 1`,
        [igrejaId, id]
    );

    return rows[0] || null;
}

async function createOracao(payload) {
    await pool.query(
        `INSERT INTO oracoes_pedidos (igreja_id, user_id, user_name, pedido, is_private, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [payload.igrejaId, payload.userId, payload.userName, payload.pedido, payload.isPrivate, payload.status]
    );
}

async function updateOracao(payload) {
    const [result] = await pool.query(
        `UPDATE oracoes_pedidos
         SET pedido = ?, is_private = ?, status = ?
         WHERE id = ? AND igreja_id = ?`,
        [payload.pedido, payload.isPrivate, payload.status, payload.id, payload.igrejaId]
    );

    return result.affectedRows;
}

async function updateOracaoResposta(payload) {
    const [result] = await pool.query(
        `UPDATE oracoes_pedidos
         SET resposta = ?, status = ?
         WHERE id = ? AND igreja_id = ?`,
        [payload.resposta, payload.status, payload.id, payload.igrejaId]
    );

    return result.affectedRows;
}

async function deleteOracao({ id, igrejaId }) {
    const [result] = await pool.query('DELETE FROM oracoes_pedidos WHERE id = ? AND igreja_id = ?', [id, igrejaId]);
    return result.affectedRows;
}

async function countVisitantes(igrejaId) {
    const [[row]] = await pool.query('SELECT COUNT(*) AS total FROM visitantes WHERE igreja_id = ?', [igrejaId]);
    return row?.total || 0;
}

async function pingDatabase() {
    const [[row]] = await pool.query('SELECT 1 AS ok');
    return Number(row?.ok) === 1;
}

module.exports = {
    countVisitantes,
    createCrianca,
    createCongregado,
    createMembro,
    createOracao,
    createVisitante,
    deleteCrianca,
    deleteCongregado,
    deleteOracao,
    deleteVisitante,
    getOracaoById,
    listOracoesMural,
    listOracoesMy,
    listCriancas,
    listCongregados,
    pingDatabase,
    listMembrosWithFilters,
    listMembros,
    listVisitantes,
    updateCrianca,
    updateCongregado,
    updateOracao,
    updateOracaoResposta,
    updateVisitante
};