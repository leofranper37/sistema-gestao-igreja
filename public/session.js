(function () {
    const STORAGE_KEY = 'ldfpAuth';
    const originalFetch = window.fetch.bind(window);
    let publicSystemConfigCache = null;

    function getStoredAuth() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }

            const legacyToken = sessionStorage.getItem('token') || localStorage.getItem('token');
            if (!legacyToken) {
                return null;
            }

            let legacyUser = null;
            try {
                const rawUser = localStorage.getItem('ldfpUser');
                legacyUser = rawUser ? JSON.parse(rawUser) : null;
            } catch (_) {
                legacyUser = null;
            }

            return {
                token: legacyToken,
                user: legacyUser || {}
            };
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function saveAuthSession(payload) {
        if (!payload || !payload.token || !payload.user) {
            return;
        }

        // Compatibilidade com páginas legadas que ainda leem "token" diretamente.
        localStorage.setItem('token', payload.token);
        sessionStorage.setItem('token', payload.token);

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            token: payload.token,
            user: payload.user
        }));
    }

    function clearAuthSession() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('ldfpUser');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
    }

    function getAuthToken() {
        return getStoredAuth()?.token || '';
    }

    function getCustomAccent(user) {
        const color = String(user?.customConfig?.corDestaque || '').trim();
        return color || '';
    }

    function getWorkspaceTitle(user) {
        return String(user?.customConfig?.nomeWorkspace || '').trim();
    }

    function setRootAccent(user) {
        const accent = getCustomAccent(user);
        if (!accent) {
            document.documentElement.style.removeProperty('--ldfp-custom-accent');
            return;
        }

        document.documentElement.style.setProperty('--ldfp-custom-accent', accent);
    }

    function setDocumentTitleBranding(config, user) {
        const workspaceTitle = getWorkspaceTitle(user);
        const brandName = String(config?.branding?.brandName || '').trim();
        let nextTitle = document.title || 'LDFP';

        if (brandName) {
            nextTitle = nextTitle.replace(/\bLDFP\b/gi, brandName);
        }

        if (workspaceTitle && !nextTitle.toLowerCase().includes(workspaceTitle.toLowerCase())) {
            nextTitle = `${workspaceTitle} | ${nextTitle}`;
        }

        document.title = nextTitle;
    }

    function getAnnouncementPalette(tone) {
        const normalized = String(tone || 'info').trim().toLowerCase();
        if (normalized === 'success') return { bg: '#ecfdf5', border: '#86efac', text: '#14532d', icon: 'fa-circle-check' };
        if (normalized === 'warning') return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: 'fa-triangle-exclamation' };
        if (normalized === 'danger') return { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: 'fa-triangle-exclamation' };
        return { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', icon: 'fa-circle-info' };
    }

    function renderLegacyAnnouncement(config) {
        const existing = document.getElementById('ldfpGlobalAnnouncementLegacy');
        if (existing) {
            existing.remove();
        }

        if (document.getElementById('ldfpGlobalAnnouncement')) {
            return;
        }

        const enabled = Boolean(config?.branding?.globalAnnouncementEnabled);
        const text = String(config?.branding?.globalAnnouncementText || '').trim();
        if (!enabled || !text) {
            return;
        }

        const host = document.querySelector('.login-card, .co-body, .container, main, body');
        if (!host) {
            return;
        }

        const palette = getAnnouncementPalette(config?.branding?.globalAnnouncementTone);
        const banner = document.createElement('div');
        banner.id = 'ldfpGlobalAnnouncementLegacy';
        banner.style.cssText = `margin:16px auto;max-width:1100px;padding:10px 14px;border-radius:10px;border:1px solid ${palette.border};background:${palette.bg};color:${palette.text};font-size:12px;font-weight:700;display:flex;align-items:center;gap:8px;`;
        banner.innerHTML = `<i class="fa-solid ${palette.icon}"></i><span>${text}</span>`;

        if (host === document.body) {
            document.body.insertAdjacentElement('afterbegin', banner);
        } else {
            host.insertAdjacentElement('beforebegin', banner);
        }
    }

    async function loadPublicSystemConfig() {
        if (publicSystemConfigCache) {
            return publicSystemConfigCache;
        }

        try {
            const response = await originalFetch('/api/public/system-config');
            if (!response.ok) {
                return null;
            }

            publicSystemConfigCache = await response.json();
            return publicSystemConfigCache;
        } catch (_error) {
            return null;
        }
    }

    async function applyGlobalVisualConfig() {
        const config = await loadPublicSystemConfig();
        const user = getStoredAuth()?.user || {};

        setRootAccent(user);
        setDocumentTitleBranding(config, user);
        renderLegacyAnnouncement(config);
    }

    function isMemberLikeRole(role) {
        const normalized = String(role || '').toLowerCase();
        return normalized === 'membro' || normalized === 'visitante';
    }

    function isPublicOrMemberPath(pathname) {
        return /\/(index|login|planos|criar_conta|esqueci_senha|redefinir_senha|assinar|conta_bloqueada|meu_plano|app_membro)\.html$/i.test(pathname || '')
            || /\/$/i.test(pathname || '')
            || /\/api\//i.test(pathname || '');
    }

    function enforceMemberIsolation() {
        const auth = getStoredAuth();
        const role = auth?.user?.role;
        if (!auth?.token || !isMemberLikeRole(role)) {
            return;
        }

        const currentPath = window.location.pathname || '';
        if (isPublicOrMemberPath(currentPath)) {
            return;
        }

        window.location.href = 'app_membro.html';
    }

    function isSameOriginRequest(resourceUrl) {
        try {
            const url = new URL(resourceUrl, window.location.origin);
            return url.origin === window.location.origin;
        } catch (error) {
            return false;
        }
    }

    function isAuthRoute(resourceUrl) {
        return /\/login$|\/criar-conta$/i.test(resourceUrl);
    }

    function redirectToLogin() {
        if (!/\/login\.html$/i.test(window.location.pathname)) {
            window.location.href = 'login.html';
        }
    }

    function attachLogoutHandlers() {
        document.querySelectorAll('a[href="index.html"]').forEach((anchor) => {
            if (anchor.dataset.logoutBound === 'true') {
                return;
            }

            if (!/sair/i.test(anchor.textContent || '')) {
                return;
            }

            anchor.dataset.logoutBound = 'true';
            anchor.addEventListener('click', () => {
                clearAuthSession();
            });
        });
    }

    function requireAuthSession() {
        if (!getAuthToken()) {
            redirectToLogin();
            return false;
        }

        attachLogoutHandlers();
        return true;
    }

    function isPaymentRoute(resourceUrl) {
        return /\/assinar\.html|\/conta_bloqueada\.html|\/pagamentos|\/api\/pagamentos/i.test(resourceUrl);
    }

    function shouldRedirectUpgrade(message) {
        const text = String(message || '').toLowerCase();
        return text.includes('módulo não está ativo no contrato')
            || text.includes('modulo não está ativo no contrato')
            || text.includes('módulo contratado')
            || text.includes('modulo contratado')
            || text.includes('upgrade');
    }

    window.fetch = async function (input, init = {}) {
        const requestUrl = typeof input === 'string' ? input : input?.url || '';
        const nextInit = { ...init };
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined) || undefined);
        const token = getAuthToken();

        if (token && isSameOriginRequest(requestUrl) && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        nextInit.headers = headers;

        const response = await originalFetch(input, nextInit);

        if (response.status === 401 && !isAuthRoute(requestUrl)) {
            clearAuthSession();
            redirectToLogin();
        }

        if (response.status === 403 && !/\/meu_plano\.html$/i.test(window.location.pathname)) {
            try {
                const payload = await response.clone().json().catch(() => ({}));
                const errMessage = payload?.error || payload?.message || '';
                if (shouldRedirectUpgrade(errMessage) && !isPaymentRoute(requestUrl)) {
                    const from = `${window.location.pathname.split('/').pop() || ''}${window.location.search || ''}`;
                    window.location.href = `meu_plano.html?upgrade=1&from=${encodeURIComponent(from)}`;
                }
            } catch (_) {
                // Falha silenciosa para manter compatibilidade com páginas legadas.
            }
        }

        // 402 = assinatura expirada/cancelada
        if (response.status === 402 && !isPaymentRoute(requestUrl) && !isPaymentRoute(window.location.pathname)) {
            if (!/\/conta_bloqueada\.html|\/assinar\.html/i.test(window.location.pathname)) {
                window.location.href = 'conta_bloqueada.html';
            }
        }

        return response;
    };

    window.getStoredAuth = getStoredAuth;
    window.saveAuthSession = saveAuthSession;
    window.clearAuthSession = clearAuthSession;
    window.requireAuthSession = requireAuthSession;

    enforceMemberIsolation();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyGlobalVisualConfig().catch(() => {});
        }, { once: true });
    } else {
        applyGlobalVisualConfig().catch(() => {});
    }

    (async function syncAuthProfile() {
        const current = getStoredAuth();
        if (!current?.token) {
            return;
        }

        if (/\/login\.html$/i.test(window.location.pathname)) {
            return;
        }

        try {
            const response = await originalFetch('/auth/me', {
                headers: {
                    Authorization: `Bearer ${current.token}`
                }
            });

            if (!response.ok) {
                return;
            }

            const me = await response.json();
            if (!me || typeof me !== 'object') {
                return;
            }

            saveAuthSession({
                token: current.token,
                user: {
                    ...(current.user || {}),
                    ...me
                }
            });

            applyGlobalVisualConfig().catch(() => {});
        } catch (_error) {
            // Mantém a sessão atual em caso de falha momentânea da API.
        }
    })();
})();