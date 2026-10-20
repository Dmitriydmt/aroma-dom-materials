const params = new URLSearchParams(window.location.search);
const materialId = params.get('id');

const productsList = document.getElementById('productsList');
const errorBox = document.getElementById('errorBox');
const emptyBox = document.getElementById('emptyBox');

function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = false;
}

function formatQuantity(value) {
    return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadProducts() {
    if (!materialId) {
        showError('Материал не выбран. Вернитесь к списку и выберите материал.');
        return;
    }
    try {
        const materialResponse = await fetch(`/api/materials/${materialId}`);
        const material = await materialResponse.json();
        if (!materialResponse.ok) {
            throw new Error(material.message);
        }
        document.getElementById('pageTitle').textContent = `Продукция: ${material.materialName}`;
        document.title = `Продукция: ${material.materialName} — Арома Дом`;

        const response = await fetch(`/api/products/by-material/${materialId}`);
        const products = await response.json();
        if (!response.ok) {
            throw new Error(products.message);
        }
        if (products.length === 0) {
            emptyBox.hidden = false;
            return;
        }
        products.forEach((product) => {
            const card = document.createElement('article');
            card.className = 'card static';
            card.innerHTML = `
                <div class="card-info">
                    <div class="card-title">${escapeHtml(product.productName)}</div>
                    <p>Тип: ${escapeHtml(product.productTypeName)} | Артикул: ${escapeHtml(product.article)}</p>
                </div>
                <div class="card-required">Необходимое количество: ${formatQuantity(product.materialQuantity)} ${escapeHtml(material.unitName)}</div>
            `;
            productsList.appendChild(card);
        });
    } catch (error) {
        showError(error.message || 'Сервер недоступен. Запустите приложение и повторите попытку.');
    }
}

loadProducts();


