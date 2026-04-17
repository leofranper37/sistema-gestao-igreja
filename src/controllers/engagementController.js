const { createHttpError } = require('../utils/httpError');
const { audit } = require('../services/auditService');
const engagementService = require('../services/engagementService');
const realtime = require('../services/realtimeService');

async function listWhatsAppTemplates(req, res) {
    const templates = await engagementService.listTemplates(req.auth.igrejaId);
    res.json(templates);
}

async function createWhatsAppTemplate(req, res) {
    const id = await engagementService.createTemplate(req.auth.igrejaId, req.validatedBody);
    audit('whatsapp.template.create', req, { id, gatilho: req.validatedBody.gatilho });
    res.status(201).json({ id, message: 'Template criado com sucesso.' });
}

async function updateWhatsAppTemplate(req, res) {
    await engagementService.updateTemplate(req.auth.igrejaId, Number(req.params.id), req.validatedBody);
    audit('whatsapp.template.update', req, { id: Number(req.params.id) });
    res.json({ message: 'Template atualizado com sucesso.' });
}

async function listWhatsAppLogs(req, res) {
    const logs = await engagementService.listWhatsAppLogs(req.auth.igrejaId, req.validatedQuery.limit);
    res.json(logs);
}

async function dispatchWhatsApp(req, res) {
    const result = await engagementService.dispatchWhatsApp(req.auth.igrejaId, req.validatedBody, req.auth.id);
    audit('whatsapp.dispatch', req, { gatilho: req.validatedBody.gatilho, destino: req.validatedBody.destino });
    res.status(201).json(result);
}

async function triggerVisitanteBoasVindas(req, res) {
    const body = req.validatedBody;
    const result = await engagementService.dispatchWhatsApp(req.auth.igrejaId, {
        gatilho: 'visitante_boas_vindas',
        destino: body.destino,
        variaveis: {
            nome: body.nome
        }
    }, req.auth.id);

    audit('whatsapp.trigger.visitante_boas_vindas', req, { destino: body.destino });
    res.status(201).json(result);
}

async function triggerEventoLembrete(req, res) {
    const body = req.validatedBody;
    const result = await engagementService.dispatchWhatsApp(req.auth.igrejaId, {
        gatilho: 'evento_lembrete',
        destino: body.destino,
        variaveis: {
            nome: body.nome,
            evento: body.evento,
            data: body.data
        }
    }, req.auth.id);

    audit('whatsapp.trigger.evento_lembrete', req, { destino: body.destino, evento: body.evento });
    res.status(201).json(result);
}

async function triggerOracaoResposta(req, res) {
    const body = req.validatedBody;
    const result = await engagementService.dispatchWhatsApp(req.auth.igrejaId, {
        gatilho: 'oracao_resposta',
        destino: body.destino,
        variaveis: {
            nome: body.nome,
            resposta: body.resposta
        }
    }, req.auth.id);

    audit('whatsapp.trigger.oracao_resposta', req, { destino: body.destino });
    res.status(201).json(result);
}

async function createAutocadastro(req, res) {
    const id = await engagementService.createAutocadastro(req.validatedBody);
    res.status(201).json({
        id,
        message: 'Seu cadastro foi recebido e está aguardando aprovação da secretaria.'
    });
}

async function listAutocadastros(req, res) {
    const items = await engagementService.listAutocadastros(req.auth.igrejaId, req.validatedQuery.status);
    res.json(items);
}

async function approveAutocadastro(req, res) {
    const result = await engagementService.approveAutocadastro(
        req.auth.igrejaId,
        Number(req.params.id),
        req.validatedBody,
        req.auth.id
    );

    if (!result) {
        throw createHttpError(404, 'Autocadastro não encontrado para esta igreja.');
    }

    audit('autocadastro.aprovar', req, { id: Number(req.params.id), criarAcesso: Boolean(req.validatedBody.criarAcesso) });
    res.json({
        message: 'Autocadastro aprovado com sucesso.',
        result
    });
}

async function rejectAutocadastro(req, res) {
    const result = await engagementService.rejectAutocadastro(
        req.auth.igrejaId,
        Number(req.params.id),
        req.validatedBody,
        req.auth.id
    );

    if (!result) {
        throw createHttpError(404, 'Autocadastro não encontrado para esta igreja.');
    }

    audit('autocadastro.rejeitar', req, { id: Number(req.params.id) });
    res.json({ message: 'Autocadastro rejeitado.', result });
}

async function createPortariaCheckin(req, res) {
    const result = await engagementService.createPortariaCheckin(req.auth.igrejaId, req.validatedBody, req.auth.id);
    audit('portaria.checkin.create', req, { id: result.id, evento: req.validatedBody.evento || null });
    realtime.publish('portaria.checkins', {
        igrejaId: req.auth.igrejaId,
        id: result.id,
        evento: req.validatedBody.evento || null
    });
    res.status(201).json({ message: 'Check-in registrado.', ...result });
}

async function listPortariaCheckins(req, res) {
    const items = await engagementService.listPortariaCheckins(req.auth.igrejaId, req.validatedQuery.data);
    res.json(items);
}

async function createPaymentLink(req, res) {
    const result = await engagementService.createPaymentLink(req.auth.igrejaId, req.validatedBody, req.auth.id);
    audit('payment.link.create', req, { id: result.id, provider: result.provider });
    res.status(201).json({ message: 'Link de pagamento criado.', ...result });
}

async function listPaymentLinks(req, res) {
    const items = await engagementService.listPaymentLinks(req.auth.igrejaId);
    res.json(items);
}

async function markPaymentAsPaid(req, res) {
    await engagementService.markPaymentAsPaid(req.auth.igrejaId, Number(req.params.id));
    audit('payment.link.markPaid', req, { id: Number(req.params.id) });
    res.json({ message: 'Pagamento marcado como pago.' });
}

async function getMemberAppContext(req, res) {
    const context = await engagementService.getMemberAppContext(req.auth.igrejaId, req.auth);
    res.json(context);
}

async function getMemberPermissions(req, res) {
    const data = engagementService.getMemberPermissions(req.auth.role);
    res.json(data);
}

async function createQrSession(req, res) {
    const result = await engagementService.createQrSession(req.auth.igrejaId, req.validatedBody, req.auth.id);
    audit('portaria.qr_session.create', req, { id: result.id, evento: result.evento });
    realtime.publish('portaria.qr', {
        igrejaId: req.auth.igrejaId,
        id: result.id,
        evento: result.evento,
        token: result.token
    });
    res.status(201).json(result);
}

async function getQrSessionPublic(req, res) {
    const data = await engagementService.getQrSessionPublic(req.params.token);
    if (!data) {
        throw createHttpError(404, 'QR inválido ou expirado.');
    }
    res.json(data);
}

async function submitPublicVisitorByToken(req, res) {
    const result = await engagementService.submitPublicVisitorByToken(req.params.token, req.validatedBody);
    if (!result) {
        throw createHttpError(404, 'QR inválido ou expirado.');
    }
    realtime.publish('midia.visitantes', {
        igrejaId: result.igrejaId,
        id: result.id,
        evento: result.evento,
        autorizaTelao: result.autorizaTelao
    });
    res.status(201).json({
        message: 'Cadastro recebido com sucesso.',
        ...result
    });
}

async function listMidiaVisitors(req, res) {
    const data = await engagementService.listMidiaVisitors(req.auth.igrejaId, req.validatedQuery.status);
    res.json(data);
}

async function updateMidiaVisitorStatus(req, res) {
    await engagementService.updateMidiaVisitorStatus(
        req.auth.igrejaId,
        Number(req.params.id),
        req.validatedBody.status,
        req.auth.id
    );

    audit('midia.visitante.status', req, { id: Number(req.params.id), status: req.validatedBody.status });
    realtime.publish('midia.telao', {
        igrejaId: req.auth.igrejaId,
        id: Number(req.params.id),
        status: req.validatedBody.status
    });
    res.json({ message: 'Status atualizado com sucesso.' });
}

async function listTelaoVisitors(req, res) {
    const data = await engagementService.listTelaoVisitors(req.auth.igrejaId);
    res.json(data);
}

async function getAuthMe(req, res) {
    res.json({
        id: req.auth.id,
        nome: req.auth.nome,
        email: req.auth.email,
        igreja: req.auth.igreja,
        igrejaId: req.auth.igrejaId,
        role: req.auth.role
    });
}

module.exports = {
    approveAutocadastro,
    createAutocadastro,
    createPaymentLink,
    createPortariaCheckin,
    createWhatsAppTemplate,
    dispatchWhatsApp,
    getAuthMe,
    getMemberPermissions,
    getMemberAppContext,
    getQrSessionPublic,
    listAutocadastros,
    listMidiaVisitors,
    listPaymentLinks,
    listPortariaCheckins,
    listTelaoVisitors,
    listWhatsAppLogs,
    listWhatsAppTemplates,
    markPaymentAsPaid,
    rejectAutocadastro,
    createQrSession,
    submitPublicVisitorByToken,
    triggerEventoLembrete,
    triggerOracaoResposta,
    triggerVisitanteBoasVindas,
    updateMidiaVisitorStatus,
    updateWhatsAppTemplate
};
