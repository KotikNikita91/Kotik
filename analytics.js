// Глобальные переменные для данных
let expenseData = [];

// Инициализация аналитики
function initAnalytics() {
    loadData().then(() => {
        renderCharts();
    });
}

// Загрузка данных
async function loadData() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec');
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message);
        
        expenseData = data.expenses.map(item => ({
            date: item[0],
            category: item[1],
            amount: parseFloat(item[2]),
            type: item[3]
        }));
        
    } catch (error) {
        console.error('Ошибка:', error);
        showError(error.message);
    }
}

// Анализ данных по месяцам
function analyzeMonthlyData() {
    const months = {};
    
    expenseData.forEach(item => {
        if (item.type !== 'Расход') return;
        
        const date = new Date(item.date);
        const monthYear = `${date.getMonth()+1}/${date.getFullYear()}`;
        
        months[monthYear] = (months[monthYear] || 0) + item.amount;
    });
    
    return {
        labels: Object.keys(months).map(label => {
            const [month, year] = label.split('/');
            return `${month.padStart(2, '0')}.${year}`;
        }),
        amounts: Object.values(months)
    };
}

// Анализ по категориям
function analyzeCategoryData() {
    const categories = {};
    
    expenseData
        .filter(item => item.type === 'Расход')
        .forEach(item => {
            categories[item.category] = (categories[item.category] || 0) + item.amount;
        });
    
    return {
        labels: Object.keys(categories),
        amounts: Object.values(categories),
        colors: generateColors(Object.keys(categories).length)
    };
}

// Генерация цветов для графиков
function generateColors(count) {
    const palette = [
        '#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5',
        '#88c9a1', '#a8d7b9', '#5a8f7b', '#c0dacc'
    ];
    return Array(count).fill().map((_, i) => palette[i % palette.length]);
}

// Отрисовка графиков
function renderCharts() {
    // Данные для графиков
    const monthlyData = analyzeMonthlyData();
    const categoryData = analyzeCategoryData();
    
    // График категорий
    new Chart(document.getElementById('categoryChart'), {
        type: 'doughnut',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.amounts,
                backgroundColor: categoryData.colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // График по месяцам
    new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Расходы',
                data: monthlyData.amounts,
                backgroundColor: '#7daf95',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Показ ошибок
function showError(message) {
    const container = document.querySelector('.analytics-container');
    container.innerHTML += `
        <div class="error-message">
            Ошибка: ${message}
        </div>
    `;
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initAnalytics);
