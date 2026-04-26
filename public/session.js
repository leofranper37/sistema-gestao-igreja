(function () {
    const STORAGE_KEY = 'ldfpAuth';
    const originalFetch = window.fetch.bind(window);

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
        } catch (_error) {
            // Mantém a sessão atual em caso de falha momentânea da API.
        }
    })();
})();