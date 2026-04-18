# ⚡ COMANDOS RÁPIDOS - Deploy

## Enviar Código para GitHub (1ª vez)

```bash
git add .
git commit -m "Preparando para o deploy online - v1.0"
git push origin main
```

---

## Fluxo Contínuo (Sempre que terminar uma funcionalidade)

```bash
git status
git add .
git commit -m "Descreve o que fizeste aqui"
git push origin main
```

---

## Verificações

### Ver status do repositório
```bash
git status
```

### Ver histórico de commits
```bash
git log --oneline
```

### Testar servidor localmente antes de fazer push
```bash
npm run dev
```

---

## Environment Variables para Vercel

Copia estes dados para adicionar na Vercel (Settings > Environment Variables):

```
DATABASE_URL=postgresql://username:password@localhost:5432/database
NODE_ENV=production
JWT_SECRET=teu_secret_aqui
PORT=3001
```

---

## URLs Importantes

- **GitHub**: https://github.com/teu-usuario/teu-repo
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Domínio Final**: https://teusistema.com.br (quando DNS estiver ativo)
- **Teste Inicial**: https://seu-projeto.vercel.app

---

## Dúvidas Frequentes Rápidas

**P: Quanto tempo demora a atualizar após um git push?**
R: 1-3 minutos geralmente.

**P: Preciso fazer logout ou fechar o VS Code?**
R: Não, tudo funciona automaticamente em background.

**P: Posso fazer rollback se algo der errado?**
R: Sim, na Vercel > Deployments, clica no anterior.

**P: E se esquecer de fazer git push?**
R: O site não atualiza. Lembra-te: código local ≠ código online sem git push.
