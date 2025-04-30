document.addEventListener('DOMContentLoaded', function() {
    // Здесь будем получать данные из Google Sheets
    loadAnalyticsData();
});

async function loadAnalyticsData() {
    try {
        // URL вашего Google Apps Script для получения данных
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec';
        
        const response = await fetch(scriptURL);
        const data = await response.json();
        
        renderCharts(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function renderCharts(data) {
    // 1. Круговой график по категориям
    const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
    new Chart(categoriesCtx, {
        type: 'doughnut',
        data: {
            labels: data.categories.labels,
            datasets: [{
                data: data.categories.values,
                backgroundColor: [
                    '#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5',
                    '#88c9a1', '#a8d7b9', '#5a8f7b', '#c0dacc',
                    '#8aae92', '#d5ede4', '#7aa89a', '#e1f0e7'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toLocaleString()} ₽`;
                        }
                    }
                }
            }
        }
    });

    // 2. Линейный график по месяцам
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: data.monthly.labels,
            datasets: [
                {
                    label: 'Доходы',
                    data: data.monthly.income,
                    backgroundColor: '#7daf95',
                    borderRadius: 6
                },
                {
                    label: 'Расходы',
                    data: data.monthly.expenses,
                    backgroundColor: '#e1a692',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ₽';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toLocaleString()} ₽`;
                        }
                    }
                }
            }
        }
    });
}
