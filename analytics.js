document.addEventListener('DOMContentLoaded', function() {
    // Убедитесь, что URL совпадает с вашим развернутым скриптом
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec';
    loadAnalyticsData(scriptURL);
});

async function loadAnalyticsData(scriptURL) {
    try {
        const response = await fetch(scriptURL + '?action=getData');
        if (!response.ok) throw new Error('Ошибка сети');
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        
        renderCharts(data.data);
    } catch (error) {
        console.error('Ошибка:', error);
        showChartError(error.message);
    }
}

function renderCharts(data) {
    // Код рендеринга графиков без изменений
}

function showChartError(message) {
    const container = document.querySelector('.analytics');
    container.innerHTML = `
        <div class="error-message">
            <p>Не удалось загрузить аналитику</p>
            <small>${message}</small>
        </div>
    `;
}
