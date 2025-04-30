document.addEventListener('DOMContentLoaded', function() {
    // Убедитесь, что используете правильный URL скрипта
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec';
    
    // Инициализация графиков с загрузкой данных
    initCharts(scriptURL);
});

async function initCharts(scriptURL) {
    try {
        // Показать состояние загрузки
        document.querySelectorAll('canvas').forEach(canvas => {
            canvas.style.background = '#f9f9f9';
        });
        
        // Загрузка данных
        const response = await fetch(`${scriptURL}?action=getData`);
        if (!response.ok) throw new Error('Ошибка сети');
        
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || 'Ошибка данных');
        
        // Рендеринг графиков
        renderCharts(result.data);
    } catch (error) {
        console.error('Ошибка:', error);
        showError(error.message);
    }
}

function renderCharts(data) {
    // Код рендеринга графиков без изменений
    // Убедитесь, что используете Chart.js v3+
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-error';
    errorDiv.innerHTML = `
        <p>Не удалось загрузить аналитику</p>
        <small>${message}</small>
    `;
    document.querySelector('.analytics-section').appendChild(errorDiv);
}
