const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || '"LDFP" <no-reply@ldfp.local>';
const appBaseUrl = process.env.APP_BASE_URL || 'http://127.0.0.1:3001';

const mailTransporter = smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    })
    : null;

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// --- ROTA DE CRIAR CONTA + EMAIL ---
app.post('/criar-conta', async (req, res) => {
    const { igreja, nome, email, senha } = req.body;

    if (!igreja || !nome || !email || !senha) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    try {
        if (mailTransporter) {
            await mailTransporter.sendMail({
                from: smtpFrom,
                to: email,
                subject: 'Confirmação de conta - LDFP',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Bem-vindo ao LDFP, ${nome}!</h2>
                        <p>Sua conta para a igreja <strong>${igreja}</strong> foi criada com sucesso.</p>
                        <p>Você já pode acessar o sistema pelo link abaixo:</p>
                        <p><a href="${appBaseUrl}/login.html" style="color:#f59e0b; font-weight:bold;">Acessar o LDFP</a></p>
                        <p>Se não foi você, ignore este e-mail.</p>
                    </div>
                `,
            });
            return res.status(201).json({ message: 'Conta criada e e-mail enviado.' });
        }

        return res.status(201).json({ message: 'Conta criada. Envio de e-mail desativado (SMTP não configurado).' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar e-mail.' });
    }
});

// --- ROTA DE CADASTRO COMPLETO (ATUALIZADA) ---
app.post('/membros', async (req, res) => {
    // Recebe TODOS os campos do formulário novo
    const { 
        nome, email, telefone, apelido, nascimento, sexo, estado_civil, profissao,
        cep, endereco, numero, bairro, cidade, estado, celular, cpf, rg, nacionalidade, naturalidade 
    } = req.body;

    try {
        const query = `
            INSERT INTO members (
                church_id, full_name, email, phone, 
                nickname, birth_date, gender, civil_status, profession,
                zip_code, address, number, neighborhood, city, state,
                mobile_phone, cpf, rg, nationality, natural_from
            ) VALUES (
                1, $1, $2, $3, 
                $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19
            )
        `;
        
        const values = [
            nome, email, telefone, apelido, nascimento, sexo, estado_civil, profissao,
            cep, endereco, numero, bairro, cidade, estado, celular, cpf, rg, nacionalidade, naturalidade
        ];

        await pool.query(query, values);
        res.status(201).json({ message: "Cadastro Completo realizado!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao cadastrar membro." });
    }
});

// --- OUTRAS ROTAS (MANTIDAS IGUAIS) ---
app.get('/membros', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members WHERE church_id = 1 ORDER BY id ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Erro ao buscar" }); }
});

app.get('/saldo', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT SUM(CASE WHEN type='entrada' THEN amount ELSE -amount END) as saldo FROM transactions WHERE church_id=1`);
        res.json({ saldo: rows[0]?.saldo || 0 });
    } catch (err) { res.status(500).json({ error: "Erro" }); }
});
// --- ROTAS DE VISITANTES (NOVO!) ---

// 1. Cadastrar Visitante
app.post('/visitantes', async (req, res) => {
    const { nome, telefone, data, observacao } = req.body;
    try {
        await pool.query(
            `INSERT INTO visitors (full_name, phone, visit_date, observation) VALUES (?, ?, ?, ?)`,
            [nome, telefone, data, observacao]
        );
        res.status(201).json({ message: "Visitante registrado!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao registrar visitante" });
    }
});

// 2. Listar Visitantes
app.get('/visitantes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM visitors ORDER BY visit_date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: "Erro ao buscar visitantes" }); }
});

// 3. Contar Visitantes (Para o Card Vermelho do Dashboard)
app.get('/total-visitantes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM visitors');
        res.json({ total: rows[0]?.total || 0 });
    } catch (err) { res.status(500).json({ error: "Erro ao contar" }); }
});
const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));