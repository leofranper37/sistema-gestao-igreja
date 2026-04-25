(function () {
    const STORAGE_KEY = 'ldfpAuth';
    const originalFetch = window.fetch.bind(window);

    function getStoredAuth() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function saveAuthSession(payload) {
        if (!payload || !payload.token || !payload.user) {
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            token: payload.token,
            user: payload.user
        }));
    }

    function clearAuthSession() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('ldfpUser');
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
})();