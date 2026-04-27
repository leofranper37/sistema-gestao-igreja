(function () {
    const ROLE_FEATURES = {
        admin: ['dashboard', 'membros', 'visitantes', 'criancas', 'oracoes', 'agenda', 'missionarios', 'igrejas', 'financeiro', 'cargos', 'midia', 'configuracoes', 'whatsapp', 'autocadastro', 'portaria_qr', 'pagamentos', 'app_midia', 'telao'],
        secretaria: ['dashboard', 'membros', 'visitantes', 'criancas', 'oracoes', 'agenda', 'missionarios', 'igrejas', 'financeiro', 'cargos', 'midia', 'whatsapp', 'autocadastro', 'portaria_qr', 'pagamentos', 'app_midia', 'telao'],
        pastor: ['dashboard', 'membros', 'visitantes', 'criancas', 'oracoes', 'agenda', 'missionarios', 'igrejas', 'cargos', 'whatsapp', 'autocadastro', 'app_midia', 'telao'],
        oficial: ['membros', 'visitantes', 'agenda', 'oracoes', 'portaria_qr'],
        ministerio: ['membros', 'oracoes', 'agenda', 'criancas'],
        midia: ['agenda', 'membros', 'midia', 'app_midia', 'telao'],
        membro: ['oracoes', 'agenda'],
        visitante: ['oracoes', 'agenda']
    };

    const ROLE_ALIASES = {
        administrador: 'admin',
        adm: 'admin',
        tesouraria: 'financeiro',
        financeiro: 'financeiro',
        secretaria: 'secretaria',
        pastor: 'pastor',
        oficial: 'oficial',
        ministerio: 'ministerio',
        midia: 'midia',
        membro: 'membro',
        visitante: 'visitante'
    };

    const PLAN_CAPABILITIES = {
        eden: {
            contabilidade: false,
            graficos: false,
            relatorios: false,
            grupos: true,
            ebd: true
        },
        hebrom: {
            contabilidade: false,
            graficos: false,
            relatorios: false,
            grupos: false,
            ebd: false
        },
        betel: {
            contabilidade: false,
            graficos: false,
            relatorios: false,
            grupos: true,
            ebd: false
        },
        siao: {
            contabilidade: true,
            graficos: true,
            relatorios: true,
            grupos: true,
            ebd: true
        },
        'teste-7-dias': {
            contabilidade: false,
            graficos: false,
            relatorios: false,
            grupos: false,
            ebd: false
        },
        gratis: {
            contabilidade: false,
            graficos: false,
            relatorios: false,
            grupos: false,
            ebd: false
        }
    };

    function getAuthUser() {
        if (typeof window.getStoredAuth !== 'function') {
            return null;
        }

        return window.getStoredAuth()?.user || null;
    }

    function getUserLabel(user) {
        return user?.name || user?.nome || user?.email || 'Leonardo';
    }

    function getUserRole(user) {
        const rawRole = String(user?.role || user?.perfil || '').trim().toLowerCase();
        return ROLE_ALIASES[rawRole] || rawRole || 'visitante';
    }

    function getVisibleFeatures(user) {
        const role = getUserRole(user);

        if (ROLE_FEATURES[role]) {
            return ROLE_FEATURES[role];
        }

        // Keep authenticated users productive even if backend sends a custom role label.
        if (user) {
            return ROLE_FEATURES.admin;
        }

        return ROLE_FEATURES.visitante;
    }

    let shellMenuOverridesMap = new Map();

    function setShellMenuOverrides(config) {
        const list = Array.isArray(config?.factory?.menuOverrides) ? config.factory.menuOverrides : [];
        shellMenuOverridesMap = new Map(
            list
                .filter((item) => item && item.key)
                .map((item) => [String(item.key).trim().toLowerCase(), item])
        );
    }

    function getMenuOverrideByHref(href) {
        const key = normalizePath(href).split('?')[0].toLowerCase();
        return shellMenuOverridesMap.get(key) || null;
    }

    function applyMenuOverrideToItem(item) {
        const override = getMenuOverrideByHref(item?.href);
        if (!override) {
            return item;
        }

        return {
            ...item,
            label: String(override.customLabel || '').trim() || item.label,
            href: String(override.customRoute || '').trim() || item.href,
            hidden: Boolean(override.hidden),
            featured: Boolean(override.featured)
        };
    }

    function normalizeLinkItem(item) {
        if (Array.isArray(item)) {
            const [href, icon, label, feature] = item;
            return applyMenuOverrideToItem({ href, icon, label, feature });
        }

        return applyMenuOverrideToItem(item || {});
    }

    function canAccessFeature(user, feature) {
        if (!feature) {
            return true;
        }

        return getVisibleFeatures(user).includes(feature);
    }

    function getPlanSlug(user) {
        return String(user?.plano || '').trim().toLowerCase() || 'gratis';
    }

    function getPlanCapability(user, capability) {
        const slug = getPlanSlug(user);
        const caps = PLAN_CAPABILITIES[slug] || PLAN_CAPABILITIES.gratis;
        return !!caps[capability];
    }

    function getModuleAccess(user, moduleKey) {
        if (user?.role === 'super-admin') {
            return true;
        }

        const modules = user?.modules;
        if (modules && typeof modules === 'object' && moduleKey in modules) {
            return !!modules[moduleKey];
        }

        // Se não vier no token/session, mantém compatibilidade sem bloquear por engano.
        return true;
    }

    const RESTRICTED_PATH_RULES = [
        { regex: /^app_membro\.html$/, label: 'App do Membro', moduleKey: 'appMembro' },
        { regex: /^app_midia\.html$/, label: 'App Mídia', moduleKey: 'appMidia' },
        { regex: /^agenda\.html$/, label: 'Agenda e Eventos', moduleKey: 'agendaEventos' },
        { regex: /^escalas\.html$/, label: 'Escalas de Culto', moduleKey: 'escalaCulto' },
        { regex: /^oracoes\.html$/, label: 'Pedidos de Oração', moduleKey: 'pedidosOracao' },
        { regex: /^grupos\.html$|^grupos_categorias\.html$|^grupos_reunioes\.html$/, label: 'Grupos e Células', capability: 'grupos' },
        { regex: /^ebd_.*\.html$/, label: 'EBD', capability: 'ebd' },
        { regex: /^plano_contas\.html$|^balancete_abertura\.html$|^lancamentos_contabeis\.html$|^encerramento_exercicio\.html$|^relatorios_contabilidade\.html$/, label: 'Contabilidade', capability: 'contabilidade' },
        { regex: /^graficos_secretaria\.html$|^graficos_tesouraria\.html$/, label: 'Gráficos Avançados', capability: 'graficos' },
        { regex: /^relatorios_secretaria\.html$|^relatorios_tesouraria\.html$/, label: 'Relatórios Avançados', capability: 'relatorios' }
    ];

    function getRestrictionForPath(path, user) {
        const normalized = normalizePath(path).split('?')[0];
        const rule = RESTRICTED_PATH_RULES.find((item) => item.regex.test(normalized));
        if (!rule) {
            return null;
        }

        if (rule.moduleKey && !getModuleAccess(user, rule.moduleKey)) {
            return {
                feature: rule.label,
                reason: 'module',
                from: normalized
            };
        }

        if (rule.capability && !getPlanCapability(user, rule.capability)) {
            return {
                feature: rule.label,
                reason: 'plan',
                from: normalized
            };
        }

        return null;
    }

    function showUpgradeNotice(restriction) {
        if (!restriction) {
            return;
        }

        const existing = document.getElementById('ldfpUpgradePrompt');
        if (existing) {
            existing.remove();
        }

        const wrapper = document.createElement('div');
        wrapper.id = 'ldfpUpgradePrompt';
        wrapper.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,.62);z-index:2600;display:flex;align-items:center;justify-content:center;padding:16px;';

        const card = document.createElement('div');
        card.style.cssText = 'width:min(540px,100%);background:#fff;border-radius:14px;border:1px solid #dbe3ef;box-shadow:0 22px 56px rgba(2,6,23,.35);padding:18px;';
        card.innerHTML = `
            <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;"><i class="fa-solid fa-lock"></i> Recurso não contratado</h3>
            <p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.6;">
                O recurso <strong>${restriction.feature}</strong> não está disponível no plano atual da sua igreja.
                Você pode comparar os planos e fazer upgrade agora.
            </p>
            <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                <button id="ldfpUpgradeCancel" style="border:1px solid #dbe3ef;background:#fff;color:#334155;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer;">Agora não</button>
                <button id="ldfpUpgradeGo" style="border:0;background:linear-gradient(135deg,#22d3ee,#0ea5e9);color:#082f49;border-radius:8px;padding:9px 12px;font-weight:800;cursor:pointer;">Alterar plano</button>
            </div>
        `;

        wrapper.appendChild(card);
        document.body.appendChild(wrapper);

        const toUpgradeUrl = `meu_plano.html?upgrade=1&feature=${encodeURIComponent(restriction.feature)}&from=${encodeURIComponent(restriction.from || '')}`;

        card.querySelector('#ldfpUpgradeCancel').addEventListener('click', () => wrapper.remove());
        card.querySelector('#ldfpUpgradeGo').addEventListener('click', () => {
            window.location.href = toUpgradeUrl;
        });
    }

    function bindPlanUpgradeGuards(user, activePath) {
        const sidebar = document.getElementById('enterpriseSidebar');
        if (!sidebar) {
            return;
        }

        sidebar.querySelectorAll('a[href]').forEach((anchor) => {
            const href = anchor.getAttribute('href') || '';
            const restriction = getRestrictionForPath(href, user);
            if (!restriction) {
                return;
            }

            anchor.classList.add('locked-by-plan');
            anchor.title = `${restriction.feature} não disponível no seu plano atual.`;
            anchor.addEventListener('click', (event) => {
                event.preventDefault();
                showUpgradeNotice(restriction);
            });
        });

        const currentRestriction = getRestrictionForPath(activePath, user);
        if (currentRestriction && !/^meu_plano\.html$/i.test(normalizePath(activePath))) {
            showUpgradeNotice(currentRestriction);
        }
    }

    function filterLinksByRole(links, user) {
        return links
            .map(normalizeLinkItem)
            .filter((item) => !item.hidden)
            .filter((item) => canAccessFeature(user, item.feature));
    }

    function normalizePath(href) {
        const raw = String(href || '').trim();
        if (!raw) {
            return '';
        }

        try {
            const url = new URL(raw, window.location.origin + window.location.pathname);
            const fileName = url.pathname.split('/').pop() || '';
            return `${fileName}${url.search}`;
        } catch (_error) {
            return raw.replace(/^\.\//, '');
        }
    }

    function isLinkActive(href, activePath) {
        return normalizePath(href) === normalizePath(activePath);
    }

    function renderLegacyGroup(title, icon, links, activePath, openByDefault = false, user = null) {
        const allowedLinks = filterLinksByRole(links, user);
        if (!allowedLinks.length) {
            return '';
        }

        const hasActiveLink = allowedLinks.some(({ href }) => isLinkActive(href, activePath));
        const buttonClass = hasActiveLink ? 'dropdown-btn active' : 'dropdown-btn';
        const displayStyle = hasActiveLink || openByDefault ? 'display: block;' : 'display: none;';

        const linksHtml = allowedLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        return `
            <button class="${buttonClass}" type="button">
                <span><i class="${icon} icon-left"></i> ${title}</span>
                <i class="fa-solid fa-chevron-right arrow"></i>
            </button>
            <div class="dropdown-container" style="${displayStyle}">
                ${linksHtml}
            </div>
        `;
    }

    function renderSecretariaGroup(activePath, user) {
        const pessoasLinks = [
            // Membros
            ['lista_membros.html',    'fa-solid fa-users',            'Membros',             'membros'],
            ['membros.html',          'fa-solid fa-id-card',          'Ficha Cadastral',     'membros'],
            ['congregados.html',      'fa-solid fa-user-clock',       'Congregados',         'membros'],
            ['visitantes.html',       'fa-solid fa-walking',          'Visitantes',          'visitantes'],
            ['criancas.html',         'fa-solid fa-child-reaching',   'Crianças',            'criancas'],
            // Registros / Config
            ['cargos.html',           'fa-solid fa-medal',            'Cargos',              'membros'],
            ['situacoes.html',        'fa-solid fa-circle-dot',       'Situações',           'membros'],
            ['congregacoes.html',     'fa-solid fa-map-pin',          'Congregações',        'membros'],
            ['tipos_admissao.html',   'fa-solid fa-door-open',        'Tipos de Admissão',   'membros'],
            // Histórico
            ['historico_pastoral.html', 'fa-solid fa-scroll',         'Histórico Pastoral',  'membros'],
            ['tipos_historico.html',  'fa-solid fa-bookmark',         'Tipos de Histórico',  'membros']
        ];

        const organizacaoLinks = [
            ['grupos.html',               'fa-solid fa-people-group',   'Grupos / Células',    'membros'],
            ['grupos_categorias.html',    'fa-solid fa-folder-tree',    'Categorias de Grupos','membros'],
            ['grupos_reunioes.html',      'fa-solid fa-comments',       'Reuniões de Grupos',  'membros'],
            ['escalas.html',              'fa-solid fa-clipboard-list', 'Escalas',             'agenda'],
            ['batismos.html',             'fa-solid fa-water',          'Batismos',            'membros'],
            ['batismos_inscricoes.html',  'fa-solid fa-pen-to-square',  'Inscrições de Batismo','membros'],
            ['agenda.html',               'fa-solid fa-calendar-days',  'Agenda',              'agenda']
        ];

        const espiritualidadeLinks = [
            ['ebd_turmas.html',  'fa-solid fa-chalkboard-user', 'EBD — Turmas',        'criancas'],
            ['ebd_alunos.html',  'fa-solid fa-user-graduate',   'EBD — Alunos',        'criancas'],
            ['ebd_grades.html',  'fa-solid fa-table-cells',     'EBD — Grades',        'criancas'],
            ['oracoes.html',     'fa-solid fa-hands-praying',   'Orações',             'oracoes'],
            ['missionarios.html','fa-solid fa-globe',           'Missionários',        'missionarios'],
            ['outras_igrejas.html','fa-solid fa-church',        'Outras Igrejas',      'igrejas']
        ];

        const allowedPessoasLinks = filterLinksByRole(pessoasLinks, user);
        const allowedOrganizacaoLinks = filterLinksByRole(organizacaoLinks, user);
        const allowedEspiritualidadeLinks = filterLinksByRole(espiritualidadeLinks, user);

        const allLinks = [
            ...allowedPessoasLinks,
            ...allowedOrganizacaoLinks,
            ...allowedEspiritualidadeLinks
        ];

        if (!allLinks.length) {
            return '';
        }

        const secretariaHasActive = allLinks.some(({ href }) => isLinkActive(href, activePath));
        const pessoasActive = allowedPessoasLinks.some(({ href }) => isLinkActive(href, activePath));
        const organizacaoActive = allowedOrganizacaoLinks.some(({ href }) => isLinkActive(href, activePath));
        const espiritualidadeActive = allowedEspiritualidadeLinks.some(({ href }) => isLinkActive(href, activePath));

        const pessoasHtml = allowedPessoasLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const organizacaoHtml = allowedOrganizacaoLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const espiritualidadeHtml = allowedEspiritualidadeLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        return `
            <button class="dropdown-btn ${secretariaHasActive ? 'active' : ''}" type="button">
                <span><i class="fa-solid fa-folder-open icon-left"></i> Secretaria</span>
                <i class="fa-solid fa-chevron-right arrow"></i>
            </button>
            <div class="dropdown-container" style="${secretariaHasActive ? 'display: block;' : 'display: none;'}">
                ${allowedPessoasLinks.length ? `<button class="sub-dropdown-btn ${pessoasActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-address-book icon-left"></i> Pessoas</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${pessoasActive ? 'display: block;' : 'display: none;'}">
                    ${pessoasHtml}
                </div>` : ''}

                ${allowedOrganizacaoLinks.length ? `<button class="sub-dropdown-btn ${organizacaoActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-calendar-check icon-left"></i> Organização e Eventos</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${organizacaoActive ? 'display: block;' : 'display: none;'}">
                    ${organizacaoHtml}
                </div>` : ''}

                ${allowedEspiritualidadeLinks.length ? `<button class="sub-dropdown-btn ${espiritualidadeActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-book-open-reader icon-left"></i> Espiritualidade e Comunhão</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${espiritualidadeActive ? 'display: block;' : 'display: none;'}">
                    ${espiritualidadeHtml}
                </div>` : ''}
            </div>
        `;
    }

    function renderTesourariaGroup(activePath, user) {
        const dizimosLinks = [
            ['dizimos.html', 'fa-solid fa-hand-holding-dollar', 'Lançamentos de Dízimos', 'financeiro'],
            ['tipos_receitas.html', 'fa-solid fa-tags', 'Tipos de Receitas', 'financeiro']
        ];

        const caixaLinks = [
            ['financeiro.html', 'fa-solid fa-cash-register', 'Visão Geral do Caixa', 'financeiro'],
            ['caixa_lancamentos.html', 'fa-solid fa-file-invoice', 'Lançamentos do Caixa', 'financeiro'],
            ['caixa_ativar_mes.html', 'fa-solid fa-calendar-check', 'Ativar Mês do Caixa', 'financeiro'],
            ['caixa_saldo_inicial.html', 'fa-solid fa-circle-dollar-to-slot', 'Saldo Inicial do Caixa', 'financeiro']
        ];

        const bancosLinks = [
            ['bancos_lancamentos.html', 'fa-solid fa-file-invoice-dollar', 'Lançamentos Bancários', 'financeiro'],
            ['banco.html', 'fa-solid fa-building-columns', 'Cadastro de Bancos', 'financeiro'],
            ['importacao_extrato.html', 'fa-solid fa-file-import', 'Importação de Extrato', 'financeiro']
        ];

        const otherLinks = [
            ['pagamentos.html', 'fa-solid fa-link', 'Links de Pagamento', 'pagamentos'],
            ['contas_pagar.html', 'fa-solid fa-file-invoice-dollar', 'Contas a Pagar', 'financeiro'],
            ['recibo.html', 'fa-solid fa-receipt', 'Recibo'],
            ['transferencias.html', 'fa-solid fa-right-left', 'Transferências']
        ];

        const allowedDizimosLinks = filterLinksByRole(dizimosLinks, user);
        const allowedCaixaLinks = filterLinksByRole(caixaLinks, user);
        const allowedBancosLinks = filterLinksByRole(bancosLinks, user);
        const allowedOtherLinks = filterLinksByRole(otherLinks, user);

        if (!allowedDizimosLinks.length && !allowedCaixaLinks.length && !allowedBancosLinks.length && !allowedOtherLinks.length) {
            return '';
        }

        const dizimosActive = allowedDizimosLinks.some(({ href }) => isLinkActive(href, activePath));
        const caixaActive = allowedCaixaLinks.some(({ href }) => isLinkActive(href, activePath));
        const bancosActive = allowedBancosLinks.some(({ href }) => isLinkActive(href, activePath));
        const tesourariaActive = dizimosActive || caixaActive || bancosActive || allowedOtherLinks.some(({ href }) => isLinkActive(href, activePath));
        const tesourariaDisplay = tesourariaActive ? 'display: block;' : 'display: none;';

        const dizimosHtml = allowedDizimosLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const caixaHtml = allowedCaixaLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const bancosHtml = allowedBancosLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const otherHtml = allowedOtherLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        return `
            <button class="dropdown-btn ${tesourariaActive ? 'active' : ''}" type="button">
                <span><i class="fa-solid fa-money-bill-1 icon-left"></i> Tesouraria</span>
                <i class="fa-solid fa-chevron-right arrow"></i>
            </button>
            <div class="dropdown-container" style="${tesourariaDisplay}">
                ${allowedDizimosLinks.length ? `<button class="sub-dropdown-btn ${dizimosActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-coins icon-left"></i> Dízimos</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${dizimosActive ? 'display: block;' : 'display: none;'}">
                    ${dizimosHtml}
                </div>` : ''}

                ${allowedCaixaLinks.length ? `<button class="sub-dropdown-btn ${caixaActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-cash-register icon-left"></i> Caixa</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${caixaActive ? 'display: block;' : 'display: none;'}">
                    ${caixaHtml}
                </div>` : ''}

                ${allowedBancosLinks.length ? `<button class="sub-dropdown-btn ${bancosActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-building-columns icon-left"></i> Bancos</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${bancosActive ? 'display: block;' : 'display: none;'}">
                    ${bancosHtml}
                </div>` : ''}

                ${otherHtml}
            </div>
        `;
    }

    function renderSidebar(activePath, user) {
        return `
            <aside class="sidebar enterprise-sidebar legacy-shell-sidebar" id="enterpriseSidebar">
                <div class="sidebar-profile">
                    <div class="profile-avatar"><i class="fa-solid fa-user"></i></div>
                    <div class="profile-info">
                        <h4 id="sidebarUserName">LEONARDO FRANCISCO PEREIRA</h4>
                        <span>Online</span>
                    </div>
                </div>

                <nav class="menu">
                    ${renderLegacyGroup('Menu LDFP', 'fa-solid fa-house', [
                        ['dashboard.html', 'fa-regular fa-eye', 'Visão Geral', 'dashboard'],
                        ['app_membro.html', 'fa-solid fa-mobile-screen-button', 'App do Membro'],
                        ['acervo_modulos.html', 'fa-solid fa-cubes-stacked', 'Acervo de Modulos'],
                        ['novidades.html', 'fa-solid fa-star', 'Novidades'],
                        ['meu_plano.html', 'fa-solid fa-credit-card', 'Meu Plano'],
                        ['configuracoes.html', 'fa-solid fa-gear', 'Configurações', 'configuracoes'],
                        ['index.html', 'fa-solid fa-right-from-bracket', 'Sair']
                    ], activePath, true, user)}

                    ${renderSecretariaGroup(activePath, user)}

                    ${renderTesourariaGroup(activePath, user)}

                    ${renderLegacyGroup('Contabilidade', 'fa-solid fa-scale-balanced', [
                        ['plano_contas.html', 'fa-solid fa-list-ol', 'Plano de Contas'],
                        ['balancete_abertura.html', 'fa-solid fa-book-open', 'Balancete de Abertura'],
                        ['lancamentos_contabeis.html', 'fa-solid fa-clipboard-list', 'Lançamentos Contábeis'],
                        ['encerramento_exercicio.html', 'fa-solid fa-flag-checkered', 'Encerramento do Exercício']
                    ], activePath, false, user)}

                    ${renderLegacyGroup('Gráficos', 'fa-solid fa-chart-column', [
                        ['graficos_secretaria.html', 'fa-solid fa-chart-pie', 'Secretaria'],
                        ['graficos_tesouraria.html', 'fa-solid fa-chart-line', 'Tesouraria']
                    ], activePath, false, user)}

                    ${renderLegacyGroup('Relatórios', 'fa-solid fa-print', [
                        ['relatorios_secretaria.html', 'fa-regular fa-file-lines', 'Secretaria'],
                        ['relatorios_tesouraria.html', 'fa-regular fa-file-lines', 'Tesouraria'],
                        ['relatorios_contabilidade.html', 'fa-regular fa-file-lines', 'Contabilidade']
                    ], activePath, false, user)}
                </nav>

                <div class="sidebar-footer">
                    Copyright © 2026 LDFP.<br>Todos os Direitos Reservados.
                </div>
            </aside>
        `;
    }

    function renderHeader(config) {
        return `
            <header class="enterprise-top-header">
                <div class="enterprise-top-left">
                    <button class="enterprise-menu-toggle" id="menuToggle" type="button" aria-label="Alternar menu">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div>
                        <div class="enterprise-breadcrumb">${config.breadcrumb}</div>
                        <h1>${config.title}</h1>
                    </div>
                </div>
                <div class="enterprise-top-right">
                    <div class="enterprise-header-chip">
                        <i class="fa-solid fa-shield-heart"></i>
                        <span>${config.chipText}</span>
                    </div>
                    <div class="enterprise-header-user">
                        <strong id="headerUserName">Leonardo</strong>
                        <span>${config.roleLabel}</span>
                    </div>
                </div>
            </header>
        `;
    }

    function applyUserLabels() {
        const user = getAuthUser();
        const label = getUserLabel(user);
        const role = getUserRole(user);
        const sidebarUserName = document.getElementById('sidebarUserName');
        const headerUserName = document.getElementById('headerUserName');
        const roleTargets = document.querySelectorAll('[data-user-role]');

        if (sidebarUserName) {
            sidebarUserName.textContent = String(label).toUpperCase();
        }

        if (headerUserName) {
            headerUserName.textContent = label;
        }

        roleTargets.forEach((target) => {
            target.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        });
    }

    let globalSystemConfigCache = null;

    async function loadGlobalSystemConfig() {
        if (globalSystemConfigCache) {
            return globalSystemConfigCache;
        }

        const response = await fetch('/api/public/system-config');
        if (!response.ok) {
            throw new Error('Falha ao carregar configuração global.');
        }

        const payload = await response.json();
        globalSystemConfigCache = payload;
        return payload;
    }

    function getAnnouncementColors(tone) {
        const normalized = String(tone || 'info').toLowerCase();
        if (normalized === 'success') {
            return { bg: '#ecfdf5', border: '#86efac', text: '#14532d', icon: 'fa-circle-check' };
        }
        if (normalized === 'warning') {
            return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: 'fa-triangle-exclamation' };
        }
        if (normalized === 'danger') {
            return { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: 'fa-triangle-exclamation' };
        }
        return { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', icon: 'fa-circle-info' };
    }

    function renderSiaoWorkspaceSpotlight(user, config) {
        const customConfig = user?.customConfig || {};
        const isSiao = getPlanSlug(user) === 'siao';
        const isActive = Boolean(customConfig?.perfilPersonalizadoAtivo);
        if (!isSiao || !isActive) {
            return null;
        }

        const workspaceTitle = String(customConfig?.nomeWorkspace || '').trim() || 'Sião Personalizado';
        const welcomeMessage = String(customConfig?.mensagemBoasVindas || '').trim() || 'Ambiente premium liberado para sua igreja.';
        const accent = String(customConfig?.corDestaque || '').trim() || '#2563eb';
        const planSlug = getPlanSlug(user);
        const publishedFactoryModules = Array.isArray(config?.factory?.publishedModules)
            ? config.factory.publishedModules.filter((item) => {
                const plans = Array.isArray(item?.targetPlans) ? item.targetPlans : ['siao'];
                return plans.includes(planSlug);
            }).slice(0, 6)
            : [];

        const innovations = Array.isArray(customConfig?.inovacoesHabilitadas)
            ? customConfig.inovacoesHabilitadas.filter(Boolean).slice(0, 6)
            : [];

        const wrapper = document.createElement('section');
        wrapper.id = 'ldfpSiaoWorkspaceSpotlight';
        wrapper.style.cssText = `margin:16px 20px 10px;border-radius:18px;padding:18px 20px;border:1px solid ${accent}33;background:linear-gradient(135deg, ${accent}1f 0%, #ffffff 52%, #e2e8f0 100%);box-shadow:0 18px 40px rgba(15,23,42,.08);`;

        const innovationHtml = innovations.length
            ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">${innovations.map((item) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#ffffff;border:1px solid ${accent}2f;color:#0f172a;font-size:12px;font-weight:700;"><i class=\"fa-solid fa-sparkles\" style=\"color:${accent}\"></i>${item}</span>`).join('')}</div>`
            : '';

        const publishedHtml = publishedFactoryModules.length
            ? `<div style="margin-top:14px;display:grid;gap:8px;">${publishedFactoryModules.map((mod) => {
                const target = String(mod?.route || '').trim() || '#';
                return `<a href="${target}" style="display:block;padding:10px 12px;border-radius:10px;background:#ffffff;border:1px solid ${accent}2f;color:#0f172a;text-decoration:none;font-size:12px;font-weight:700;"><i class=\"fa-solid fa-flask-vial\" style=\"color:${accent};margin-right:6px\"></i>${String(mod?.name || 'Inovacao')}</a>`;
            }).join('')}</div>`
            : '';

        wrapper.innerHTML = `
            <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;">
                <div style="max-width:720px;">
                    <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#ffffff;color:${accent};font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;">
                        <i class="fa-solid fa-crown"></i>
                        Workspace Premium Sião
                    </div>
                    <h2 style="margin:12px 0 6px;font-size:24px;line-height:1.15;color:#0f172a;">${workspaceTitle}</h2>
                    <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">${welcomeMessage}</p>
                    ${innovationHtml}
                    ${publishedHtml}
                </div>
                <div style="min-width:220px;display:grid;gap:10px;">
                    <div style="padding:12px 14px;border-radius:14px;background:#ffffff;border:1px solid ${accent}24;">
                        <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.04em;">Plano ativo</div>
                        <div style="margin-top:6px;font-size:15px;font-weight:800;color:#0f172a;">Sião com identidade própria</div>
                    </div>
                    <div style="padding:12px 14px;border-radius:14px;background:#ffffff;border:1px solid ${accent}24;">
                        <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.04em;">Cor destaque</div>
                        <div style="margin-top:8px;display:flex;align-items:center;gap:10px;font-size:13px;color:#0f172a;font-weight:700;">
                            <span style="width:18px;height:18px;border-radius:999px;background:${accent};border:1px solid rgba(15,23,42,.12);"></span>
                            ${accent}
                        </div>
                    </div>
                </div>
            </div>
        `;

        return wrapper;
    }

    function applyGlobalSystemConfig(config, user) {
        if (!config || typeof config !== 'object') {
            return;
        }

        setShellMenuOverrides(config);

        const customConfig = user?.customConfig || {};
        const brandName = String(config?.branding?.brandName || '').trim();
        const workspaceTitle = customConfig?.perfilPersonalizadoAtivo
            ? String(customConfig?.nomeWorkspace || '').trim()
            : '';
        if (workspaceTitle) {
            document.documentElement.style.setProperty('--ldfp-custom-accent', String(customConfig?.corDestaque || '').trim() || '#2563eb');
            const normalizedTitle = document.title.replace(/\bLDFP\b/gi, workspaceTitle);
            document.title = normalizedTitle;
        } else if (brandName) {
            const normalizedTitle = document.title.replace(/\bLDFP\b/gi, brandName);
            document.title = normalizedTitle;
        }

        const headerChip = document.querySelector('.enterprise-header-chip span');
        const headerChipContainer = document.querySelector('.enterprise-header-chip');
        const isSiao = getPlanSlug(user) === 'siao';
        if (headerChip && config?.plans?.siaoCustomProfileEnabled && isSiao) {
            headerChip.textContent = workspaceTitle
                || String(config?.plans?.siaoCustomProfileLabel || 'Perfil Personalizado Sião');
        }

        if (headerChipContainer && workspaceTitle) {
            const accent = String(customConfig?.corDestaque || '').trim() || '#2563eb';
            headerChipContainer.style.borderColor = `${accent}55`;
            headerChipContainer.style.background = `${accent}14`;
            headerChipContainer.style.color = accent;
        }

        const bannerEnabled = Boolean(config?.branding?.globalAnnouncementEnabled) || Boolean(customConfig?.perfilPersonalizadoAtivo && customConfig?.mensagemBoasVindas);
        const bannerText = String(customConfig?.perfilPersonalizadoAtivo ? (customConfig?.mensagemBoasVindas || '') : (config?.branding?.globalAnnouncementText || '')).trim();
        const existingBanner = document.getElementById('ldfpGlobalAnnouncement');
        const existingSpotlight = document.getElementById('ldfpSiaoWorkspaceSpotlight');
        if (existingBanner) {
            existingBanner.remove();
        }
        if (existingSpotlight) {
            existingSpotlight.remove();
        }

        const main = document.querySelector('main.enterprise-main') || document.querySelector('main.main-content');
        if (!main) {
            return;
        }

        const spotlight = renderSiaoWorkspaceSpotlight(user, config);
        if (spotlight) {
            const header = main.querySelector('.enterprise-top-header');
            if (header) {
                header.insertAdjacentElement('afterend', spotlight);
            } else {
                main.insertAdjacentElement('afterbegin', spotlight);
            }
        }

        if (!bannerEnabled || !bannerText) {
            return;
        }

        const palette = getAnnouncementColors(config?.branding?.globalAnnouncementTone);

        const banner = document.createElement('div');
        banner.id = 'ldfpGlobalAnnouncement';
        banner.style.cssText = `margin:12px 20px 6px;padding:10px 12px;border-radius:10px;border:1px solid ${palette.border};background:${palette.bg};color:${palette.text};font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;`;
        banner.innerHTML = `<i class="fa-solid ${palette.icon}"></i><span>${bannerText}</span>`;
        main.insertAdjacentElement('afterbegin', banner);
    }

    function bindMenuToggle() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('enterpriseSidebar');
        if (!menuToggle || !sidebar) {
            return;
        }

        // Inicializa estado dos containers: abrir somente se a página atual estiver no submenu
        sidebar.querySelectorAll('.dropdown-container').forEach((container) => {
            const prevBtn = container.previousElementSibling;
            const inlineOpen = container.style.display === 'block';
            const hasCurrentClass = !!container.querySelector('a.current-page, a.active-link');
            const hrefMatch = Array.from(container.querySelectorAll('a')).some(a => {
                try {
                    return new URL(a.getAttribute('href'), window.location.origin).pathname === window.location.pathname;
                } catch (e) {
                    return false;
                }
            });

            if (hasCurrentClass || hrefMatch || (prevBtn && prevBtn.classList.contains('active')) || inlineOpen) {
                container.classList.add('is-open');
                if (prevBtn) prevBtn.classList.add('active');
            } else {
                container.classList.remove('is-open');
                if (prevBtn) prevBtn.classList.remove('active');
            }
            // Remove o inline style para que a classe CSS is-open controle a visibilidade
            container.style.display = '';
        });

        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('is-open');
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 1080) {
                sidebar.classList.remove('is-open');
            }
        });

        // Ao clicar em um botão principal, abre só o correspondente e fecha os outros
        sidebar.querySelectorAll('.dropdown-btn').forEach((button) => {
            button.addEventListener('click', function () {
                const isOpening = !this.classList.contains('active');

                sidebar.querySelectorAll('.dropdown-btn').forEach((otherButton) => {
                    if (otherButton !== this) {
                        otherButton.classList.remove('active');
                        const otherContainer = otherButton.nextElementSibling;
                        if (otherContainer && otherContainer.classList.contains('dropdown-container')) {
                            otherContainer.classList.remove('is-open');
                            otherContainer.style.display = 'none';
                        }
                    }
                });

                const container = this.nextElementSibling;
                if (!container || !container.classList.contains('dropdown-container')) {
                    return;
                }

                this.classList.toggle('active', isOpening);
                container.classList.toggle('is-open', isOpening);
                container.style.display = isOpening ? 'block' : 'none';
            });
        });

        // Sub-dropdowns continuam usando a lógica de exibição interna (se houver)
        sidebar.querySelectorAll('.sub-dropdown-btn').forEach((button) => {
            button.addEventListener('click', function () {
                const container = this.nextElementSibling;
                if (!container || !container.classList.contains('sub-dropdown-container')) {
                    return;
                }

                const isOpening = !this.classList.contains('active');
                this.classList.toggle('active', isOpening);
                container.style.display = isOpening ? 'block' : 'none';
            });
        });

    }

    function initShell() {
        if (document.getElementById('enterpriseSidebar')) {
            return;
        }

        const main = document.querySelector('main.enterprise-main') || document.querySelector('main.main-content');
        if (!main) {
            return;
        }

        const body = document.body;
        const currentPath = `${window.location.pathname.split('/').pop() || 'dashboard.html'}${window.location.search || ''}`;
        const activePath = body.dataset.shellActive || currentPath;
        const config = {
            title: body.dataset.shellTitle || 'Painel de Controle',
            breadcrumb: body.dataset.shellBreadcrumb || 'LDFP / Visão Geral',
            chipText: body.dataset.shellChip || 'Ambiente autenticado',
            roleLabel: body.dataset.shellRole || (getUserRole(getAuthUser()).charAt(0).toUpperCase() + getUserRole(getAuthUser()).slice(1))
        };

        const bootShell = (configPayload) => {
            setShellMenuOverrides(configPayload || {});

            main.classList.add('enterprise-main');
            body.classList.add('legacy-sidebar-mode');
            body.insertAdjacentHTML('afterbegin', renderSidebar(activePath, getAuthUser()));
            main.insertAdjacentHTML('afterbegin', renderHeader(config));
            applyUserLabels();
            bindMenuToggle();
            bindPlanUpgradeGuards(getAuthUser(), activePath);

            if (configPayload) {
                applyGlobalSystemConfig(configPayload, getAuthUser());
            }
        };

        loadGlobalSystemConfig()
            .then((configPayload) => {
                bootShell(configPayload);
            })
            .catch(() => {
                // O shell continua funcional mesmo sem config global.
                bootShell(null);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShell);
    } else {
        initShell();
    }
})();