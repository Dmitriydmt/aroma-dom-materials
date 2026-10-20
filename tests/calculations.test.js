const test = require('node:test');
const assert = require('node:assert');
const { computeQuantity } = require('../src/services/calculations');

test('считает количество с учётом коэффициента и потерь', () => {
    // расход 0.5*0.4*1.2 = 0.24; сырья после потерь 98; 98/0.24 = 408.33 -> 408
    assert.strictEqual(computeQuantity(1.2, 2, 100, 0.5, 0.4), 408);
});

test('без потерь', () => {
    assert.strictEqual(computeQuantity(1, 0, 10, 1, 1), 10);
});

test('нулевое количество сырья даёт 0', () => {
    assert.strictEqual(computeQuantity(1.2, 2, 0, 0.5, 0.4), 0);
});

test('неподходящие данные дают -1', () => {
    assert.strictEqual(computeQuantity(1.2, 2, -5, 0.5, 0.4), -1);   // отрицательное сырьё
    assert.strictEqual(computeQuantity(1.2, 2, 10.5, 0.5, 0.4), -1); // дробное количество
    assert.strictEqual(computeQuantity(1.2, 2, 100, 0, 0.4), -1);    // параметр не положительный
    assert.strictEqual(computeQuantity(1.2, 2, 100, 0.5, NaN), -1);  // не число
    assert.strictEqual(computeQuantity(1.2, 100, 100, 0.5, 0.4), -1);// потери 100%
});


