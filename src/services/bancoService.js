const bancoModel = require('../models/bancoModel');

async function listContas(igrejaId) {
    return bancoModel.listContas(igrejaId);
}

async function getConta(id, igrejaId) {
    return bancoModel.getConta(id, igrejaId);
}

async function createConta(igrejaId, payload, userId) {
    const id = await bancoModel.createConta({ igrejaId, ...payload, createdBy: userId });
    return id;
}

async function updateConta(id, igrejaId, payload) {
    await bancoModel.updateConta(id, igrejaId, payload);
}

async function deleteConta(id, igrejaId) {
    await bancoModel.deleteConta(id, igrejaId);
}

module.exports = {
    listContas,
    getConta,
    createConta,
    updateConta,
    deleteConta
};
