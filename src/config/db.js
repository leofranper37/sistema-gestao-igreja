const mysql = require('mysql2/promise');

const config = require('./index');

const pool = mysql.createPool(config.db);

async function ensureDatabaseExists() {
    const connection = await mysql.createConnection({
        host: config.db.host,
        user: config.db.user,
        password: config.db.password,
        port: config.db.port
    });

    try {
        await connection.query('CREATE DATABASE IF NOT EXISTS ??', [config.db.database]);
    } finally {
        await connection.end();
    }
}

async function runAlterIgnore(sql, ignoredCodes = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_CANT_DROP_FIELD_OR_KEY']) {
    try {
        await pool.query(sql);
    } catch (error) {
        if (!ignoredCodes.includes(error.code)) {
            throw error;
        }
    }
}

async function ensureCoreTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS igrejas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL UNIQUE,
            plano VARCHAR(100) NOT NULL DEFAULT 'teste-7-dias',
            status_assinatura ENUM('trial','ativa','cancelada','inadimplente','expirada') NOT NULL DEFAULT 'trial',
            trial_starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            trial_ends_at DATETIME NULL,
            max_cadastros INT NOT NULL DEFAULT 40,
            max_congregacoes INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        INSERT IGNORE INTO igrejas (id, nome)
        VALUES (1, 'Igreja Padrão')
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS transacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            description VARCHAR(255) NOT NULL,
            type ENUM('entrada','saida') NOT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS caixa_saldo_inicial (
            id INT AUTO_INCREMENT PRIMARY KEY,
            competencia VARCHAR(7) NOT NULL UNIQUE,
            saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS cargos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            descricao VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja VARCHAR(255) NOT NULL,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS membros (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NULL,
            telefone VARCHAR(50) NULL,
            apelido VARCHAR(255) NULL,
            nascimento DATE NULL,
            sexo VARCHAR(50) NULL,
            estado_civil VARCHAR(100) NULL,
            profissao VARCHAR(255) NULL,
            cep VARCHAR(20) NULL,
            endereco VARCHAR(255) NULL,
            numero VARCHAR(50) NULL,
            bairro VARCHAR(255) NULL,
            cidade VARCHAR(255) NULL,
            estado VARCHAR(100) NULL,
            celular VARCHAR(50) NULL,
            cpf VARCHAR(50) NULL,
            rg VARCHAR(50) NULL,
            nacionalidade VARCHAR(100) NULL,
            naturalidade VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS visitantes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NULL,
            visit_date DATE NOT NULL,
            observation TEXT NULL,
            birth_date DATE NULL,
            gender VARCHAR(50) NULL,
            civil_status VARCHAR(100) NULL,
            address VARCHAR(255) NULL,
            number VARCHAR(50) NULL,
            neighborhood VARCHAR(150) NULL,
            city VARCHAR(150) NULL,
            state VARCHAR(50) NULL,
            zip_code VARCHAR(20) NULL,
            mobile_phone VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            congregation VARCHAR(255) NULL,
            accepted_jesus_at VARCHAR(120) NULL,
            return_at VARCHAR(120) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS agenda_eventos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            titulo VARCHAR(255) NOT NULL,
            descricao TEXT NULL,
            inicio DATETIME NOT NULL,
            fim DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS outras_igrejas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            sede VARCHAR(255) NULL,
            endereco VARCHAR(255) NULL,
            bairro VARCHAR(150) NULL,
            cidade VARCHAR(150) NULL,
            cep VARCHAR(20) NULL,
            estado VARCHAR(50) NULL,
            telefone VARCHAR(50) NULL,
            celular VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            responsavel VARCHAR(255) NULL,
            cargo VARCHAR(255) NULL,
            nascimento DATE NULL,
            declaracao VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS missionarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            titulo VARCHAR(255) NULL,
            cep VARCHAR(20) NULL,
            endereco VARCHAR(255) NULL,
            bairro VARCHAR(150) NULL,
            cidade VARCHAR(150) NULL,
            estado VARCHAR(50) NULL,
            pais VARCHAR(100) NULL,
            telefone VARCHAR(50) NULL,
            telefone2 VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            email2 VARCHAR(255) NULL,
            banco VARCHAR(255) NULL,
            nome_agencia VARCHAR(255) NULL,
            agencia VARCHAR(100) NULL,
            tipo_conta VARCHAR(50) NULL,
            numero_conta VARCHAR(100) NULL,
            nome_contato VARCHAR(255) NULL,
            parentesco_contato VARCHAR(100) NULL,
            cep_contato VARCHAR(20) NULL,
            endereco_contato VARCHAR(255) NULL,
            bairro_contato VARCHAR(150) NULL,
            cidade_contato VARCHAR(150) NULL,
            estado_contato VARCHAR(50) NULL,
            pais_contato VARCHAR(100) NULL,
            telefone_contato VARCHAR(50) NULL,
            telefone2_contato VARCHAR(50) NULL,
            email_contato VARCHAR(255) NULL,
            obs TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS congregados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            nascimento DATE NULL,
            sexo VARCHAR(50) NULL,
            estado_civil VARCHAR(100) NULL,
            cpf VARCHAR(50) NULL,
            cep VARCHAR(20) NULL,
            endereco VARCHAR(255) NULL,
            numero VARCHAR(50) NULL,
            bairro VARCHAR(150) NULL,
            cidade VARCHAR(150) NULL,
            estado VARCHAR(50) NULL,
            telefone VARCHAR(50) NULL,
            celular VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            data_cadastro DATE NULL,
            obs TEXT NULL,
            foto_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS criancas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            nascimento DATE NULL,
            apresentacao VARCHAR(120) NULL,
            sexo VARCHAR(50) NULL,
            situacao VARCHAR(120) NULL,
            pai VARCHAR(255) NULL,
            mae VARCHAR(255) NULL,
            nome_pai VARCHAR(255) NULL,
            nome_mae VARCHAR(255) NULL,
            cep VARCHAR(20) NULL,
            endereco VARCHAR(255) NULL,
            numero VARCHAR(50) NULL,
            bairro VARCHAR(150) NULL,
            complemento VARCHAR(255) NULL,
            cidade VARCHAR(150) NULL,
            estado VARCHAR(50) NULL,
            telefone VARCHAR(50) NULL,
            celular VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            foto_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS oracoes_pedidos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            user_id INT NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            pedido TEXT NOT NULL,
            is_private TINYINT(1) NOT NULL DEFAULT 0,
            status ENUM('pendente', 'respondido') NOT NULL DEFAULT 'pendente',
            resposta TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(120) NOT NULL,
            gatilho VARCHAR(80) NOT NULL,
            conteudo TEXT NOT NULL,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            template_id INT NULL,
            gatilho VARCHAR(80) NOT NULL,
            destino VARCHAR(40) NOT NULL,
            mensagem_renderizada TEXT NOT NULL,
            payload_json JSON NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'enviado',
            provider_message_id VARCHAR(120) NULL,
            erro TEXT NULL,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS autocadastros (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            igreja_nome VARCHAR(255) NOT NULL DEFAULT 'Igreja Padrão',
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) NULL,
            telefone VARCHAR(50) NULL,
            cidade VARCHAR(150) NULL,
            ministerio_interesse VARCHAR(255) NULL,
            status ENUM('pendente', 'aprovado', 'rejeitado') NOT NULL DEFAULT 'pendente',
            observacao TEXT NULL,
            analisado_por INT NULL,
            analisado_em DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS portaria_checkins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            visitante_id INT NULL,
            nome_visitante VARCHAR(255) NOT NULL,
            telefone VARCHAR(50) NULL,
            evento VARCHAR(255) NULL,
            origem ENUM('manual', 'qr') NOT NULL DEFAULT 'manual',
            codigo_qr VARCHAR(255) NULL,
            status ENUM('entrada', 'saida') NOT NULL DEFAULT 'entrada',
            checked_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            descricao VARCHAR(255) NOT NULL,
            valor DECIMAL(12,2) NOT NULL DEFAULT 0,
            provider VARCHAR(60) NOT NULL DEFAULT 'mock_pix',
            status ENUM('pendente', 'pago', 'cancelado') NOT NULL DEFAULT 'pendente',
            reference_code VARCHAR(120) NOT NULL,
            url VARCHAR(500) NOT NULL,
            created_by INT NULL,
            paid_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS portaria_qr_sessoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            evento VARCHAR(255) NOT NULL,
            token VARCHAR(120) NOT NULL,
            expira_em DATETIME NULL,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS visitantes_publicos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            qr_sessao_id INT NOT NULL,
            evento VARCHAR(255) NOT NULL,
            nome VARCHAR(255) NOT NULL,
            telefone VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            cidade VARCHAR(150) NULL,
            pedido_oracao TEXT NULL,
            autoriza_telao TINYINT(1) NOT NULL DEFAULT 0,
            status ENUM('novo','selecionado','exibido','arquivado') NOT NULL DEFAULT 'novo',
            exibido_por INT NULL,
            exibido_em DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await runAlterIgnore('ALTER TABLE users ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore("ALTER TABLE users ADD COLUMN role ENUM('admin','financeiro','secretaria','membro') NOT NULL DEFAULT 'admin'");
    await runAlterIgnore("ALTER TABLE users MODIFY COLUMN role ENUM('admin','financeiro','secretaria','membro','pastor','oficial','ministerio','midia','visitante') NOT NULL DEFAULT 'admin'", ['ER_TRUNCATED_WRONG_VALUE']);
    await runAlterIgnore("ALTER TABLE igrejas ADD COLUMN plano VARCHAR(100) NOT NULL DEFAULT 'teste-7-dias'");
    await runAlterIgnore("ALTER TABLE igrejas ADD COLUMN status_assinatura ENUM('trial','ativa','cancelada','inadimplente','expirada') NOT NULL DEFAULT 'trial'");
    await runAlterIgnore('ALTER TABLE igrejas ADD COLUMN trial_starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await runAlterIgnore('ALTER TABLE igrejas ADD COLUMN trial_ends_at DATETIME NULL');
    await runAlterIgnore('ALTER TABLE igrejas ADD COLUMN max_cadastros INT NOT NULL DEFAULT 40');
    await runAlterIgnore('ALTER TABLE igrejas ADD COLUMN max_congregacoes INT NOT NULL DEFAULT 1');
    await runAlterIgnore(
        'ALTER TABLE users ADD CONSTRAINT fk_users_igreja FOREIGN KEY (igreja_id) REFERENCES igrejas(id)',
        ['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE']
    );

    await runAlterIgnore('ALTER TABLE transacoes ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE caixa_saldo_inicial ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE cargos ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE membros ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN birth_date DATE NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN gender VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN civil_status VARCHAR(100) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN address VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN number VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN neighborhood VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN city VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN state VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN zip_code VARCHAR(20) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN mobile_phone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN email VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN congregation VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN accepted_jesus_at VARCHAR(120) NULL');
    await runAlterIgnore('ALTER TABLE visitantes ADD COLUMN return_at VARCHAR(120) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN nascimento DATE NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN sexo VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN estado_civil VARCHAR(100) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN cpf VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN cep VARCHAR(20) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN endereco VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN numero VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN bairro VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN cidade VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN estado VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN telefone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN celular VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN email VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN data_cadastro DATE NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN obs TEXT NULL');
    await runAlterIgnore('ALTER TABLE congregados ADD COLUMN foto_url VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN nascimento DATE NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN apresentacao VARCHAR(120) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN sexo VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN situacao VARCHAR(120) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN pai VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN mae VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN nome_pai VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN nome_mae VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN cep VARCHAR(20) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN endereco VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN numero VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN bairro VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN complemento VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN cidade VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN estado VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN telefone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN celular VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN email VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE criancas ADD COLUMN foto_url VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN user_id INT NOT NULL DEFAULT 0');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN user_name VARCHAR(255) NOT NULL DEFAULT "Sistema"');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN pedido TEXT NULL');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN status ENUM("pendente", "respondido") NOT NULL DEFAULT "pendente"');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD COLUMN resposta TEXT NULL');

    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD COLUMN nome VARCHAR(120) NOT NULL DEFAULT "Template"');
    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD COLUMN gatilho VARCHAR(80) NOT NULL DEFAULT "manual"');
    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD COLUMN conteudo TEXT NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1');

    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN template_id INT NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN gatilho VARCHAR(80) NOT NULL DEFAULT "manual"');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN destino VARCHAR(40) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN mensagem_renderizada TEXT NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN payload_json JSON NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN status VARCHAR(40) NOT NULL DEFAULT "enviado"');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN provider_message_id VARCHAR(120) NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN erro TEXT NULL');
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD COLUMN created_by INT NULL');

    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN igreja_nome VARCHAR(255) NOT NULL DEFAULT "Igreja Padrão"');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN nome VARCHAR(255) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN email VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN telefone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN cidade VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN ministerio_interesse VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN status ENUM("pendente", "aprovado", "rejeitado") NOT NULL DEFAULT "pendente"');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN observacao TEXT NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN analisado_por INT NULL');
    await runAlterIgnore('ALTER TABLE autocadastros ADD COLUMN analisado_em DATETIME NULL');

    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN visitante_id INT NULL');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN nome_visitante VARCHAR(255) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN telefone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN evento VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN origem ENUM("manual", "qr") NOT NULL DEFAULT "manual"');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN codigo_qr VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN status ENUM("entrada", "saida") NOT NULL DEFAULT "entrada"');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD COLUMN checked_by INT NULL');

    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN descricao VARCHAR(255) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN valor DECIMAL(12,2) NOT NULL DEFAULT 0');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN provider VARCHAR(60) NOT NULL DEFAULT "mock_pix"');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN status ENUM("pendente", "pago", "cancelado") NOT NULL DEFAULT "pendente"');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN reference_code VARCHAR(120) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN url VARCHAR(500) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN created_by INT NULL');
    await runAlterIgnore('ALTER TABLE payment_links ADD COLUMN paid_at DATETIME NULL');

    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN evento VARCHAR(255) NOT NULL DEFAULT "Evento"');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN token VARCHAR(120) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN expira_em DATETIME NULL');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD COLUMN created_by INT NULL');

    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN igreja_id INT NOT NULL DEFAULT 1');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN qr_sessao_id INT NOT NULL DEFAULT 0');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN evento VARCHAR(255) NOT NULL DEFAULT "Evento"');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN nome VARCHAR(255) NOT NULL DEFAULT ""');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN telefone VARCHAR(50) NULL');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN email VARCHAR(255) NULL');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN cidade VARCHAR(150) NULL');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN pedido_oracao TEXT NULL');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN autoriza_telao TINYINT(1) NOT NULL DEFAULT 0');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN status ENUM("novo","selecionado","exibido","arquivado") NOT NULL DEFAULT "novo"');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN exibido_por INT NULL');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD COLUMN exibido_em DATETIME NULL');

    await runAlterIgnore('ALTER TABLE transacoes ADD INDEX idx_transacoes_igreja (igreja_id)');
    await runAlterIgnore('ALTER TABLE membros ADD INDEX idx_membros_igreja (igreja_id)');
    await runAlterIgnore('ALTER TABLE visitantes ADD INDEX idx_visitantes_igreja (igreja_id)');
    await runAlterIgnore('ALTER TABLE agenda_eventos ADD INDEX idx_agenda_eventos_igreja_inicio (igreja_id, inicio)');
    await runAlterIgnore('ALTER TABLE outras_igrejas ADD INDEX idx_outras_igrejas_igreja_nome (igreja_id, nome)');
    await runAlterIgnore('ALTER TABLE missionarios ADD INDEX idx_missionarios_igreja_nome (igreja_id, nome)');
    await runAlterIgnore('ALTER TABLE congregados ADD INDEX idx_congregados_igreja_nome (igreja_id, nome)');
    await runAlterIgnore('ALTER TABLE criancas ADD INDEX idx_criancas_igreja_nome (igreja_id, nome)');
    await runAlterIgnore('ALTER TABLE oracoes_pedidos ADD INDEX idx_oracoes_igreja_status (igreja_id, status)');
    await runAlterIgnore('ALTER TABLE whatsapp_templates ADD UNIQUE KEY uq_whatsapp_template_igreja_gatilho_nome (igreja_id, gatilho, nome)', ['ER_DUP_KEYNAME', 'ER_DUP_ENTRY']);
    await runAlterIgnore('ALTER TABLE whatsapp_logs ADD INDEX idx_whatsapp_logs_igreja_data (igreja_id, created_at)');
    await runAlterIgnore('ALTER TABLE autocadastros ADD INDEX idx_autocadastros_igreja_status (igreja_id, status)');
    await runAlterIgnore('ALTER TABLE portaria_checkins ADD INDEX idx_portaria_checkins_igreja_data (igreja_id, created_at)');
    await runAlterIgnore('ALTER TABLE payment_links ADD INDEX idx_payment_links_igreja_status (igreja_id, status)');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD UNIQUE KEY uq_portaria_qr_token (token)');
    await runAlterIgnore('ALTER TABLE portaria_qr_sessoes ADD INDEX idx_portaria_qr_igreja_ativo (igreja_id, ativo)');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD INDEX idx_visitantes_publicos_igreja_status (igreja_id, status)');
    await runAlterIgnore('ALTER TABLE visitantes_publicos ADD INDEX idx_visitantes_publicos_evento (evento)');

    await runAlterIgnore('ALTER TABLE cargos DROP INDEX descricao');
    await runAlterIgnore('ALTER TABLE cargos ADD UNIQUE KEY uq_cargos_igreja_descricao (igreja_id, descricao)');
    await runAlterIgnore('ALTER TABLE caixa_saldo_inicial DROP INDEX competencia');
    await runAlterIgnore('ALTER TABLE caixa_saldo_inicial ADD UNIQUE KEY uq_caixa_saldo_competencia (igreja_id, competencia)');

    // Dízimos
    await pool.query(`
        CREATE TABLE IF NOT EXISTS dizimos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            membro_id INT DEFAULT NULL,
            membro_nome VARCHAR(255) NOT NULL,
            valor DECIMAL(12,2) NOT NULL,
            competencia VARCHAR(7) NOT NULL,
            tipo ENUM('dizimo','oferta','missoes','outros') NOT NULL DEFAULT 'dizimo',
            observacao TEXT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_dizimos_igreja_competencia (igreja_id, competencia),
            INDEX idx_dizimos_membro (membro_id)
        )
    `);

    // Banco — contas bancárias
    await pool.query(`
        CREATE TABLE IF NOT EXISTS banco_contas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            banco VARCHAR(120) DEFAULT NULL,
            agencia VARCHAR(20) DEFAULT NULL,
            conta VARCHAR(30) DEFAULT NULL,
            tipo ENUM('corrente','poupanca','caixa_interno','investimento','outro') NOT NULL DEFAULT 'corrente',
            saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            ativo TINYINT(1) NOT NULL DEFAULT 1,
            observacao TEXT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_banco_contas_igreja (igreja_id)
        )
    `);

    // Banco — lançamentos por conta bancária
    await pool.query(`
        CREATE TABLE IF NOT EXISTS banco_lancamentos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conta_id INT NOT NULL,
            igreja_id INT NOT NULL DEFAULT 1,
            descricao VARCHAR(255) NOT NULL,
            tipo ENUM('entrada','saida') NOT NULL,
            valor DECIMAL(12,2) NOT NULL,
            data_lancamento DATE NOT NULL,
            observacao TEXT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_bl_conta (conta_id),
            INDEX idx_bl_igreja (igreja_id)
        )
    `);

    // Contas a pagar
    await pool.query(`
        CREATE TABLE IF NOT EXISTS contas_pagar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            igreja_id INT NOT NULL DEFAULT 1,
            descricao VARCHAR(255) NOT NULL,
            fornecedor VARCHAR(255) DEFAULT NULL,
            valor DECIMAL(12,2) NOT NULL,
            vencimento DATE NOT NULL,
            data_pagamento DATE DEFAULT NULL,
            status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
            categoria VARCHAR(120) DEFAULT NULL,
            observacao TEXT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_contas_pagar_igreja_status (igreja_id, status),
            INDEX idx_contas_pagar_vencimento (vencimento)
        )
    `);
}

async function initializeDatabase() {
    let connection;

    try {
        connection = await pool.getConnection();
        console.log('✅ Banco de dados conectado com sucesso!');
        connection.release();
        await ensureCoreTables();
        console.log('✅ Tabelas principais verificadas/criadas.');
    } catch (error) {
        if (connection) connection.release();

        if (error.code === 'ER_BAD_DB_ERROR') {
            await ensureDatabaseExists();

            connection = await pool.getConnection();
            console.log(`✅ Banco ${config.db.database} criado automaticamente.`);
            connection.release();

            await ensureCoreTables();
            console.log('✅ Tabelas principais verificadas/criadas.');
            return;
        }

        throw error;
    }
}

module.exports = {
    pool,
    initializeDatabase
};