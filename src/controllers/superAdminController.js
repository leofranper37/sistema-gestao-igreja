const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESUME_STATE_DIR = path.resolve(__dirname, '..', '..', '.ldfp-resume');
const RESUME_STATE_FILE = path.join(RESUME_STATE_DIR, 'state.json');
const RESUME_TRIGGER = 'LDFP_CONTINUAR';

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(v) { return Number(v) || 0; }

function safeJson(str, fallback = []) {
    try { return JSON.parse(str); } catch (_) { return fallback; }
}

function normDate(v) {
    if (!v) return null;
    const s = String(v).trim();
    // accept ISO date: YYYY-MM-DD → convert to ISO datetime
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00.000Z' : s;
}

function ensureResumeStateDir() {
    if (!fs.existsSync(RESUME_STATE_DIR)) {
        fs.mkdirSync(RESUME_STATE_DIR, { recursive: true });
    }
}

function defaultResumeState() {
    return {
        trigger: RESUME_TRIGGER,
        updatedAt: new Date().toISOString(),
        focus: {
            currentObjective: 'Sem objetivo definido',
            nextSteps: []
        },
        environment: {
            productionUrl: 'https://www.ldfp.com.br',
            cloudIdeUrl: 'https://improved-funicular-5xjvrqxg4q9hpv6r.github.dev/'
        },
        checkpoints: []
    };
}

function readResumeState() {
    ensureResumeStateDir();

    if (!fs.existsSync(RESUME_STATE_FILE)) {
        const state = defaultResumeState();
        fs.writeFileSync(RESUME_STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
        return state;
    }

    try {
        return JSON.parse(fs.readFileSync(RESUME_STATE_FILE, 'utf8'));
    } catch (_err) {
        return defaultResumeState();
    }
}

function writeResumeState(state) {
    ensureResumeStateDir();
    fs.writeFileSync(RESUME_STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function runGit(cmd) {
    try {
        return execSync(cmd, {
            cwd: path.resolve(__dirname, '..', '..'),
            stdio: ['ignore', 'pipe', 'ignore']
        }).toString().trim();
    } catch (_err) {
        return '';
    }
}

function getGitSnapshot() {
    const branch = runGit('git rev-parse --abbrev-ref HEAD') || 'desconhecido';
    const head = runGit('git rev-parse HEAD') || 'desconhecido';
    const statusShort = runGit('git status --short');
    const changedFiles = statusShort
        ? statusShort.split('\n').map(line => line.trim()).filter(Boolean)
        : [];

    return {
        branch,
        head,
        shortHead: head !== 'desconhecido' ? head.slice(0, 7) : head,
        dirty: changedFiles.length > 0,
        changedFiles
    };
}

function normalizeNextSteps(nextSteps) {
    if (Array.isArray(nextSteps)) {
        return nextSteps
            .map(step => String(step || '').trim())
            .filter(Boolean)
            .slice(0, 20);
    }

    if (typeof nextSteps === 'string') {
        return nextSteps
            .split('\n')
            .map(step => step.trim())
            .filter(Boolean)
            .slice(0, 20);
    }

    return [];
}

// ── Dashboard Overview ───────────────────────────────────────────────────────

async function getSuperAdminOverview(req, res) {
    try {
        const [igrejas] = await pool.query(
            `SELECT status_assinatura, mensalidade_valor FROM igrejas`
        );
        const ativas = igrejas.filter(r => r.status_assinatura === 'ativa').length;
        const mrr = igrejas
            .filter(r => r.status_assinatura === 'ativa')
            .reduce((s, r) => s + fmt(r.mensalidade_valor), 0);

        const [pending] = await pool.query(
            `SELECT COUNT(*) AS cnt, COALESCE(SUM(valor),0) AS total
             FROM payment_links WHERE status = 'pendente'`
        );
        const pendingCount = fmt(pending[0]?.cnt);
        const pendingAmount = fmt(pending[0]?.total);

        const [customers] = await pool.query(
            `SELECT i.id, i.nome, i.plano, i.status_assinatura,
                    i.max_cadastros, i.trial_ends_at, i.created_at,
                    u.nome AS responsavel_nome, u.email AS responsavel_email,
                    COUNT(m.id) AS membros_ativos
             FROM igrejas i
             LEFT JOIN usuarios u ON u.igreja_id = i.id AND u.role IN ('admin','super-admin')
             LEFT JOIN membros m ON m.igreja_id = i.id
             GROUP BY i.id, u.nome, u.email
             ORDER BY i.created_at DESC`
        );

        res.json({
            kpis: {
                mrr,
                activeChurches: ativas,
                pendingPayments: pendingCount,
                pendingAmount
            },
            customers: customers || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── MRR Timeseries (últimos 6 meses) ────────────────────────────────────────

async function getSaasFaturamento(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT strftime('%Y-%m', paid_at) AS mes, COALESCE(SUM(valor),0) AS total
             FROM payment_links
             WHERE status = 'pago'
               AND paid_at >= datetime('now', '-6 months')
             GROUP BY mes
             ORDER BY mes ASC`
        ).catch(async () => {
            // MySQL/PG fallback
            const [r] = await pool.query(
                `SELECT DATE_FORMAT(paid_at, '%Y-%m') AS mes, COALESCE(SUM(valor),0) AS total
                 FROM payment_links
                 WHERE status = 'pago'
                   AND paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY mes
                 ORDER BY mes ASC`
            ).catch(async () => {
                const [r2] = await pool.query(
                    `SELECT TO_CHAR(paid_at,'YYYY-MM') AS mes, COALESCE(SUM(valor),0) AS total
                     FROM payment_links
                     WHERE status = 'pago'
                       AND paid_at >= NOW() - INTERVAL '6 months'
                     GROUP BY mes
                     ORDER BY mes ASC`
                );
                return [r2];
            });
            return [r];
        });

        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Listar Igrejas ───────────────────────────────────────────────────────────

async function getSaasIgrejas(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT i.id, i.nome, i.plano, i.status_assinatura,
                    i.responsavel, i.email_admin, i.telefone, i.cnpj,
                    i.mensalidade_valor, i.proximo_vencimento, i.created_at,
                    COUNT(m.id) AS total_membros
             FROM igrejas i
             LEFT JOIN membros m ON m.igreja_id = i.id
             GROUP BY i.id
             ORDER BY i.created_at DESC`
        );
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Detalhe / Contrato de uma Igreja ────────────────────────────────────────

async function getSaasIgrejaContrato(req, res) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    try {
        const [rows] = await pool.query(`SELECT * FROM igrejas WHERE id = ? LIMIT 1`, [id]);
        if (!rows.length) return res.status(404).json({ error: 'Igreja não encontrada.' });
        const ig = rows[0];
        if (ig.modulos_ativos) ig.modulos_ativos = safeJson(ig.modulos_ativos, []);
        res.json(ig);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Alterar status de uma Igreja ────────────────────────────────────────────

async function patchIgrejaStatus(req, res) {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const allowed = ['ativa', 'suspensa', 'cancelada', 'trial', 'inativa'];
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    try {
        await pool.query(`UPDATE igrejas SET status_assinatura = ? WHERE id = ?`, [status, id]);
        res.json({ ok: true, id, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Atualizar contrato de uma Igreja ────────────────────────────────────────

async function updateSaasIgrejaContrato(req, res) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });

    const {
        nome, plano, status_assinatura,
        responsavel, email_admin, telefone, cnpj,
        mensalidade_valor, proximo_vencimento,
        max_cadastros, max_congregacoes,
        modulo_app_membro, modulo_app_midia, modulo_ebd,
        modulo_agenda_eventos, modulo_escala_culto,
        modulo_pedidos_oracao, modulo_mural_oracao
    } = req.body || {};

    const fields = [];
    const vals = [];

    const set = (col, v) => { if (v !== undefined) { fields.push(`${col} = ?`); vals.push(v); } };

    set('nome', nome || undefined);
    set('plano', plano || undefined);
    set('status_assinatura', status_assinatura || undefined);
    set('responsavel', responsavel);
    set('email_admin', email_admin);
    set('telefone', telefone);
    set('cnpj', cnpj);
    set('mensalidade_valor', mensalidade_valor !== undefined ? fmt(mensalidade_valor) : undefined);
    set('proximo_vencimento', normDate(proximo_vencimento));
    set('max_cadastros', max_cadastros !== undefined ? Number(max_cadastros) : undefined);
    set('max_congregacoes', max_congregacoes !== undefined ? Number(max_congregacoes) : undefined);
    set('modulo_app_membro', modulo_app_membro !== undefined ? (modulo_app_membro ? 1 : 0) : undefined);
    set('modulo_app_midia', modulo_app_midia !== undefined ? (modulo_app_midia ? 1 : 0) : undefined);
    set('modulo_ebd', modulo_ebd !== undefined ? (modulo_ebd ? 1 : 0) : undefined);
    set('modulo_agenda_eventos', modulo_agenda_eventos !== undefined ? (modulo_agenda_eventos ? 1 : 0) : undefined);
    set('modulo_escala_culto', modulo_escala_culto !== undefined ? (modulo_escala_culto ? 1 : 0) : undefined);
    set('modulo_pedidos_oracao', modulo_pedidos_oracao !== undefined ? (modulo_pedidos_oracao ? 1 : 0) : undefined);
    set('modulo_mural_oracao', modulo_mural_oracao !== undefined ? (modulo_mural_oracao ? 1 : 0) : undefined);

    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

    try {
        vals.push(id);
        await pool.query(`UPDATE igrejas SET ${fields.join(', ')} WHERE id = ?`, vals);
        const [updated] = await pool.query(`SELECT * FROM igrejas WHERE id = ? LIMIT 1`, [id]);
        res.json(updated[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Planos ───────────────────────────────────────────────────────────────────

async function listPlanos(req, res) {
    try {
        const [rows] = await pool.query(`SELECT * FROM saas_planos ORDER BY preco_mensal ASC`);
        const result = rows.map(r => ({ ...r, features: safeJson(r.features_json, []) }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getPlano(req, res) {
    const slug = req.params.slug;
    try {
        const [rows] = await pool.query(`SELECT * FROM saas_planos WHERE slug = ? LIMIT 1`, [slug]);
        if (!rows.length) return res.status(404).json({ error: 'Plano não encontrado.' });
        const r = rows[0];
        res.json({ ...r, features: safeJson(r.features_json, []) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updatePlano(req, res) {
    const slug = req.params.slug;
    const {
        nome, subtitulo, versiculo,
        preco_mensal, preco_anual,
        max_cadastros, max_congregacoes,
        modulo_app_membro, features, ativo
    } = req.body || {};

    const fields = [];
    const vals = [];
    const set = (col, v) => { if (v !== undefined && v !== null) { fields.push(`${col} = ?`); vals.push(v); } };

    set('nome', nome);
    set('subtitulo', subtitulo);
    set('versiculo', versiculo);
    set('preco_mensal', preco_mensal !== undefined ? fmt(preco_mensal) : undefined);
    set('preco_anual', preco_anual !== undefined ? fmt(preco_anual) : undefined);
    set('max_cadastros', max_cadastros !== undefined ? Number(max_cadastros) : undefined);
    set('max_congregacoes', max_congregacoes !== undefined ? Number(max_congregacoes) : undefined);
    set('modulo_app_membro', modulo_app_membro !== undefined ? (modulo_app_membro ? 1 : 0) : undefined);
    if (features !== undefined) { fields.push('features_json = ?'); vals.push(JSON.stringify(features)); }
    if (ativo !== undefined) { fields.push('ativo = ?'); vals.push(ativo ? 1 : 0); }
    if (fields.length) { fields.push('updated_at = CURRENT_TIMESTAMP'); }

    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

    try {
        vals.push(slug);
        await pool.query(`UPDATE saas_planos SET ${fields.join(', ')} WHERE slug = ?`, vals);
        const [updated] = await pool.query(`SELECT * FROM saas_planos WHERE slug = ? LIMIT 1`, [slug]);
        if (!updated.length) return res.status(404).json({ error: 'Plano não encontrado.' });
        const r = updated[0];
        res.json({ ...r, features: safeJson(r.features_json, []) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Assinaturas / Faturas SaaS ─────────────────────────────────────────────

async function listSaasAssinaturas(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT p.id, p.igreja_id, p.descricao, p.valor, p.status, p.provider,
                    p.payment_method, p.url, p.reference_code, p.created_at, p.paid_at,
                    i.nome AS igreja_nome, i.plano, i.status_assinatura
             FROM payment_links p
             LEFT JOIN igrejas i ON i.id = p.igreja_id
             ORDER BY p.created_at DESC
             LIMIT 500`
        );
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function markSaasAssinaturaPaga(req, res) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });

    try {
        await pool.query(
            `UPDATE payment_links
             SET status = 'pago', paid_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [id]
        );

        const [rows] = await pool.query(
            `SELECT id, status, paid_at
             FROM payment_links
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Fatura não encontrada.' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ── Gatilho de Retomada (estado de continuidade) ──────────────────────────

async function getSaasRetomada(req, res) {
    try {
        const state = readResumeState();
        res.json({
            ...state,
            trigger: state.trigger || RESUME_TRIGGER,
            git: getGitSnapshot(),
            filePath: '.ldfp-resume/state.json'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateSaasRetomada(req, res) {
    try {
        const state = readResumeState();
        const body = req.body || {};

        state.trigger = RESUME_TRIGGER;
        state.updatedAt = new Date().toISOString();

        if (body.focus && typeof body.focus === 'object') {
            const currentObjective = String(body.focus.currentObjective || '').trim();
            const nextSteps = normalizeNextSteps(body.focus.nextSteps);

            state.focus = {
                currentObjective: currentObjective || state.focus?.currentObjective || 'Sem objetivo definido',
                nextSteps: nextSteps.length ? nextSteps : (state.focus?.nextSteps || [])
            };
        }

        if (body.environment && typeof body.environment === 'object') {
            state.environment = {
                productionUrl: String(body.environment.productionUrl || state.environment?.productionUrl || 'https://www.ldfp.com.br').trim(),
                cloudIdeUrl: String(body.environment.cloudIdeUrl || state.environment?.cloudIdeUrl || 'https://improved-funicular-5xjvrqxg4q9hpv6r.github.dev/').trim()
            };
        }

        writeResumeState(state);
        res.json({ ok: true, state, git: getGitSnapshot() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function createSaasRetomadaCheckpoint(req, res) {
    try {
        const state = readResumeState();
        const body = req.body || {};
        const note = String(body.note || 'Checkpoint manual').trim() || 'Checkpoint manual';
        const now = new Date().toISOString();
        const git = getGitSnapshot();

        const checkpoints = Array.isArray(state.checkpoints) ? state.checkpoints : [];
        const checkpoint = { at: now, note, git };

        state.trigger = RESUME_TRIGGER;
        state.updatedAt = now;
        state.lastCheckpoint = checkpoint;
        state.checkpoints = [checkpoint, ...checkpoints].slice(0, 50);
        state.git = git;

        writeResumeState(state);
        res.json({ ok: true, checkpoint, state });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getSuperAdminOverview,
    getSaasFaturamento,
    getSaasIgrejas,
    getSaasIgrejaContrato,
    patchIgrejaStatus,
    updateSaasIgrejaContrato,
    listPlanos,
    getPlano,
    updatePlano,
    listSaasAssinaturas,
    markSaasAssinaturaPaga,
    getSaasRetomada,
    updateSaasRetomada,
    createSaasRetomadaCheckpoint
};
