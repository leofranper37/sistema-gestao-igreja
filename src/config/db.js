const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// SQLite database path:
// - Local/dev: project root file
// - Serverless/prod (Vercel): writable /tmp directory
const dbPath = process.env.SQLITE_DB_PATH
    || (process.env.VERCEL || process.env.NODE_ENV === 'production'
        ? '/tmp/ldfp_db.sqlite'
        : path.resolve(__dirname, '../../ldfp_db.sqlite'));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar no SQLite:', err.message);
    } else {
        console.log('✅ Banco de dados SQLite conectado com sucesso e pronto a usar!');
    }
});

function normalizeSql(sql) {
    // Accept legacy Postgres-style placeholders ($1, $2...) and convert to SQLite style (?).
    return String(sql).replace(/\$\d+/g, '?');
}

function allAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(normalizeSql(sql), params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(rows || []);
        });
    });
}

function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(normalizeSql(sql), params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }

            resolve({
                insertId: this.lastID,
                affectedRows: this.changes,
                changes: this.changes
            });
        });
    });
}

const pool = {
    async query(sql, params = []) {
        const statement = normalizeSql(sql).trim().toUpperCase();

        if (statement.startsWith('SELECT') || statement.startsWith('PRAGMA') || statement.startsWith('WITH')) {
            const rows = await allAsync(sql, params);
            return [rows];
        }

        const result = await runAsync(sql, params);
        return [result];
    },

    async getConnection() {
        return {
            query: (sql, params = []) => pool.query(sql, params),
            release() {
                // No-op for SQLite single connection model.
            }
        };
    },

    async end() {
        return new Promise((resolve, reject) => {
            db.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }
};

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            const safeAlter = (sql) => {
                db.run(sql, (error) => {
                    if (error && !String(error.message || '').toLowerCase().includes('duplicate column name')) {
                        console.error('⚠️ Erro ao ajustar schema SQLite:', error.message);
                    }
                });
            };

            db.run(`CREATE TABLE IF NOT EXISTS igrejas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                plano TEXT NOT NULL DEFAULT 'teste-7-dias',
                status_assinatura TEXT NOT NULL DEFAULT 'trial',
                trial_starts_at TEXT DEFAULT CURRENT_TIMESTAMP,
                trial_ends_at TEXT,
                max_cadastros INTEGER NOT NULL DEFAULT 40,
                max_congregacoes INTEGER NOT NULL DEFAULT 1,
                modulo_app_membro INTEGER NOT NULL DEFAULT 0,
                modulo_app_midia INTEGER NOT NULL DEFAULT 0,
                modulo_ebd INTEGER NOT NULL DEFAULT 0,
                modulo_agenda_eventos INTEGER NOT NULL DEFAULT 1,
                modulo_escala_culto INTEGER NOT NULL DEFAULT 0,
                modulo_pedidos_oracao INTEGER NOT NULL DEFAULT 1,
                modulo_mural_oracao INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_app_membro INTEGER NOT NULL DEFAULT 0');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_app_midia INTEGER NOT NULL DEFAULT 0');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_ebd INTEGER NOT NULL DEFAULT 0');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_agenda_eventos INTEGER NOT NULL DEFAULT 1');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_escala_culto INTEGER NOT NULL DEFAULT 0');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_pedidos_oracao INTEGER NOT NULL DEFAULT 1');
            safeAlter('ALTER TABLE igrejas ADD COLUMN modulo_mural_oracao INTEGER NOT NULL DEFAULT 1');

            db.run(`INSERT OR IGNORE INTO igrejas (id, nome) VALUES (1, 'Igreja Padrão')`);

            db.run(`CREATE TABLE IF NOT EXISTS membros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                igreja_id INTEGER NOT NULL DEFAULT 1,
                nome TEXT NOT NULL,
                email TEXT,
                telefone TEXT,
                apelido TEXT,
                nascimento TEXT,
                sexo TEXT,
                estado_civil TEXT,
                profissao TEXT,
                cep TEXT,
                endereco TEXT,
                numero TEXT,
                bairro TEXT,
                cidade TEXT,
                estado TEXT,
                celular TEXT,
                cpf TEXT,
                rg TEXT,
                nacionalidade TEXT,
                naturalidade TEXT,
                data_nascimento TEXT,
                situacao TEXT DEFAULT 'Ativo',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            safeAlter('ALTER TABLE membros ADD COLUMN igreja_id INTEGER NOT NULL DEFAULT 1');
            safeAlter('ALTER TABLE membros ADD COLUMN email TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN telefone TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN apelido TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN nascimento TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN sexo TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN estado_civil TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN profissao TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN cep TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN endereco TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN numero TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN bairro TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN cidade TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN estado TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN celular TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN rg TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN nacionalidade TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN naturalidade TEXT');
            safeAlter('ALTER TABLE membros ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP');

            db.run(`CREATE INDEX IF NOT EXISTS idx_membros_igreja ON membros (igreja_id)`);

            db.run(`CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                igreja TEXT NOT NULL,
                igreja_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS payment_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                igreja_id INTEGER NOT NULL,
                descricao TEXT NOT NULL,
                valor REAL NOT NULL,
                provider TEXT NOT NULL,
                payment_method TEXT DEFAULT 'pix',
                status TEXT NOT NULL DEFAULT 'pendente',
                reference_code TEXT NOT NULL UNIQUE,
                provider_external_id TEXT,
                url TEXT,
                qr_code TEXT,
                qr_code_base64 TEXT,
                status_detail TEXT,
                plano_destino TEXT,
                plano_duracao_dias INTEGER NOT NULL DEFAULT 30,
                modulos_json TEXT,
                paid_at TEXT,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            safeAlter('ALTER TABLE payment_links ADD COLUMN modulos_json TEXT');

            db.run(`CREATE INDEX IF NOT EXISTS idx_payment_links_igreja ON payment_links (igreja_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_payment_links_reference ON payment_links (reference_code)`);

            db.run(`CREATE TABLE IF NOT EXISTS pedidos_oracao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                igreja_id INTEGER NOT NULL DEFAULT 1,
                solicitante TEXT NOT NULL,
                alvo_oracao TEXT NOT NULL,
                descricao TEXT,
                status TEXT NOT NULL DEFAULT 'ativo',
                is_private INTEGER NOT NULL DEFAULT 0,
                resposta TEXT,
                intercessores INTEGER NOT NULL DEFAULT 0,
                usuario_id INTEGER,
                user_name TEXT,
                data_pedido TEXT DEFAULT CURRENT_TIMESTAMP,
                data_atualizado TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            safeAlter('ALTER TABLE pedidos_oracao ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0');
            safeAlter('ALTER TABLE pedidos_oracao ADD COLUMN resposta TEXT');
            safeAlter('ALTER TABLE pedidos_oracao ADD COLUMN user_name TEXT');

            db.run(`CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_igreja ON pedidos_oracao (igreja_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_status ON pedidos_oracao (status)`);

            db.run(`CREATE TABLE IF NOT EXISTS oracao_intercessores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                usuario_id INTEGER,
                nome_intercessor TEXT,
                data_intercessao TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pedido_id) REFERENCES pedidos_oracao(id) ON DELETE CASCADE
            )`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_oracao_intercessores_pedido ON oracao_intercessores (pedido_id)`);

            // Sentinela: garante que todos os comandos acima já foram executados antes de resolver.
            db.run('SELECT 1', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Tabelas principais verificadas/criadas no SQLite.');
                    resolve();
                }
            });
        });
    });
}

module.exports = {
    db,
    pool,
    initializeDatabase
};
