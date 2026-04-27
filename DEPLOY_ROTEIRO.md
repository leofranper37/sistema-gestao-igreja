# 🚀 ROTEIRO DE DEPLOY - Sistema de Gestão Igreja

## Ambiente Oficial (Decisão Atual)

- Produção oficial: **Vercel**
- Banco recomendado em produção: **PostgreSQL gerenciado (Neon)**
- Contingência: **Railway** (usar apenas em incidente ou migração planejada)

### Como validar em 10 segundos

```powershell
nslookup www.ldfp.com.br
Invoke-WebRequest -Uri "https://www.ldfp.com.br" -Method Head -UseBasicParsing | Select-Object -ExpandProperty Headers
```

Se aparecer `vercel-dns` no DNS ou `Server: Vercel` nos headers, o ambiente ativo é Vercel.

## Objetivo
Colocar o projeto "vivo" na nuvem com sincronização automática entre VS Code e o servidor online.

---

## ✅ ETAPA 1: Sincronizar Código no GitHub

### Passo 1.1 - Abrir Terminal no VS Code
1. Pressiona `Ctrl + ~` (ou `Cmd + ~` no Mac) para abrir o terminal
2. Certifica-te de que estás na pasta raiz do projeto: `d:\sistema-gestao-igreja`

### Passo 1.2 - Adicionar Todas as Alterações
```bash
git add .
```

### Passo 1.3 - Criar um Commit com Mensagem
```bash
git commit -m "Preparando para o deploy online - v1.0"
```

### Passo 1.4 - Enviar para o GitHub
```bash
git push origin main
```

**✓ Verificação:** Acede a github.com e confirma que os ficheiros aparecem no repositório.

---

## ✅ ETAPA 2: Configurar a Vercel (Hospedagem Gratuita)

### Passo 2.1 - Aceder à Vercel
1. Vai a **https://vercel.com**
2. Faz login com a tua conta do GitHub

### Passo 2.2 - Importar o Projeto
1. Clica em **"Add New"** → **"Project"**
2. Escolhe o repositório **LDFP** (ou o nome do teu projeto)
3. Clica em **"Import"**

### Passo 2.3 - Configurar Environment Variables
Se usares **Prisma** ou Base de Dados:

1. Na página de configuração, vai a **"Environment Variables"**
2. Adiciona as seguintes variáveis:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://username:password@host:port/database` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(o valor que tens no teu .env)* |

3. Clica em **"Add"** para cada uma

**⚠️ Nota:** Se tiveres um ficheiro `.env` local, copia APENAS as variáveis críticas (não as credenciais sensíveis) para a Vercel.

### Passo 2.4 - Deploy
1. Clica em **"Deploy"**
2. Espera ~2-3 minutos pela construção
3. Verás uma mensagem: **"Congratulations! Your project has been successfully deployed"**

**✓ Verificação:** A Vercel dá-te um URL tipo `https://sistema-gestao-igreja.vercel.app` - testa neste URL.

---

## ✅ ETAPA 3: Vincular o Domínio .com.br

### Passo 3.1 - Adicionar o Domínio na Vercel
1. No painel da Vercel, vai a **"Settings"** → **"Domains"**
2. Clica em **"Add Domain"**
3. Digita os domínios: `ldfp.com.br` e `www.ldfp.com.br`

### Passo 3.2 - Configurar o DNS
A Vercel vai-te mostrar os valores de DNS. Existem 2 opções:

#### Opção A: Nameservers (Recomendado)
```
ns1.vercel.com
ns2.vercel.com
ns3.vercel.com
ns4.vercel.com
```

#### Opção B: Registos CNAME (se não conseguires usar Nameservers)
```
CNAME: www.ldfp.com.br → cname.vercel.app
A: 76.76.19.0
AAAA: 2610:7e5c:bff0::0
```

### Passo 3.3 - Atualizar DNS no Registro.br
1. Vai a **https://www.registro.br** e faz login
2. Procura "Meus Domínios"
3. Selecciona o teu domínio
4. Clica em **"Alterar Nameservers"** ou **"Gerenciar DNS"**
5. Cola os valores que a Vercel deu
6. Clica em **"Salvar"**

**⏱️ Tempo de espera:** Pode demorar 24-48 horas para o DNS propagar, mas geralmente é mais rápido.

**✓ Verificação:** Quando o DNS estiver ativo, conseguirás aceder em `https://ldfp.com.br` e `https://www.ldfp.com.br`

---

## ✅ ETAPA 4: Fluxo de Trabalho Contínuo

A partir daqui, o processo é automático:

### Sempre que Terminares uma Funcionalidade:

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar as mudanças
git add .

# 3. Criar um commit com descrição
git commit -m "Descrição da funcionalidade - ex: Adicionar formulário de visitantes"

# 4. Enviar para GitHub
git push origin main
```

### Depois Disso:
- ✅ GitHub recebe o código
- ✅ Vercel detecta a mudança automaticamente
- ✅ Constrói a nova versão (~1-2 minutos)
- ✅ Disponibiliza em `https://www.ldfp.com.br`

**Não precisas fazer mais nada!** Está tudo automático.

---

## 🔍 Troubleshooting

### Problema: "fatal: not a git repository"
**Solução:** Abre a pasta no VS Code corretamente. Podes fazer `git init` para inicializar se necessário.

### Problema: "git push rejected"
**Solução:** Pode ser que o branch seja `main` ou `master`. Tenta:
```bash
git push origin main
```
Se der erro, tenta:
```bash
git push origin master
```

### Problema: Vercel não detecta alterações
**Solução:** 
1. Verifica se a ligação GitHub ↔ Vercel está ativa
2. Vai a https://vercel.com > Settings > Git Integrations
3. Reconecta o repositório se necessário

### Problema: Deploy falha na Vercel
**Solução:**
1. Clica em "Deployments" no painel da Vercel
2. Abre a build que falhou
3. Vê os logs de erro
4. Comum: Faltam dependências (`npm install` localmente e depois `git push`)

### Problema: Domínio não resolve
**Solução:**
1. Testa em https://mxtoolbox.com (coloca o domínio)
2. Se DNS ainda está em propagação, aguarda 24h
3. Se está propagado, verifica se os registos no Registro.br estão corretos

---

## 📋 Checklist Final

Antes de considerar o deploy completo:

- [ ] Código enviado para GitHub (`git push` com sucesso)
- [ ] Projeto criado na Vercel
- [ ] Environment Variables adicionadas (se necessário)
- [ ] Domínio adicionado na Vercel
- [ ] DNS atualizado no Registro.br
- [ ] Site acessível em `https://ldfp.com.br` e `https://www.ldfp.com.br`
- [ ] Testaste uma mudança pequena (commit + push) e viste atualizar automaticamente

---

## 🎯 Próximos Passos Após Deploy

Agora que tudo está online:

1. **Adicionar HTTPS automático** (Vercel faz isto por defeito)
2. **Configurar Email** (opcional - se quiseres enviar emails)
3. **Adicionar Analytics** (Google Analytics ou Vercel Analytics)
4. **Backups da Base de Dados** (verifica o teu provider de DB)
5. **Monitorização** (Vercel avisa-te de errors automaticamente)

---

## Plano de Contingência (Railway)

Usar Railway somente se ocorrer falha prolongada na Vercel ou necessidade de migração temporária.

Passos rápidos:

1. Confirmar que `railway.json` está atualizado.
2. Configurar as mesmas variáveis críticas (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`).
3. Validar domínio temporário e CORS.
4. Após normalização, retornar operação principal para Vercel.

---

**Boa sorte! 🚀 Qualquer dúvida, revê este documento antes de começar.**
