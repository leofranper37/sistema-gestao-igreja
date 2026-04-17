const { pool } = require('../config/db');

async function listWhatsAppTemplates(igrejaId) {
    const [rows] = await pool.query(
        `SELECT id, igreja_id, nome, gatilho, conteudo, ativo, created_at, updated_at
         FROM whatsapp_templates
         WHERE igreja_id = ?
         ORDER BY nome ASC`,
        [igrejaId]
    );

    return rows;
}

async function getWhatsAppTemplateByTrigger(igrejaId, gatilho) {
    const [rows] = await pool.query(
        `SELECT id, igreja_id, nome, gatilho, conteudo, ativo
         FROM whatsapp_templates
         WHERE igreja_id = ? AND gatilho = ? AND ativo = 1
         ORDER BY id DESC
         LIMIT 1`,
        [igrejaId, gatilho]
    );

    return rows[0] || null;
}

async function createWhatsAppTemplate(payload) {
    const [result] = await pool.query(
        `INSERT INTO whatsapp_templates (igreja_id, nome, gatilho, conteudo, ativo)
         VALUES (?, ?, ?, ?, ?)`,
        [payload.igrejaId, payload.nome, payload.gatilho, payload.conteudo, payload.ativo ? 1 : 0]
    );

    return result.insertId;
}

async function updateWhatsAppTemplate(id, igrejaId, payload) {
    await pool.query(
        `UPDATE whatsapp_templates
         SET nome = ?, gatilho = ?, conteudo = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND igreja_id = ?`,
        [payload.nome, payload.gatilho, payload.conteudo, payload.ativo ? 1 : 0, id, igrejaId]
    );
}

async function createWhatsAppLog(payload) {
    const [result] = await pool.query(
        `INSERT INTO whatsapp_logs (
            igreja_id, template_id, gatilho, destino, mensagem_renderizada,
            payload_json, status, provider_message_id, erro, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.templateId || null,
            payload.gatilho,
            payload.destino,
            payload.mensagem,
            JSON.stringify(payload.payload || {}),
            payload.status,
            payload.providerMessageId || null,
            payload.erro || null,
            payload.createdBy || null
        ]
    );

    return result.insertId;
}

async function listWhatsAppLogs(igrejaId, limit = 50) {
    const [rows] = await pool.query(
        `SELECT id, template_id, gatilho, destino, mensagem_renderizada,
                status, provider_message_id, erro, created_by, created_at
         FROM whatsapp_logs
         WHERE igreja_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [igrejaId, Number(limit) || 50]
    );

    return rows;
}

async function createAutocadastro(payload) {
    const [result] = await pool.query(
        `INSERT INTO autocadastros (
            igreja_id, igreja_nome, nome, email, telefone, cidade, ministerio_interesse, observacao
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.igrejaNome,
            payload.nome,
            payload.email || null,
            payload.telefone || null,
            payload.cidade || null,
            payload.ministerioInteresse || null,
            payload.observacao || null
        ]
    );

    return result.insertId;
}

async function listAutocadastros(igrejaId, status) {
    const values = [igrejaId];
    let sql = `
        SELECT id, igreja_id, igreja_nome, nome, email, telefone, cidade,
               ministerio_interesse, status, observacao, analisado_por, analisado_em, created_at
        FROM autocadastros
        WHERE igreja_id = ?
    `;

    if (status) {
        sql += ' AND status = ?';
        values.push(status);
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, values);
    return rows;
}

async function getAutocadastroById(id, igrejaId) {
    const [rows] = await pool.query(
        `SELECT id, igreja_id, igreja_nome, nome, email, telefone, cidade,
                ministerio_interesse, status, observacao, created_at
         FROM autocadastros
         WHERE id = ? AND igreja_id = ?
         LIMIT 1`,
        [id, igrejaId]
    );

    return rows[0] || null;
}

async function updateAutocadastroStatus(id, igrejaId, status, analisadoPor, observacao) {
    await pool.query(
        `UPDATE autocadastros
         SET status = ?, analisado_por = ?, analisado_em = CURRENT_TIMESTAMP, observacao = COALESCE(?, observacao)
         WHERE id = ? AND igreja_id = ?`,
        [status, analisadoPor, observacao || null, id, igrejaId]
    );
}

async function createMemberFromAutocadastro(payload) {
    const [result] = await pool.query(
        `INSERT INTO membros (igreja_id, nome, email, telefone, cidade)
         VALUES (?, ?, ?, ?, ?)`,
        [payload.igrejaId, payload.nome, payload.email || null, payload.telefone || null, payload.cidade || null]
    );

    return result.insertId;
}

async function findUserByEmailAndChurch(email, igrejaId) {
    const [rows] = await pool.query(
        `SELECT id, email
         FROM users
         WHERE email = ? AND igreja_id = ?
         LIMIT 1`,
        [email, igrejaId]
    );

    return rows[0] || null;
}

async function createMemberUser(payload) {
    const [result] = await pool.query(
        `INSERT INTO users (igreja, igreja_id, nome, email, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'membro')`,
        [payload.igrejaNome, payload.igrejaId, payload.nome, payload.email, payload.passwordHash]
    );

    return result.insertId;
}

async function createPortariaCheckin(payload) {
    const [result] = await pool.query(
        `INSERT INTO portaria_checkins (
            igreja_id, visitante_id, nome_visitante, telefone, evento, origem, codigo_qr, status, checked_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.visitanteId || null,
            payload.nomeVisitante,
            payload.telefone || null,
            payload.evento || null,
            payload.origem || 'manual',
            payload.codigoQr || null,
            payload.status || 'entrada',
            payload.checkedBy || null
        ]
    );

    return result.insertId;
}

async function listPortariaCheckins(igrejaId, dateRef) {
    const [rows] = await pool.query(
        `SELECT id, visitante_id, nome_visitante, telefone, evento, origem, codigo_qr, status, checked_by, created_at
         FROM portaria_checkins
         WHERE igreja_id = ? AND DATE(created_at) = ?
         ORDER BY id DESC`,
        [igrejaId, dateRef]
    );

    return rows;
}

async function createPaymentLink(payload) {
    const [result] = await pool.query(
        `INSERT INTO payment_links (
            igreja_id, descricao, valor, provider, status, reference_code, url, created_by
         ) VALUES (?, ?, ?, ?, 'pendente', ?, ?, ?)`,
        [
            payload.igrejaId,
            payload.descricao,
            payload.valor,
            payload.provider,
            payload.referenceCode,
            payload.url,
            payload.createdBy || null
        ]
    );

    return result.insertId;
}

async function listPaymentLinks(igrejaId) {
    const [rows] = await pool.query(
        `SELECT id, descricao, valor, provider, status, reference_code, url, paid_at, created_at
         FROM payment_links
         WHERE igreja_id = ?
         ORDER BY id DESC`,
        [igrejaId]
    );

    return rows;
}

async function markPaymentAsPaid(id, igrejaId) {
    await pool.query(
        `UPDATE payment_links
         SET status = 'pago', paid_at = CURRENT_TIMESTAMP
         WHERE id = ? AND igreja_id = ?`,
        [id, igrejaId]
    );
}

async function createQrSession(payload) {
    const [result] = await pool.query(
        `INSERT INTO portaria_qr_sessoes (
            igreja_id, evento, token, expira_em, ativo, created_by
         ) VALUES (?, ?, ?, ?, 1, ?)`,
        [
            payload.igrejaId,
            payload.evento,
            payload.token,
            payload.expiraEm || null,
            payload.createdBy || null
        ]
    );

    return result.insertId;
}

async function getQrSessionByToken(token) {
    const [rows] = await pool.query(
        `SELECT id, igreja_id, evento, token, expira_em, ativo, created_at
         FROM portaria_qr_sessoes
         WHERE token = ?
         LIMIT 1`,
        [token]
    );

    return rows[0] || null;
}

async function createPublicVisitor(payload) {
    const [result] = await pool.query(
        `INSERT INTO visitantes_publicos (
            igreja_id, qr_sessao_id, evento, nome, telefone, email, cidade,
            pedido_oracao, autoriza_telao, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo')`,
        [
            payload.igrejaId,
            payload.qrSessaoId,
            payload.evento,
            payload.nome,
            payload.telefone || null,
            payload.email || null,
            payload.cidade || null,
            payload.pedidoOracao || null,
            payload.autorizaTelao ? 1 : 0
        ]
    );

    return result.insertId;
}

async function listMidiaVisitors(igrejaId, status) {
    const values = [igrejaId];
    let sql = `
        SELECT id, evento, nome, telefone, email, cidade, pedido_oracao,
               autoriza_telao, status, exibido_por, exibido_em, created_at
        FROM visitantes_publicos
        WHERE igreja_id = ? AND autoriza_telao = 1
    `;

    if (status) {
        sql += ' AND status = ?';
        values.push(status);
    }

    sql += ' ORDER BY id DESC';

    const [rows] = await pool.query(sql, values);
    return rows;
}

async function updateMidiaVisitorStatus(id, igrejaId, status, userId) {
    const shouldSetExibido = status === 'exibido';
    await pool.query(
        `UPDATE visitantes_publicos
         SET status = ?,
             exibido_por = ?,
             exibido_em = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE exibido_em END
         WHERE id = ? AND igreja_id = ?`,
        [status, userId || null, shouldSetExibido ? 1 : 0, id, igrejaId]
    );
}

async function listVisitorsForTelao(igrejaId) {
    const [rows] = await pool.query(
        `SELECT id, evento, nome, cidade, pedido_oracao, created_at
         FROM visitantes_publicos
         WHERE igreja_id = ? AND autoriza_telao = 1 AND status = 'selecionado'
         ORDER BY id DESC
         LIMIT 20`,
        [igrejaId]
    );

    return rows;
}

module.exports = {
    createAutocadastro,
    createMemberFromAutocadastro,
    createMemberUser,
    createPaymentLink,
    createPortariaCheckin,
    createWhatsAppLog,
    createWhatsAppTemplate,
    findUserByEmailAndChurch,
    getAutocadastroById,
    getWhatsAppTemplateByTrigger,
    listAutocadastros,
    listMidiaVisitors,
    listPaymentLinks,
    listPortariaCheckins,
    listVisitorsForTelao,
    listWhatsAppLogs,
    listWhatsAppTemplates,
    markPaymentAsPaid,
    createQrSession,
    createPublicVisitor,
    getQrSessionByToken,
    updateMidiaVisitorStatus,
    updateAutocadastroStatus,
    updateWhatsAppTemplate
};
