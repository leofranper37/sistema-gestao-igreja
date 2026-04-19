const cors = require('cors');
const express = require('express');
const path = require('path');

const config = require('./config');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const { createHttpError } = require('./utils/httpError');
const accountRoutes = require('./routes/accountRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const bancoRoutes = require('./routes/bancoRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const contasPagarRoutes = require('./routes/contasPagarRoutes');
const financeRoutes = require('./routes/financeRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const missionariosRoutes = require('./routes/missionariosRoutes');
const outrasIgrejasRoutes = require('./routes/outrasIgrejasRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();

const allowedOrigins = config.cors.allowedOrigins;

const getHostname = value => {
    try {
        return new URL(value).hostname.toLowerCase();
    } catch (error) {
        return '';
    }
};

const getProjectSlugFromAppBaseUrl = () => {
    const appBaseHostname = getHostname(process.env.APP_BASE_URL || '');
    return appBaseHostname.replace(/\.vercel\.app$/, '');
};

const isAllowedVercelPreviewOrigin = origin => {
    const originHostname = getHostname(origin);
    const projectSlug = getProjectSlugFromAppBaseUrl();

    if (!originHostname || !projectSlug) {
        return false;
    }

    if (!originHostname.endsWith('.vercel.app')) {
        return false;
    }

    return originHostname === projectSlug || originHostname.startsWith(`${projectSlug}-`);
};

app.use(cors(allowedOrigins.length ? {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin) || isAllowedVercelPreviewOrigin(origin)) {
            return callback(null, true);
        }

        return callback(createHttpError(403, 'Origem não permitida por CORS.'));
    }
} : undefined));

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
        logger.info('http_request', {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            userId: req.auth?.id || null,
            igrejaId: req.auth?.igrejaId || null,
            ip: req.ip
        });
    });

    next();
});

app.use(financeRoutes);
app.use(bancoRoutes);
app.use(contasPagarRoutes);
app.use(engagementRoutes);
app.use(cargoRoutes);
app.use(accountRoutes);
app.use(agendaRoutes);
app.use(missionariosRoutes);
app.use(outrasIgrejasRoutes);
app.use(realtimeRoutes);
app.use(systemRoutes);

app.use((req, res, next) => {
    next(createHttpError(404, 'Rota não encontrada.'));
});

app.use(errorHandler);

module.exports = app;