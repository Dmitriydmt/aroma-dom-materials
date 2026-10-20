
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/materials', require('./src/routes/materials'));
app.use('/api/products', require('./src/routes/products'));


app.get('/api/health', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});



