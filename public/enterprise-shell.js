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

    function normalizeLinkItem(item) {
        if (Array.isArray(item)) {
            const [href, icon, label, feature] = item;
            return { href, icon, label, feature };
        }

        return item || {};
    }

    function canAccessFeature(user, feature) {
        if (!feature) {
            return true;
        }

        return getVisibleFeatures(user).includes(feature);
    }

    function filterLinksByRole(links, user) {
        return links
            .map(normalizeLinkItem)
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
        const membrosLinks = [
            ['membros.html', 'fa-regular fa-id-card', 'Ficha Cadastral', 'membros'],
            ['cadastro.html', 'fa-solid fa-file-pen', 'Ficha de Cadastro', 'membros'],
            ['cargos.html', 'fa-solid fa-briefcase', 'Cargos', 'cargos'],
            ['situacoes.html', 'fa-solid fa-toggle-on', 'Situações', 'membros'],
            ['congregacoes.html', 'fa-solid fa-church', 'Congregações', 'membros']
        ];

        const historicoLinks = [
            ['historico_pastoral.html', 'fa-solid fa-book-bible', 'Histórico Pastoral', 'membros'],
            ['tipos_historico.html', 'fa-solid fa-list-check', 'Tipo de Histórico', 'membros']
        ];

        const grupoLinks = [
            ['grupos.html', 'fa-solid fa-people-group', 'Grupos', 'membros'],
            ['grupo_novo.html', 'fa-solid fa-plus', 'Cadastro', 'membros'],
            ['grupos_categorias.html', 'fa-solid fa-tags', 'Categorias', 'membros'],
            ['grupos_reunioes.html', 'fa-solid fa-users-rectangle', 'Reuniões', 'membros']
        ];

        const escalaLinks = [
            ['escalas.html?tab=eventos', 'fa-regular fa-calendar', 'Eventos', 'agenda'],
            ['escalas.html?tab=dashboard', 'fa-solid fa-clipboard-list', 'Gestão de Escalas', 'agenda'],
            ['escalas.html?tab=matriz', 'fa-solid fa-calendar-days', 'Escala Mensal', 'agenda']
        ];

        const ebdLinks = [
            ['ebd_alunos.html', 'fa-solid fa-user-graduate', 'Alunos', 'criancas'],
            ['ebd_turmas.html', 'fa-solid fa-people-group', 'Turmas', 'criancas'],
            ['ebd_grades.html', 'fa-solid fa-table-cells-large', 'Grades EBD', 'criancas']
        ];

        const batismoLinks = [
            ['batismos.html', 'fa-solid fa-water', 'Batismos', 'membros'],
            ['batismo_novo.html', 'fa-solid fa-plus', 'Cadastrar', 'membros'],
            ['batismos_inscricoes.html', 'fa-solid fa-clipboard-check', 'Inscrições', 'membros']
        ];

        const otherLinks = [
            ['lista_membros.html', 'fa-solid fa-users', 'Lista de Membros', 'membros'],
            ['agenda.html', 'fa-solid fa-calendar-days', 'Agenda', 'agenda'],
            ['outras_igrejas.html', 'fa-solid fa-globe', 'Outras Igrejas', 'igrejas'],
            ['missionarios.html', 'fa-solid fa-person-rays', 'Missionários', 'missionarios'],
            ['visitantes.html', 'fa-solid fa-user-plus', 'Visitantes', 'visitantes'],
            ['congregados.html', 'fa-solid fa-people-arrows-left-right', 'Congregados', 'membros'],
            ['criancas.html', 'fa-solid fa-child-reaching', 'Crianças', 'criancas'],
            ['oracoes.html', 'fa-solid fa-hands-praying', 'Orações', 'oracoes'],
            ['comunicacao_whatsapp.html', 'fa-brands fa-whatsapp', 'WhatsApp', 'whatsapp'],
            ['autocadastro_aprovacoes.html', 'fa-solid fa-user-check', 'Aprovação de Cadastro', 'autocadastro'],
            ['portaria_checkin.html', 'fa-solid fa-qrcode', 'Portaria QR', 'portaria_qr'],
            ['app_midia.html', 'fa-solid fa-tv', 'App Midia', 'app_midia'],
            ['telao_visitantes.html', 'fa-solid fa-display', 'Telão', 'telao']
        ];

        const allowedMembrosLinks = filterLinksByRole(membrosLinks, user);
        const allowedHistoricoLinks = filterLinksByRole(historicoLinks, user);
        const allowedGrupoLinks = filterLinksByRole(grupoLinks, user);
        const allowedEscalaLinks = filterLinksByRole(escalaLinks, user);
        const allowedEbdLinks = filterLinksByRole(ebdLinks, user);
        const allowedBatismoLinks = filterLinksByRole(batismoLinks, user);
        const allowedOtherLinks = filterLinksByRole(otherLinks, user);

        const allLinks = [
            ...allowedMembrosLinks,
            ...allowedHistoricoLinks,
            ...allowedGrupoLinks,
            ...allowedEscalaLinks,
            ...allowedEbdLinks,
            ...allowedBatismoLinks,
            ...allowedOtherLinks
        ];

        if (!allLinks.length) {
            return '';
        }

        const secretariaHasActive = allLinks.some(({ href }) => isLinkActive(href, activePath));
        const membrosActive = allowedMembrosLinks.some(({ href }) => isLinkActive(href, activePath));
        const historicoActive = allowedHistoricoLinks.some(({ href }) => isLinkActive(href, activePath));
        const grupoActive = allowedGrupoLinks.some(({ href }) => isLinkActive(href, activePath));
        const escalaActive = allowedEscalaLinks.some(({ href }) => isLinkActive(href, activePath));
        const ebdActive = allowedEbdLinks.some(({ href }) => isLinkActive(href, activePath));
        const batismoActive = allowedBatismoLinks.some(({ href }) => isLinkActive(href, activePath));

        const membrosHtml = allowedMembrosLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const historicoHtml = allowedHistoricoLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const grupoHtml = allowedGrupoLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const escalaHtml = allowedEscalaLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const ebdHtml = allowedEbdLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const batismoHtml = allowedBatismoLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        const otherHtml = allowedOtherLinks.map(({ href, icon: linkIcon, label }) => {
            const activeClass = isLinkActive(href, activePath) ? 'active-link' : '';
            return `<a href="${href}" class="${activeClass}"><i class="${linkIcon}"></i><span>${label}</span></a>`;
        }).join('');

        return `
            <button class="dropdown-btn ${secretariaHasActive ? 'active' : ''}" type="button">
                <span><i class="fa-solid fa-folder-open icon-left"></i> Secretaria</span>
                <i class="fa-solid fa-chevron-right arrow"></i>
            </button>
            <div class="dropdown-container" style="${secretariaHasActive ? 'display: block;' : 'display: none;'}">
                ${allowedMembrosLinks.length ? `<button class="sub-dropdown-btn ${membrosActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-users icon-left"></i> Membros</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${membrosActive ? 'display: block;' : 'display: none;'}">
                    ${membrosHtml}
                </div>` : ''}

                ${allowedHistoricoLinks.length ? `<button class="sub-dropdown-btn ${historicoActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-book-bible icon-left"></i> Histórico Pastoral</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${historicoActive ? 'display: block;' : 'display: none;'}">
                    ${historicoHtml}
                </div>` : ''}

                ${allowedGrupoLinks.length ? `<button class="sub-dropdown-btn ${grupoActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-people-group icon-left"></i> Grupos</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${grupoActive ? 'display: block;' : 'display: none;'}">
                    ${grupoHtml}
                </div>` : ''}

                ${allowedEscalaLinks.length ? `<button class="sub-dropdown-btn ${escalaActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-calendar-check icon-left"></i> Escalas</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${escalaActive ? 'display: block;' : 'display: none;'}">
                    ${escalaHtml}
                </div>` : ''}

                ${allowedEbdLinks.length ? `<button class="sub-dropdown-btn ${ebdActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-graduation-cap icon-left"></i> EBD</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${ebdActive ? 'display: block;' : 'display: none;'}">
                    ${ebdHtml}
                </div>` : ''}

                ${allowedBatismoLinks.length ? `<button class="sub-dropdown-btn ${batismoActive ? 'active' : ''}" type="button">
                    <span><i class="fa-solid fa-water icon-left"></i> Batismos</span>
                    <i class="fa-solid fa-chevron-right arrow"></i>
                </button>
                <div class="sub-dropdown-container" style="${batismoActive ? 'display: block;' : 'display: none;'}">
                    ${batismoHtml}
                </div>` : ''}

                ${otherHtml}
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
            ['construcao.html?pag=Importacao de Extrato', 'fa-solid fa-file-import', 'Importação de Extrato', 'financeiro']
        ];

        const otherLinks = [
            ['pagamentos.html', 'fa-solid fa-link', 'Links de Pagamento', 'pagamentos'],
            ['contas_pagar.html', 'fa-solid fa-file-invoice-dollar', 'Contas a Pagar', 'financeiro'],
            ['construcao.html?pag=Recibo', 'fa-solid fa-receipt', 'Recibo'],
            ['construcao.html?pag=Transferencias', 'fa-solid fa-right-left', 'Transferências']
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
                        ['novidades.html', 'fa-solid fa-star', 'Novidades'],
                        ['meu_plano.html', 'fa-solid fa-credit-card', 'Meu Plano'],
                        ['configuracoes.html', 'fa-solid fa-gear', 'Configurações', 'configuracoes'],
                        ['index.html', 'fa-solid fa-right-from-bracket', 'Sair']
                    ], activePath, true, user)}

                    ${renderSecretariaGroup(activePath, user)}

                    ${renderTesourariaGroup(activePath, user)}

                    ${renderLegacyGroup('Contabilidade', 'fa-solid fa-scale-balanced', [
                        ['construcao.html?pag=Plano de Contas', 'fa-solid fa-list-ol', 'Plano de Contas'],
                        ['construcao.html?pag=Balancete de Abertura', 'fa-solid fa-book-open', 'Balancete de Abertura'],
                        ['construcao.html?pag=Lancamentos Contabeis', 'fa-solid fa-clipboard-list', 'Lançamentos Contábeis'],
                        ['construcao.html?pag=Encerramento do Exercicio', 'fa-solid fa-flag-checkered', 'Encerramento do Exercício']
                    ], activePath, false, user)}

                    ${renderLegacyGroup('Gráficos', 'fa-solid fa-chart-column', [
                        ['construcao.html?pag=Graficos Secretaria', 'fa-solid fa-chart-pie', 'Secretaria'],
                        ['construcao.html?pag=Graficos Tesouraria', 'fa-solid fa-chart-line', 'Tesouraria']
                    ], activePath, false, user)}

                    ${renderLegacyGroup('Relatórios', 'fa-solid fa-print', [
                        ['construcao.html?pag=Relatorios Secretaria', 'fa-regular fa-file-lines', 'Secretaria'],
                        ['construcao.html?pag=Relatorios Tesouraria', 'fa-regular fa-file-lines', 'Tesouraria'],
                        ['construcao.html?pag=Relatorios Contabilidade', 'fa-regular fa-file-lines', 'Contabilidade']
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
                        }
                    }
                });

                const container = this.nextElementSibling;
                if (!container || !container.classList.contains('dropdown-container')) {
                    return;
                }

                this.classList.toggle('active', isOpening);
                container.classList.toggle('is-open', isOpening);
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

        main.classList.add('enterprise-main');
        body.classList.add('legacy-sidebar-mode');
        body.insertAdjacentHTML('afterbegin', renderSidebar(activePath, getAuthUser()));
        main.insertAdjacentHTML('afterbegin', renderHeader(config));
        applyUserLabels();
        bindMenuToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShell);
    } else {
        initShell();
    }
})();