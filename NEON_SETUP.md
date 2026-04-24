# 🚀 Configuração do Neon PostgreSQL + Vercel

## Passo 1: Obter String de Conexão no Neon

1. Acesse: https://console.neon.tech
2. Faça login com sua conta
3. Selecione seu projeto
4. Vá em **"Connection String"**
5. Escolha **"Pooled connection"** (mais rápido para Vercel)
6. Copie a URL completa que começa com `postgresql://`
   - Exemplo: `postgresql://user:password@ep-tiny-frost-12345.us-east-1.neon.tech:5432/database?sslmode=require`

## Passo 2: Adicionar no Vercel

### Via Dashboard (Recomendado)
1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **sistema-gestao-igreja**
3. Clique em **Settings**
4. Vá em **Environment Variables**
5. Clique em **Add New**
6. Preencha:
   - **Name:** `DATABASE_URL`
   - **Value:** Cole a string do Neon
   - **Environments:** Selecione **Production**, **Preview**, e **Development**
7. Clique em **Save**

### Via CLI (Alternativa)
```bash
vercel env add DATABASE_URL
# Cole a string quando solicitado
```

## Passo 3: Testar a Conexão

Depois de adicionar, faça um novo deploy:
```bash
git add .
git commit -m "feat: add Neon PostgreSQL configuration"
git push origin main
```

Vercel fará o deploy automaticamente. Verifique os logs em Vercel → Deployments.

## Configuração Automática

O código já suporta PostgreSQL via `DATABASE_URL`:
- ✅ Detecta automaticamente se é PostgreSQL, MySQL ou SQLite
- ✅ Adapta queries SQL para cada banco
- ✅ Gerencia conexões pooled

## Troubleshooting

### Erro: "connection refused"
- Verifique se a string está correta
- Certifique-se de usar a **pooled connection** (não unpooled)
- Whitelist Vercel IP: https://console.neon.tech → Connection Details

### Erro: "SSL required"
- Vercel usa SSL por padrão ✅ (Neon requer isso)
- Não remova `?sslmode=require` da string

### Migração de Dados
Se precisa migrar dados do SQLite para Neon:
```bash
# Exportar schema do SQLite
sqlite3 ldfp_db.sqlite ".schema" > backup.sql

# Importar no Neon via console ou SQL Editor
```

## Status da Implementação

✅ Code já suporta PostgreSQL  
✅ Variáveis de ambiente configuradas  
⏳ Aguardando: Adicionar `DATABASE_URL` no Vercel  
