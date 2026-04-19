const app = require('../src/app');
const { initializeDatabase } = require('../src/config/db');

let databaseReadyPromise;

function ensureDatabaseReady() {
    if (!databaseReadyPromise) {
        databaseReadyPromise = initializeDatabase().catch(error => {
            databaseReadyPromise = null;
            throw error;
        });
    }

    return databaseReadyPromise;
}

module.exports = async (req, res) => {
    await ensureDatabaseReady();
    return app(req, res);
};