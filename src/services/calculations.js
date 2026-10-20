// Чистая функция расчёта: без обращения к базе данных, поэтому легко тестируется.
// coefficient — коэффициент типа продукции, lossPercent — процент потерь сырья.
// Возвращает целое количество продукции или -1 при неподходящих данных.
function computeQuantity(coefficient, lossPercent, rawQuantity, param1, param2) {
    const isPositive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

    if (!isPositive(coefficient) || !isPositive(param1) || !isPositive(param2)) {
        return -1;
    }
    if (typeof lossPercent !== 'number' || !Number.isFinite(lossPercent) || lossPercent < 0 || lossPercent >= 100) {
        return -1;
    }
    if (!Number.isInteger(rawQuantity) || rawQuantity < 0) {
        return -1;
    }

    // Расход сырья на единицу продукции
    const rawPerUnit = param1 * param2 * coefficient;
    // Сырьё, которое остаётся после потерь
    const usableRaw = rawQuantity * (1 - lossPercent / 100);

    // Малая добавка защищает от ошибок округления вида 2.9999999999
    return Math.floor(usableRaw / rawPerUnit + 1e-9);
}

// Основной метод по заданию: принимает идентификаторы типов, берёт коэффициент
// и процент потерь из базы данных, затем вызывает computeQuantity.
async function calculateProductQuantity(productTypeId, materialTypeId, rawQuantity, param1, param2) {
    const isId = (value) => Number.isInteger(value) && value > 0;
    if (!isId(productTypeId) || !isId(materialTypeId) || !Number.isInteger(rawQuantity)) {
        return -1;
    }

    // Подключаем БД только здесь, чтобы файл можно было тестировать отдельно
    const { sql, getPool } = require('../config/database');
    const pool = await getPool();

    const productType = await pool.request()
        .input('id', sql.Int, productTypeId)
        .query('SELECT Coefficient FROM ProductType WHERE ProductTypeId = @id');
    const materialType = await pool.request()
        .input('id', sql.Int, materialTypeId)
        .query('SELECT LossPercent FROM MaterialType WHERE MaterialTypeId = @id');

    // Несуществующий тип продукции или сырья
    if (productType.recordset.length === 0 || materialType.recordset.length === 0) {
        return -1;
    }

    return computeQuantity(
        Number(productType.recordset[0].Coefficient),
        Number(materialType.recordset[0].LossPercent),
        rawQuantity,
        param1,
        param2
    );
}

module.exports = { computeQuantity, calculateProductQuantity };


