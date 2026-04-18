require('dotenv').config();

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : fallback;
};

const parseAllowedOrigins = () => {
    const rawOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';
    return rawOrigins
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
};

const config = {
    port: parseInteger(process.env.PORT, 3001),
    db: {
        host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
        user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQL_PASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'ldfp_db',
        port: parseInteger(process.env.DB_PORT || process.env.MYSQL_PORT, 3306),
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