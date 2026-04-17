const express = require('express');

const { authorize, requireAuth } = require('../middlewares/auth');
const {
    agendaEventoQuerySchema,
    agendaEventoSchema,
    validateBody,
    validateQuery
} = require('../utils/validation');
const {
    createEvento,
    deleteEvento,
    listEventos,
    updateEvento
} = require('../controllers/agendaController');

const router = express.Router();

router.get('/agenda/eventos', requireAuth, authorize(['admin', 'secretaria']), validateQuery(agendaEventoQuerySchema), listEventos);
router.post('/agenda/eventos', requireAuth, authorize(['admin', 'secretaria']), validateBody(agendaEventoSchema), createEvento);
router.put('/agenda/eventos/:id', requireAuth, authorize(['admin', 'secretaria']), validateBody(agendaEventoSchema), updateEvento);
router.delete('/agenda/eventos/:id', requireAuth, authorize(['admin', 'secretaria']), deleteEvento);

module.exports = router;
