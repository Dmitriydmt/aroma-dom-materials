const materialsList = document.getElementById('materialsList');
const errorBox = document.getElementById('errorBox');

// Количества: до двух знаков после запятой, без лишних нулей
function formatQuantity(value) {
    return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

// Цена и требуемое количество: всегда два знака
function formatFixed(value) {
    return Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Защита от подстановки HTML из данных БД
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createCard(material) {
    const card = document.createElement('article');
    card.className = 'card';

    // Клик по карточке открывает форму редактирования
    card.addEventListener('click', () => {
        window.location.href = `material-form.html?id=${material.materialId}`;
    });

    const unit = escapeHtml(material.unitName);
    card.innerHTML = `
        <div class="card-info">
            <div class="card-title">${escapeHtml(material.materialTypeName)} | ${escapeHtml(material.materialName)}</div>
            <p>Минимальное количество: ${formatQuantity(material.minQuantity)} ${unit}</p>
            <p>Количество на складе: ${formatQuantity(material.stockQuantity)} ${unit}</p>
            <p>Цена: ${formatFixed(material.price)} р / Единица измерения: ${unit}</p>
        </div>
        <div class="card-side">
            <div class="card-required">Требуемое количество: ${formatFixed(material.requiredQuantity)} ${unit}</div>
            <button type="button" class="button products-button">Продукция</button>
        </div>
    `;

    // Кнопка ведёт к продукции; клик не должен открывать форму редактирования
    card.querySelector('.products-button').addEventListener('click', (event) => {
        event.stopPropagation();
        window.location.href = `products.html?id=${material.materialId}`;
    });

    return card;
}

async function loadMaterials() {
    try {
        const response = await fetch('/api/materials');
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message);
        }
        const materials = await response.json();
        materialsList.innerHTML = '';
        materials.forEach((material) => materialsList.appendChild(createCard(material)));
    } catch (error) {
        errorBox.textContent = error.message || 'Сервер недоступен. Запустите приложение и повторите попытку.';
        errorBox.hidden = false;
    }
}

loadMaterials();



