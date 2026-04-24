# 📊 Monitoramento com Vercel Speed Insights

## O que é Vercel Speed Insights?

Sistema automático que monitora a performance do seu site em produção:
- ⚡ **Core Web Vitals** (LCP, FID, CLS)
- 📈 **Real User Monitoring** (RUM)
- 🎯 **Performance Scores**
- 📍 **Análise por região**

## Status Atual

✅ Script `speed-insights.js` já está em `public/`  
✅ Referência em `public/index.html` (necessário confirmar)  
⏳ Precisa ativar no console Vercel  

## Passo 1: Ativar Speed Insights

1. Acesse: https://vercel.com/dashboard
2. Selecione **sistema-gestao-igreja**
3. Clique em **Settings** → **Analytics**
4. Ative **Web Analytics** (será feito automaticamente)

## Passo 2: Adicionar Script em Todas as Páginas

Adicione esta linha antes de `</body>` em TODAS as páginas HTML:

```html
<script defer src="/speed-insights.js"></script>
```

### Páginas Críticas a Verificar:
- [ ] public/index.html
- [ ] public/login.html
- [ ] public/planos.html
- [ ] public/criar_conta.html
- [ ] public/dashboard.html
- [ ] public/super-admin.htm
- [ ] Outras páginas importantes

## Passo 3: Dashboard de Analytics

Depois de ativar, visualize em:
- **URL:** https://vercel.com/dashboard/projects/sistema-gestao-igreja/analytics
- **Métricas monitoradas:**
  - Largest Contentful Paint (LCP) - Deve ser < 2.5s
  - First Input Delay (FID) - Deve ser < 100ms
  - Cumulative Layout Shift (CLS) - Deve ser < 0.1
  - First Contentful Paint (FCP)
  - Time to First Byte (TTFB)

## Integração Automática

O Vercel detecta automaticamente:
- ✅ Tempo de carregamento de página
- ✅ Erros JavaScript (via console.error)
- ✅ Requisições lentas (> 3s)
- ✅ Problemas de UX

## Alertas Automáticos

Configure alertas em: Dashboard → Settings → Alerts
- 🔴 Alerta se LCP > 3s
- 🟡 Alerta se CLS > 0.25
- 🟡 Alerta se TBF > 2s

## Dicas de Otimização

### 1. Imagens
```html
<!-- ❌ Ruim -->
<img src="logo.png" alt="logo">

<!-- ✅ Bom -->
<img src="logo.png" alt="logo" width="100" height="100">
```

### 2. CSS/JS Crítico
```html
<!-- Critíco - inline ou no <head> -->
<style>/* critical CSS */</style>

<!-- Não-crítico - defer -->
<script src="script.js" defer></script>
```

### 3. Fonts
```html
<!-- Otimizado -->
<link rel="preload" as="font" href="/font.woff2" crossorigin>
```

## Relatório Esperado

Após 1-2 dias de tráfego, você verá:
- 📊 Distribuição de performance por página
- 🌍 Performance por localização geográfica
- 📱 Comparação Desktop vs Mobile
- ⏱️ Tendências ao longo do tempo

## Troubleshooting

### "Sem dados de analytics"
- Verifique se Speed Insights está ativado
- Verifique se há tráfego no site
- Aguarde 24h para primeiros dados

### "Scores baixos"
- Otimize imagens (comprimir, redimensionar)
- Reduza JS/CSS não utilizado
- Use CDN para assets estáticos (Vercel faz isso automaticamente)

## Próximos Passos

1. ✅ Ativar Speed Insights no Vercel
2. ✅ Adicionar script em todas as páginas HTML
3. ✅ Monitorar métricas diariamente
4. ✅ Otimizar conforme necessário
5. ✅ Receber alertas automáticos

---

**Dashboard:** https://vercel.com/dashboard/projects/sistema-gestao-igreja/analytics
