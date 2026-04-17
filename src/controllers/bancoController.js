const parseDecimal = require('../utils/parseDecimal');
const bancoService = require('../services/bancoService');
const { audit } = require('../services/auditService');
const { createHttpError } = require('../utils/httpError');

async function listContas(req, res) {
    const igrejaId = Number(req.auth.igrejaId || 1);
    const contas = await bancoService.listContas(igrejaId);
    res.json(contas);
}

async function getConta(req, res) {
    const igrejaId = Number(req.auth.igrejaId || 1);
    const conta = await bancoService.getConta(Number(req.params.id), igrejaId);

    if (!conta) throw createHttpError(404, 'Conta não encontrada.');
    res.json(conta);
}

async function createConta(req, res) {
    const igrejaId = Number(req.auth.igrejaId || 1);
    const { saldoInicial: raw, ...rest } = req.validatedBody;
    const saldoInicial = parseDecimal(raw);

    if (Number.isNaN(saldoInicial) || saldoInicial < 0) {
        throw createHttpError(400, 'Saldo inicial inválido.');
    }

    const id = await bancoService.createConta(igrejaId, { ...rest, saldoInicial }, req.auth.id);
    audit('banco.conta.create', req, { id, nome: rest.nome });
    res.status(201).json({ message: 'Conta criada com sucesso.', id });
}

async function updateConta(req, res) {
    const igrejaId = Number(req.auth.igrejaId || 1);
    const id = Number(req.params.id);
    const { saldoInicial: raw, ...rest } = req.validatedBody;
    const saldoInicial = parseDecimal(raw);

    await bancoService.updateConta(id, igrejaId, { ...rest, saldoInicial });
    audit('banco.conta.update', req, { id });
    res.json({ message: 'Conta atualizada.' });
}

async function deleteConta(req, res) {
    const igrejaId = Number(req.auth.igrejaId || 1);
    const id = Number(req.params.id);
    await bancoService.deleteConta(id, igrejaId);
    audit('banco.conta.delete', req, { id });
    res.json({ message: 'Conta removida.' });
}

module.exports = {
    listContas,
    getConta,
    createConta,
    updateConta,
    deleteConta
};
