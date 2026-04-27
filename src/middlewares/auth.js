const jwt = require('jsonwebtoken');

const config = require('../config');
const { pool } = require('../config/db');
const { createHttpError } = require('../utils/httpError');

function parseJsonSafe(value, fallback = null) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (_error) {
        return fallback;
    }
}

// Rotas que nunca são bloqueadas por assinatura expirada
const ROTAS_LIVRES_ASSINATURA = [
    '/login',
    '/criar-conta',
    '/api/pagamentos',
    '/api/setup',
    '/super-admin',
    '/realtime',
];

function isRotaLivreAssinatura(path) {
    return ROTAS_LIVRES_ASSINATURA.some(p => path.startsWith(p));
}

async function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || '';
    const queryToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';

    if (!authorization.startsWith('Bearer ') && !queryToken) {
        return next(createHttpError(401, 'Token de acesso não informado.'));
    }

    const token = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : queryToken;

    try {
        const payload = jwt.verify(token, config.security.jwtSecret);

        // ── Token do App de Membro (app_mode) ─────────────────────────────
        if (payload.app_mode) {
            const membroId = payload.membro_id || payload.id;
            const [rows] = await pool.query(
                `SELECT m.id, m.nome, m.email, m.cpf, m.situacao, m.igreja_id,
                        i.plano, i.status_assinatura, i.trial_starts_at, i.trial_ends_at, i.max_cadastros, i.max_congregacoes,
                        i.modulo_app_membro, i.modulo_app_midia, i.modulo_ebd,
                        i.modulo_agenda_eventos, i.modulo_escala_culto, i.modulo_pedidos_oracao, i.modulo_mural_oracao,
                        i.nome AS nome_igreja
                 FROM membros m
                 INNER JOIN igrejas i ON i.id = m.igreja_id
                 WHERE m.id = ?
                 LIMIT 1`,
                [membroId]
            );

            const membro = rows[0];
            if (!membro) {
                return next(createHttpError(401, 'Membro do token não encontrado.'));
            }

            req.auth = {
                ...payload,
                id: membro.id,
                membro_id: membro.id,
                nome: membro.nome,
                email: membro.email || '',
                igrejaId: membro.igreja_id,
                nome_igreja: membro.nome_igreja,
                role: payload.role || 'membro',
                app_mode: true,
                plano: membro.plano || 'teste-7-dias',
                statusAssinatura: membro.status_assinatura || 'trial',
                trialStartsAt: membro.trial_starts_at || null,
                trialEndsAt: membro.trial_ends_at || null,
                maxCadastros: membro.max_cadastros || 40,
                maxCongregacoes: membro.max_congregacoes || 1,
                modules: {
                    financeiro: false,
                    appMembro: Boolean(Number(membro.modulo_app_membro ?? 1)),
                    appMidia: Boolean(Number(membro.modulo_app_midia || 0)),
                    ebd: Boolean(Number(membro.modulo_ebd || 0)),
                    agendaEventos: Boolean(Number(membro.modulo_agenda_eventos ?? 1)),
                    escalaCulto: Boolean(Number(membro.modulo_escala_culto || 0)),
                    pedidosOracao: Boolean(Number(membro.modulo_pedidos_oracao ?? 1)),
                    muralOracao: Boolean(Number(membro.modulo_mural_oracao ?? 1))
                }
            };
            return next();
        }

        // ── Token de Admin/Usuário padrão ──────────────────────────────────
        const [rows] = await pool.query(
            `SELECT u.id, u.nome, u.email, u.igreja, u.igreja_id, u.role,
                    i.plano, i.status_assinatura, i.trial_starts_at, i.trial_ends_at, i.max_cadastros, i.max_congregacoes,
                    i.config_personalizada_json,
                    i.modulo_app_membro, i.modulo_app_midia, i.modulo_ebd,
                    i.modulo_agenda_eventos, i.modulo_escala_culto, i.modulo_pedidos_oracao, i.modulo_mural_oracao
             FROM usuarios u
             LEFT JOIN igrejas i ON i.id = u.igreja_id
             WHERE u.id = ?
             LIMIT 1`,
            [payload.sub || payload.id]
        );

        const user = rows[0];

        if (!user) {
            return next(createHttpError(401, 'Usuário do token não encontrado.'));
        }

        req.auth = {
            ...payload,
            id: user.id,
            nome: user.nome,
            email: user.email,
            igreja: user.igreja,
            igrejaId: user.igreja_id,
            role: user.role,
            plano: user.plano || 'teste-7-dias',
            statusAssinatura: user.status_assinatura || 'trial',
            trialStartsAt: user.trial_starts_at || null,
            trialEndsAt: user.trial_ends_at || null,
            maxCadastros: user.max_cadastros || 40,
            maxCongregacoes: user.max_congregacoes || 1,
            customConfig: parseJsonSafe(user.config_personalizada_json, {}),
            modules: {
                financeiro: true,
                appMembro: Boolean(Number(user.modulo_app_membro || 0)),
                appMidia: Boolean(Number(user.modulo_app_midia || 0)),
                ebd: Boolean(Number(user.modulo_ebd || 0)),
                agendaEventos: Boolean(Number(user.modulo_agenda_eventos ?? 1)),
                escalaCulto: Boolean(Number(user.modulo_escala_culto || 0)),
                pedidosOracao: Boolean(Number(user.modulo_pedidos_oracao ?? 1)),
                muralOracao: Boolean(Number(user.modulo_mural_oracao ?? 1))
            }
        };

        // ── Verificação de assinatura ──────────────────────────────────────
        // Super-admin e rotas de pagamento/login nunca são bloqueados
        if (req.auth.role !== 'super-admin' && !isRotaLivreAssinatura(req.path)) {
            const status = req.auth.statusAssinatura;
            const trialEndsAt = req.auth.trialEndsAt ? new Date(req.auth.trialEndsAt) : null;
            const agora = new Date();

            if (status === 'trial' && trialEndsAt && trialEndsAt < agora) {
                // Atualiza status no banco para 'cancelado'
                pool.query(
                    `UPDATE igrejas SET status_assinatura = 'cancelado' WHERE id = ? AND status_assinatura = 'trial'`,
                    [req.auth.igrejaId]
                ).catch(() => {});
                return next(createHttpError(402, 'Seu período de teste encerrou. Assine um plano para continuar em /assinar.html'));
            }

            if (['cancelado', 'suspensa', 'inativa'].includes(status)) {
                return next(createHttpError(402, 'Assinatura inativa. Acesse /assinar.html para reativar.'));
            }
        }

        next();
    } catch (error) {
        next(createHttpError(401, 'Token inválido ou expirado.'));
    }
}

function authorize(allowedRoles = []) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
        if (!req.auth) {
            return next(createHttpError(401, 'Usuário não autenticado.'));
        }

        if (!roles.length) {
            return next();
        }

        if (!roles.includes(req.auth.role)) {
            return next(createHttpError(403, 'Acesso negado para este perfil.'));
        }

        next();
    };
}

module.exports = {
    authorize,
    requireAuth
};