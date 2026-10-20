const form = document.getElementById('materialForm');
const formTitle = document.getElementById('formTitle');
const typeSelect = document.getElementById('materialTypeId');

const params = new URLSearchParams(window.location.search);
const materialId = params.get('id'); // есть id -> редактирование, нет -> добавление
const isEdit = materialId !== null;

const MESSAGE_TYPES = {
    error: { icon: '❌', title: 'Ошибка' },
    warning: { icon: '⚠️', title: 'Предупреждение' },
    info: { icon: 'ℹ️', title: 'Информация' }
};

// Показывает окно сообщения; промис завершается после нажатия OK
function showMessage(type, text) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal');
        document.getElementById('modalIcon').textContent = MESSAGE_TYPES[type].icon;
        document.getElementById('modalTitle').textContent = MESSAGE_TYPES[type].title;
        document.getElementById('modalText').textContent = text;
        modal.hidden = false;
        const okButton = document.getElementById('modalOk');
        okButton.focus();
        okButton.onclick = () => {
            modal.hidden = true;
            resolve();
        };
    });
}

function parseNumber(value) {
    if (String(value).trim() === '') {
        return NaN;
    }
    return Number(String(value).trim().replace(',', '.'));
}

// Проверка на стороне браузера: те же правила, что и на сервере
function validateForm() {
    const errors = [];
    const price = parseNumber(form.price.value);
    const packageQuantity = parseNumber(form.packageQuantity.value);
    const stockQuantity = parseNumber(form.stockQuantity.value);
    const minQuantity = parseNumber(form.minQuantity.value);

    if (form.materialTypeId.value === '') {
        errors.push('Выберите тип материала из выпадающего списка.');
    }
    if (form.materialName.value.trim() === '') {
        errors.push('Введите наименование материала.');
    }
    if (Number.isNaN(price)) {
        errors.push('Введите цену материала числом, например 450,00.');
    } else if (price < 0) {
        errors.push('Цена не может быть отрицательной. Введите значение 0 или больше.');
    } else if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) {
        errors.push('Цена указывается с точностью до сотых: не более двух знаков после запятой.');
    }
    if (form.unitName.value.trim() === '') {
        errors.push('Введите единицу измерения, например: кг, шт, л.');
    }
    if (Number.isNaN(packageQuantity) || packageQuantity <= 0) {
        errors.push('Количество в упаковке должно быть числом больше нуля.');
    }
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
        errors.push('Количество на складе должно быть числом 0 или больше.');
    }
    if (Number.isNaN(minQuantity)) {
        errors.push('Введите минимальное количество числом.');
    } else if (minQuantity < 0) {
        errors.push('Минимальное количество не может быть отрицательным. Введите значение 0 или больше.');
    }
    return errors;
}

async function loadTypes() {
    const response = await fetch('/api/materials/types');
    if (!response.ok) {
        throw new Error('Не удалось загрузить типы материалов.');
    }
    const types = await response.json();
    typeSelect.innerHTML = '<option value="">— выберите тип —</option>';
    types.forEach((type) => {
        const option = document.createElement('option');
        option.value = type.materialTypeId;
        option.textContent = type.materialTypeName;
        typeSelect.appendChild(option);
    });
}

async function loadMaterial() {
    const response = await fetch(`/api/materials/${materialId}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message);
    }
    form.materialTypeId.value = data.materialTypeId;
    form.materialName.value = data.materialName;
    form.price.value = data.price;
    form.unitName.value = data.unitName;
    form.packageQuantity.value = data.packageQuantity;
    form.stockQuantity.value = data.stockQuantity;
    form.minQuantity.value = data.minQuantity;
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
        await showMessage('error', errors.join('\n'));
        return;
    }

    const body = {
        materialTypeId: form.materialTypeId.value,
        materialName: form.materialName.value,
        price: form.price.value,
        unitName: form.unitName.value,
        packageQuantity: form.packageQuantity.value,
        stockQuantity: form.stockQuantity.value,
        minQuantity: form.minQuantity.value
    };

    try {
        const response = await fetch(isEdit ? `/api/materials/${materialId}` : '/api/materials', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
            await showMessage('error', data.message);
            return;
        }
        await showMessage('info', isEdit ? 'Изменения сохранены.' : 'Материал добавлен.');
        window.location.href = 'index.html'; // список перезагрузится с актуальными данными
    } catch (error) {
        await showMessage('error', 'Сервер недоступен. Запустите приложение и повторите попытку.');
    }
});

async function init() {
    document.title = isEdit ? 'Редактирование материала — Арома Дом' : 'Добавление материала — Арома Дом';
    formTitle.textContent = isEdit ? 'Редактирование материала' : 'Добавление материала';
    try {
        await loadTypes();
        if (isEdit) {
            await loadMaterial();
        }
    } catch (error) {
        await showMessage('error', error.message || 'Не удалось загрузить данные. Вернитесь к списку и повторите попытку.');
        window.location.href = 'index.html';
    }
}

init();


