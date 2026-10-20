const express = require('express');
const { sql, getPool } = require('../config/database');
const { calculateProductQuantity } = require('../services/calculations');

const router = express.Router();

// Продукция, в рецептуре которой используется материал
router.get('/by-material/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'Некорректный идентификатор материала.' });
    }
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT  p.ProductId         AS productId,
                        p.Article           AS article,
                        p.ProductName       AS productName,
                        pt.ProductTypeName  AS productTypeName,
                        pm.MaterialQuantity AS materialQuantity
                FROM ProductMaterial pm
                JOIN Product p       ON p.ProductId = pm.ProductId
                JOIN ProductType pt  ON pt.ProductTypeId = p.ProductTypeId
                WHERE pm.MaterialId = @id
                ORDER BY p.ProductName
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Ошибка загрузки продукции:', error.message);
        res.status(500).json({ message: 'Не удалось загрузить список продукции. Проверьте подключение к базе данных.' });
    }
});

// Проверка расчёта из браузера:
// /api/products/calculate?productTypeId=1&materialTypeId=1&quantity=100&param1=0.5&param2=0.4
router.get('/calculate', async (req, res) => {
    const toNumber = (value) => (value === undefined || String(value).trim() === '' ? NaN : Number(String(value).replace(',', '.')));
    try {
        const result = await calculateProductQuantity(
            toNumber(req.query.productTypeId),
            toNumber(req.query.materialTypeId),
            toNumber(req.query.quantity),
            toNumber(req.query.param1),
            toNumber(req.query.param2)
        );
        res.json({ result });
    } catch (error) {
        console.error('Ошибка расчёта:', error.message);
        res.status(500).json({ message: 'Не удалось выполнить расчёт. Проверьте подключение к базе данных.' });
    }
});

module.exports = router;


