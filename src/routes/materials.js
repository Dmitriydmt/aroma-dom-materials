const express = require('express');
const { sql, getPool } = require('../config/database');

const router = express.Router();

// Преобразует значение из формы в число (поддерживает запятую); пустое значение -> NaN
function parseNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return NaN;
    }
    return Number(String(value).trim().replace(',', '.'));
}

function hasMoreThanTwoDecimals(value) {
    return Math.abs(Math.round(value * 100) - value * 100) > 1e-6;
}

// Проверка данных материала. Возвращает { data, errors }
function validateMaterial(body) {
    const errors = [];
    const data = {
        materialTypeId: parseNumber(body.materialTypeId),
        materialName: String(body.materialName ?? '').trim(),
        price: parseNumber(body.price),
        unitName: String(body.unitName ?? '').trim(),
        packageQuantity: parseNumber(body.packageQuantity),
        stockQuantity: parseNumber(body.stockQuantity),
        minQuantity: parseNumber(body.minQuantity)
    };

    if (!Number.isInteger(data.materialTypeId)) {
        errors.push('Выберите тип материала из выпадающего списка.');
    }
    if (data.materialName === '') {
        errors.push('Введите наименование материала.');
    } else if (data.materialName.length > 200) {
        errors.push('Наименование не должно быть длиннее 200 символов.');
    }
    if (Number.isNaN(data.price)) {
        errors.push('Введите цену материала числом, например 450,00.');
    } else if (data.price < 0) {
        errors.push('Цена не может быть отрицательной. Введите значение 0 или больше.');
    } else if (hasMoreThanTwoDecimals(data.price)) {
        errors.push('Цена указывается с точностью до сотых: не более двух знаков после запятой.');
    } else if (data.price > 99999999.99) {
        errors.push('Цена слишком большая. Максимум — 99 999 999,99.');
    }
    if (data.unitName === '') {
        errors.push('Введите единицу измерения, например: кг, шт, л.');
    } else if (data.unitName.length > 30) {
        errors.push('Единица измерения не должна быть длиннее 30 символов.');
    }
    if (Number.isNaN(data.packageQuantity) || data.packageQuantity <= 0) {
        errors.push('Количество в упаковке должно быть числом больше нуля.');
    }
    if (Number.isNaN(data.stockQuantity) || data.stockQuantity < 0) {
        errors.push('Количество на складе должно быть числом 0 или больше.');
    }
    if (Number.isNaN(data.minQuantity)) {
        errors.push('Введите минимальное количество числом.');
    } else if (data.minQuantity < 0) {
        errors.push('Минимальное количество не может быть отрицательным. Введите значение 0 или больше.');
    }
    for (const key of ['packageQuantity', 'stockQuantity', 'minQuantity']) {
        if (data[key] > 9999999999) {
            errors.push('Одно из количеств слишком большое. Проверьте введённые значения.');
            break;
        }
    }

    return { data, errors };
}

// Проверки, требующие обращения к базе: тип существует, наименование уникально
async function checkAgainstDatabase(pool, data, excludeId) {
    const errors = [];

    const typeResult = await pool.request()
        .input('typeId', sql.Int, data.materialTypeId)
        .query('SELECT 1 AS found FROM MaterialType WHERE MaterialTypeId = @typeId');
    if (typeResult.recordset.length === 0) {
        errors.push('Выбранный тип материала не найден. Обновите страницу и выберите тип заново.');
    }

    const nameResult = await pool.request()
        .input('name', sql.NVarChar(200), data.materialName)
        .input('excludeId', sql.Int, excludeId)
        .query('SELECT 1 AS found FROM Material WHERE MaterialName = @name AND MaterialId <> @excludeId');
    if (nameResult.recordset.length > 0) {
        errors.push('Материал с таким наименованием уже существует. Измените наименование.');
    }

    return errors;
}

function addInputs(request, data) {
    return request
        .input('typeId', sql.Int, data.materialTypeId)
        .input('name', sql.NVarChar(200), data.materialName)
        .input('price', sql.Decimal(10, 2), data.price)
        .input('unit', sql.NVarChar(30), data.unitName)
        .input('packageQty', sql.Decimal(12, 2), data.packageQuantity)
        .input('stockQty', sql.Decimal(12, 2), data.stockQuantity)
        .input('minQty', sql.Decimal(12, 2), data.minQuantity);
}

const SERVER_ERROR = 'Не удалось выполнить операцию. Проверьте подключение к базе данных и повторите попытку.';

// Список материалов с требуемым количеством (сумма по всем рецептурам)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT  m.MaterialId        AS materialId,
                    mt.MaterialTypeName AS materialTypeName,
                    m.MaterialName      AS materialName,
                    m.MinQuantity       AS minQuantity,
                    m.StockQuantity     AS stockQuantity,
                    m.Price             AS price,
                    m.UnitName          AS unitName,
                    CAST(ISNULL(SUM(pm.MaterialQuantity), 0) AS DECIMAL(12,2)) AS requiredQuantity
            FROM Material m
            JOIN MaterialType mt ON mt.MaterialTypeId = m.MaterialTypeId
            LEFT JOIN ProductMaterial pm ON pm.MaterialId = m.MaterialId
            GROUP BY m.MaterialId, mt.MaterialTypeName, m.MaterialName,
                     m.MinQuantity, m.StockQuantity, m.Price, m.UnitName
            ORDER BY m.MaterialName
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Ошибка загрузки материалов:', error.message);
        res.status(500).json({ message: 'Не удалось загрузить список материалов. Проверьте подключение к базе данных.' });
    }
});

// Типы материалов для выпадающего списка (должен стоять ДО маршрута /:id)
router.get('/types', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT MaterialTypeId AS materialTypeId, MaterialTypeName AS materialTypeName
            FROM MaterialType
            ORDER BY MaterialTypeName
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Ошибка загрузки типов материалов:', error.message);
        res.status(500).json({ message: SERVER_ERROR });
    }
});

// Один материал для формы редактирования
router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Некорректный идентификатор материала.' });
    }
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT  MaterialId       AS materialId,
                        MaterialTypeId   AS materialTypeId,
                        MaterialName     AS materialName,
                        Price            AS price,
                        UnitName         AS unitName,
                        PackageQuantity  AS packageQuantity,
                        StockQuantity    AS stockQuantity,
                        MinQuantity      AS minQuantity
                FROM Material
                WHERE MaterialId = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Материал не найден. Возможно, он был удалён. Вернитесь к списку материалов.' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Ошибка загрузки материала:', error.message);
        res.status(500).json({ message: SERVER_ERROR });
    }
});

// Добавление материала
router.post('/', async (req, res) => {
    const { data, errors } = validateMaterial(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join('\n') });
    }
    try {
        const pool = await getPool();
        const dbErrors = await checkAgainstDatabase(pool, data, 0);
        if (dbErrors.length > 0) {
            return res.status(400).json({ message: dbErrors.join('\n') });
        }
        const result = await addInputs(pool.request(), data).query(`
            INSERT INTO Material (MaterialTypeId, MaterialName, Price, UnitName, PackageQuantity, StockQuantity, MinQuantity)
            OUTPUT INSERTED.MaterialId AS materialId
            VALUES (@typeId, @name, @price, @unit, @packageQty, @stockQty, @minQty)
        `);
        res.status(201).json({ materialId: result.recordset[0].materialId });
    } catch (error) {
        console.error('Ошибка добавления материала:', error.message);
        res.status(500).json({ message: SERVER_ERROR });
    }
});

// Редактирование материала
router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Некорректный идентификатор материала.' });
    }
    const { data, errors } = validateMaterial(req.body);
    if (errors.length > 0) {
        return res.status(400).json({ message: errors.join('\n') });
    }
    try {
        const pool = await getPool();
        const dbErrors = await checkAgainstDatabase(pool, data, id);
        if (dbErrors.length > 0) {
            return res.status(400).json({ message: dbErrors.join('\n') });
        }
        const result = await addInputs(pool.request(), data)
            .input('id', sql.Int, id)
            .query(`
                UPDATE Material
                SET MaterialTypeId = @typeId, MaterialName = @name, Price = @price, UnitName = @unit,
                    PackageQuantity = @packageQty, StockQuantity = @stockQty, MinQuantity = @minQty
                WHERE MaterialId = @id
            `);
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Материал не найден. Возможно, он был удалён. Вернитесь к списку материалов.' });
        }
        res.json({ materialId: id });
    } catch (error) {
        console.error('Ошибка сохранения материала:', error.message);
        res.status(500).json({ message: SERVER_ERROR });
    }
});

module.exports = router;


