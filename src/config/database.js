// Версия mssql для Windows-аутентификации (подходит для LocalDB)
const sql = require('mssql/msnodesqlv8');

const config = {
    connectionString:
        'Driver={ODBC Driver 17 for SQL Server};' + // подставь свой драйвер из шага 2
        'Server=(localdb)\\MSSQLLocalDB;' +
        'Database=AromaDom;' +
        'Trusted_Connection=yes;' +
        'TrustServerCertificate=yes;'
};

let poolPromise = null;

// Одно общее подключение на всё приложение
function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .catch((error) => {
                poolPromise = null; // при ошибке даём возможность переподключиться
                throw error;
            });
    }
    return poolPromise;
}

module.exports = { sql, getPool };




