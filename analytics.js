// Глобальные переменные
let categoryChart, monthlyChart;

async function initAnalytics() {
    try {
        // Загрузка данных
        const data = await loadData();
        
        // Очистка предыдущих графиков
        if (categoryChart) categoryChart.destroy();
        if (monthlyChart) monthlyChart.destroy();
        
        // Создание новых графиков
        renderCharts(data);
    } catch (error) {
        console.error('Ошибка:', error);
        showError(error.message);
    }
}

async function loadData() {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec');
    if (!response.ok) throw new Error('Ошибка загрузки данных');
    return await response.json();
}

function renderCharts(data) {
    try {
        // График категорий
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: data.data.categories.labels,
                datasets: [{
                    data: data.data.categories.values,
                    backgroundColor: [
                        '#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5',
                        '#88c9a1', '#a8d7b9', '#5a8f7b', '#c0dacc'
                    ]
                }]
            }
        });

        // График по месяцам
        const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
        monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: data.data.monthly.labels,
                datasets: [
                    {
                        label: 'Доходы',
                        data: data.data.monthly.income,
                        backgroundColor: '#7daf95'
                    },
                    {
                        label: 'Расходы',
                        data: data.data.monthly.expenses,
                        backgroundColor: '#e1a692'
                    }
                ]
            }
        });
    } catch (error) {
        throw new Error('Failed to create chart: ' + error.message);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `Ошибка: ${message}`;
    document.querySelector('.analytics-section').appendChild(errorDiv);
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', initAnalytics);
