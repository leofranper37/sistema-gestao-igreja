const express = require('express');
const { requireAuth, authorize } = require('../middlewares/auth');
const {
    getSuperAdminOverview,
    getSaasFaturamento,
    getSaasIgrejas,
    getSaasIgrejaContrato,
    patchIgrejaStatus,
    updateSaasIgrejaContrato,
    listPlanos,
    getPlano,
    createPlano,
    updatePlano,
    listSaasAssinaturas,
    markSaasAssinaturaPaga,
    deleteSaasAssinatura,
    getSaasRetomada,
    updateSaasRetomada,
    createSaasRetomadaCheckpoint
} = require('../controllers/superAdminController');

const router = express.Router();
const isSuperAdmin = [requireAuth, authorize(['super-admin', 'admin'])];

// Dashboard
router.get('/super-admin/overview', ...isSuperAdmin, getSuperAdminOverview);

// Faturamento MRR
router.get('/api/saas/faturamento', ...isSuperAdmin, getSaasFaturamento);

// Igrejas / Clientes
router.get('/api/saas/igrejas', ...isSuperAdmin, getSaasIgrejas);
router.get('/api/saas/igrejas/:id', ...isSuperAdmin, getSaasIgrejaContrato);
router.patch('/api/saas/igrejas/:id/status', ...isSuperAdmin, patchIgrejaStatus);
router.patch('/api/saas/igrejas/:id/contrato', ...isSuperAdmin, updateSaasIgrejaContrato);

// Planos
router.get('/api/saas/planos', ...isSuperAdmin, listPlanos);
router.get('/api/saas/planos/:slug', ...isSuperAdmin, getPlano);
router.post('/api/saas/planos', ...isSuperAdmin, createPlano);
router.put('/api/saas/planos/:slug', ...isSuperAdmin, updatePlano);

// Assinaturas & Faturas
router.get('/api/saas/assinaturas', ...isSuperAdmin, listSaasAssinaturas);
router.put('/api/saas/assinaturas/:id/pago', ...isSuperAdmin, markSaasAssinaturaPaga);
router.delete('/api/saas/assinaturas/:id', ...isSuperAdmin, deleteSaasAssinatura);

// Retomada / Continuidade
router.get('/api/saas/retomada', ...isSuperAdmin, getSaasRetomada);
router.put('/api/saas/retomada', ...isSuperAdmin, updateSaasRetomada);
router.post('/api/saas/retomada/checkpoint', ...isSuperAdmin, createSaasRetomadaCheckpoint);

module.exports = router;
