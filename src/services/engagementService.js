const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const config = require('../config');
const { getRoleInfo, getVisibleFeatures } = require('../config/roles');
const engagementModel = require('../models/engagementModel');

const DEFAULT_TEMPLATES = [
    {
        nome: 'Boas-vindas Visitante',
        gatilho: 'visitante_boas_vindas',
        conteudo: 'Ola {{nome}}, seja muito bem-vindo(a)! Estamos felizes com sua visita.',
        ativo: true
    },
    {
        nome: 'Lembrete de Evento',
        gatilho: 'evento_lembrete',
        conteudo: 'Ola {{nome}}, lembramos do evento {{evento}} em {{data}}. Esperamos voce!',
        ativo: true
    },
    {
        nome: 'Resposta de Oracao',
        gatilho: 'oracao_resposta',
        conteudo: 'Ola {{nome}}, seu pedido de oracao recebeu uma resposta: {{resposta}}',
        ativo: true
    }
];

function normalizeText(text) {
    return String(text || '').trim();
}

function renderTemplate(content, variables = {}) {
    return String(content || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
        const value = variables[key];
        return value === undefined || value === null ? '' : String(value);
    });
}

function buildMockProviderId() {
    return `wa_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function buildPaymentReference() {
    return `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function buildQrToken() {
    return `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function formatDateToYmd(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function ensureDefaultTemplates(igrejaId) {
    const current = await engagementModel.listWhatsAppTemplates(igrejaId);
    if (current.length) {
        return current;
    }

    for (const tpl of DEFAULT_TEMPLATES) {
        await engagementModel.createWhatsAppTemplate({ igrejaId, ...tpl });
    }

    return engagementModel.listWhatsAppTemplates(igrejaId);
}

async function listTemplates(igrejaId) {
    return ensureDefaultTemplates(igrejaId);
}

async function createTemplate(igrejaId, payload) {
    return engagementModel.createWhatsAppTemplate({
        igrejaId,
        nome: normalizeText(payload.nome),
        gatilho: normalizeText(payload.gatilho),
        conteudo: normalizeText(payload.conteudo),
        ativo: Boolean(payload.ativo)
    });
}

async function updateTemplate(igrejaId, id, payload) {
    await engagementModel.updateWhatsAppTemplate(id, igrejaId, {
        nome: normalizeText(payload.nome),
        gatilho: normalizeText(payload.gatilho),
        conteudo: normalizeText(payload.conteudo),
        ativo: Boolean(payload.ativo)
    });
}

async function dispatchWhatsApp(igrejaId, payload, userId) {
    const template = await engagementModel.getWhatsAppTemplateByTrigger(igrejaId, payload.gatilho);

    const baseMessage = template ? template.conteudo : payload.mensagem;
    const rendered = renderTemplate(baseMessage, payload.variaveis || {});

    const provider = process.env.WHATSAPP_PROVIDER || 'mock';
    const providerMessageId = buildMockProviderId();

    // Nesta versao, o envio real para provedores externos e mockado para nao quebrar operacao atual.
    const logId = await engagementModel.createWhatsAppLog({
        igrejaId,
        templateId: template?.id,
        gatilho: payload.gatilho,
        destino: payload.destino,
        mensagem: rendered,
        payload: payload.variaveis || {},
        status: 'enviado',
        providerMessageId,
        createdBy: userId
    });

    return {
        id: logId,
        provider,
        providerMessageId,
        template: template ? { id: template.id, nome: template.nome } : null,
        destino: payload.destino,
        mensagem: rendered,
        status: 'enviado'
    };
}

async function listWhatsAppLogs(igrejaId, limit) {
    return engagementModel.listWhatsAppLogs(igrejaId, limit);
}

async function createAutocadastro(payload) {
    return engagementModel.createAutocadastro({
        igrejaId: Number(payload.igrejaId) || 1,
        igrejaNome: normalizeText(payload.igrejaNome) || 'Igreja Padrão',
        nome: normalizeText(payload.nome),
        email: normalizeText(payload.email) || null,
        telefone: normalizeText(payload.telefone) || null,
        cidade: normalizeText(payload.cidade) || null,
        ministerioInteresse: normalizeText(payload.ministerioInteresse) || null,
        observacao: normalizeText(payload.observacao) || null
    });
}

async function listAutocadastros(igrejaId, status) {
    return engagementModel.listAutocadastros(igrejaId, status);
}

async function approveAutocadastro(igrejaId, id, payload, reviewer) {
    const item = await engagementModel.getAutocadastroById(id, igrejaId);
    if (!item) {
        return null;
    }

    await engagementModel.createMemberFromAutocadastro({
        igrejaId,
        nome: item.nome,
        email: item.email,
        telefone: item.telefone,
        cidade: item.cidade
    });

    let accessUser = null;

    if (payload.criarAcesso && item.email) {
        const exists = await engagementModel.findUserByEmailAndChurch(item.email, igrejaId);

        if (!exists) {
            const plainPassword = normalizeText(payload.senhaTemp) || `Igreja@${String(Date.now()).slice(-6)}`;
            const passwordHash = await bcrypt.hash(plainPassword, config.security.passwordSaltRounds);

            const userId = await engagementModel.createMemberUser({
                igrejaNome: item.igreja_nome || 'Igreja Padrão',
                igrejaId,
                nome: item.nome,
                email: item.email,
                passwordHash
            });

            accessUser = {
                id: userId,
                email: item.email,
                senhaTemp: plainPassword
            };
        }
    }

    await engagementModel.updateAutocadastroStatus(id, igrejaId, 'aprovado', reviewer, payload.observacao || null);

    return {
        id,
        status: 'aprovado',
        accessUser
    };
}

async function rejectAutocadastro(igrejaId, id, payload, reviewer) {
    const item = await engagementModel.getAutocadastroById(id, igrejaId);
    if (!item) {
        return null;
    }

    await engagementModel.updateAutocadastroStatus(id, igrejaId, 'rejeitado', reviewer, payload.observacao || null);
    return { id, status: 'rejeitado' };
}

async function createPortariaCheckin(igrejaId, payload, userId) {
    const code = normalizeText(payload.codigoQr) || `CHK-${Date.now()}`;

    const id = await engagementModel.createPortariaCheckin({
        igrejaId,
        visitanteId: payload.visitanteId,
        nomeVisitante: normalizeText(payload.nomeVisitante),
        telefone: normalizeText(payload.telefone) || null,
        evento: normalizeText(payload.evento) || null,
        origem: normalizeText(payload.origem) || 'manual',
        codigoQr: code,
        status: normalizeText(payload.status) || 'entrada',
        checkedBy: userId
    });

    return { id, codigoQr: code };
}

async function listPortariaCheckins(igrejaId, dateRef) {
    const safeDate = normalizeText(dateRef) || formatDateToYmd();
    return engagementModel.listPortariaCheckins(igrejaId, safeDate);
}

async function createPaymentLink(igrejaId, payload, userId) {
    const referenceCode = buildPaymentReference();
    const provider = normalizeText(payload.provider) || 'mock_pix';
    const baseUrl = process.env.PAYMENT_BASE_URL || 'https://pagamento.exemplo.local';
    const url = `${baseUrl}/p/${referenceCode}`;

    const id = await engagementModel.createPaymentLink({
        igrejaId,
        descricao: normalizeText(payload.descricao),
        valor: Number(payload.valor),
        provider,
        referenceCode,
        url,
        createdBy: userId
    });

    return { id, referenceCode, url, provider };
}

async function listPaymentLinks(igrejaId) {
    return engagementModel.listPaymentLinks(igrejaId);
}

async function markPaymentAsPaid(igrejaId, id) {
    await engagementModel.markPaymentAsPaid(id, igrejaId);
}

async function createQrSession(igrejaId, payload, userId) {
    const token = buildQrToken();
    const eventName = normalizeText(payload.evento) || 'Evento';
    const expiraEm = normalizeText(payload.expiraEm) || null;

    const id = await engagementModel.createQrSession({
        igrejaId,
        evento: eventName,
        token,
        expiraEm,
        createdBy: userId
    });

    const appBaseUrl = process.env.APP_PUBLIC_BASE_URL || 'http://localhost:3001';
    const publicUrl = `${appBaseUrl}/visitante_qr.html?token=${encodeURIComponent(token)}`;

    return { id, token, publicUrl, evento: eventName, expiraEm };
}

async function getQrSessionPublic(token) {
    const session = await engagementModel.getQrSessionByToken(normalizeText(token));
    if (!session || Number(session.ativo) !== 1) {
        return null;
    }

    if (session.expira_em && new Date(session.expira_em).getTime() < Date.now()) {
        return null;
    }

    return {
        id: session.id,
        evento: session.evento,
        createdAt: session.created_at
    };
}

async function submitPublicVisitorByToken(token, payload) {
    const session = await engagementModel.getQrSessionByToken(normalizeText(token));
    if (!session || Number(session.ativo) !== 1) {
        return null;
    }

    if (session.expira_em && new Date(session.expira_em).getTime() < Date.now()) {
        return null;
    }

    const id = await engagementModel.createPublicVisitor({
        igrejaId: session.igreja_id,
        qrSessaoId: session.id,
        evento: session.evento,
        nome: normalizeText(payload.nome),
        telefone: normalizeText(payload.telefone) || null,
        email: normalizeText(payload.email) || null,
        cidade: normalizeText(payload.cidade) || null,
        pedidoOracao: normalizeText(payload.pedidoOracao) || null,
        autorizaTelao: Boolean(payload.autorizaTelao)
    });

    return {
        id,
        igrejaId: session.igreja_id,
        evento: session.evento,
        autorizaTelao: Boolean(payload.autorizaTelao)
    };
}

async function listMidiaVisitors(igrejaId, status) {
    return engagementModel.listMidiaVisitors(igrejaId, status);
}

async function updateMidiaVisitorStatus(igrejaId, id, status, userId) {
    await engagementModel.updateMidiaVisitorStatus(id, igrejaId, normalizeText(status), userId);
}

async function listTelaoVisitors(igrejaId) {
    return engagementModel.listVisitorsForTelao(igrejaId);
}

async function getMemberAppContext(igrejaId, auth) {
    const [templates, logs, checkins, payments] = await Promise.all([
        engagementModel.listWhatsAppTemplates(igrejaId),
        engagementModel.listWhatsAppLogs(igrejaId, 5),
        engagementModel.listPortariaCheckins(igrejaId, formatDateToYmd()),
        engagementModel.listPaymentLinks(igrejaId)
    ]);

    return {
        user: {
            id: auth.id,
            nome: auth.nome,
            email: auth.email,
            role: auth.role,
            igrejaId: auth.igrejaId,
            roleInfo: getRoleInfo(auth.role),
            features: getVisibleFeatures(auth.role)
        },
        quickStats: {
            templatesAtivos: templates.filter((item) => Number(item.ativo) === 1).length,
            enviosHoje: logs.length,
            checkinsHoje: checkins.length,
            pagamentosPendentes: payments.filter((item) => item.status === 'pendente').length
        },
        recent: {
            whatsapp: logs,
            checkins: checkins.slice(0, 5),
            payments: payments.slice(0, 5)
        }
    };
}

function getMemberPermissions(role) {
    return {
        role,
        roleInfo: getRoleInfo(role),
        features: getVisibleFeatures(role)
    };
}

module.exports = {
    approveAutocadastro,
    createAutocadastro,
    createPaymentLink,
    createPortariaCheckin,
    createQrSession,
    createTemplate,
    dispatchWhatsApp,
    getMemberPermissions,
    getQrSessionPublic,
    getMemberAppContext,
    listAutocadastros,
    listMidiaVisitors,
    listPaymentLinks,
    listPortariaCheckins,
    listTelaoVisitors,
    listTemplates,
    listWhatsAppLogs,
    markPaymentAsPaid,
    rejectAutocadastro,
    submitPublicVisitorByToken,
    updateMidiaVisitorStatus,
    updateTemplate
};
