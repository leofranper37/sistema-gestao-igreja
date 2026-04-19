require('dotenv').config();

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : fallback;
};

const pickFirstValue = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }

    return undefined;
};

const parseDatabaseUrl = () => {
    const rawUrl = pickFirstValue(
        process.env.DB_URL,
        process.env.DATABASE_URL,
        process.env.MYSQL_URL,
        process.env.MYSQL_PUBLIC_URL,
        process.env.MYSQLPRIVATE_URL
    );

    if (!rawUrl) {
        return null;
    }

    try {
        const url = new URL(rawUrl);

        return {
            host: url.hostname || undefined,
            user: url.username ? decodeURIComponent(url.username) : undefined,
            password: url.password ? decodeURIComponent(url.password) : undefined,
            database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, '')) : undefined,
            port: url.port || undefined
        };
    } catch (error) {
        return null;
    }
};

const parseAllowedOrigins = () => {
    const rawOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';
    return rawOrigins
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
};

const databaseUrlConfig = parseDatabaseUrl();

const config = {
    port: parseInteger(process.env.PORT, 3001),
    db: {
        host: pickFirstValue(process.env.DB_HOST, process.env.MYSQL_HOST, process.env.MYSQLHOST, databaseUrlConfig?.host) || '127.0.0.1',
        user: pickFirstValue(process.env.DB_USER, process.env.MYSQL_USER, process.env.MYSQLUSER, databaseUrlConfig?.user) || 'root',
        password: pickFirstValue(process.env.DB_PASSWORD, process.env.DB_PASS, process.env.MYSQL_PASSWORD, process.env.MYSQLPASSWORD, databaseUrlConfig?.password) || '',
        database: pickFirstValue(process.env.DB_NAME, process.env.MYSQL_DATABASE, process.env.MYSQLDATABASE, databaseUrlConfig?.database) || 'ldfp_db',
        port: parseInteger(pickFirstValue(process.env.DB_PORT, process.env.MYSQL_PORT, process.env.MYSQLPORT, databaseUrlConfig?.port), 3306),
        waitForConnections: true,
        connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, 10),
        queueLimit: 0
    },
    cors: {
        allowedOrigins: parseAllowedOrigins()
    },
    security: {
        passwordSaltRounds: parseInteger(process.env.PASSWORD_SALT_ROUNDS, 10),
        jwtSecret: process.env.JWT_SECRET || 'ldfp-dev-secret',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h'
    },
    app: {
        name: 'LDFP'
    }
};

module.exports = config;