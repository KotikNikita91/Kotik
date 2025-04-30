// Конфигурация
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5'],
    income: '#7daf95',
    expenses: '#e1a692'
  }
};

// Главная функция
async function initAnalytics() {
  try {
    console.log('Инициализация аналитики...');
    
    // 1. Загрузка данных
    const rawData = await loadData();
    console.log('Получены данные:', rawData);
    
    // 2. Проверка и преобразование данных
    const chartData = transformData(rawData);
    console.log('Данные для графиков:', chartData);
    
    // 3. Отрисовка графиков
    renderCharts(chartData);
    
  } catch (error) {
    console.error('Фатальная ошибка:', error);
    showError(`Ошибка загрузки аналитики: ${error.message}`);
  }
}

// Загрузка данных
async function loadData() {
  const response = await fetch(`${CONFIG.scriptURL}?action=getAnalytics`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  if (data.status !== 'success') throw new Error(data.message || 'Invalid data');
  
  return data;
}

// Преобразование данных
function transformData(rawData) {
  // Проверка структуры данных
  if (!rawData.data || !rawData.data.categories || !rawData.data.monthly) {
    throw new Error('Неверный формат данных');
  }
  
  return {
    categories: {
      labels: rawData.data.categories.labels || [],
      values: rawData.data.categories.values || []
    },
    monthly: {
      labels: rawData.data.monthly.labels || [],
      income: rawData.data.monthly.income || [],
      expenses: rawData.data.monthly.expenses || []
    }
  };
}

// Отрисовка графиков
function renderCharts(data) {
  try {
    // 1. График категорий
    const categoryCtx = document.getElementById('categoryChart');
    if (!categoryCtx) throw new Error('Не найден элемент categoryChart');
    
    new Chart(categoryCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.categories.labels,
        datasets: [{
          data: data.categories.values,
          backgroundColor: CONFIG.colors.categories
        }]
      }
    });

    // 2. График по месяцам
    const monthlyCtx = document.getElementById('monthlyChart');
    if (!monthlyCtx) throw new Error('Не найден элемент monthlyChart');
    
    new Chart(monthlyCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.monthly.labels,
        datasets: [
          {
            label: 'Доходы',
            data: data.monthly.income,
            backgroundColor: CONFIG.colors.income
          },
          {
            label: 'Расходы',
            data: data.monthly.expenses,
            backgroundColor: CONFIG.colors.expenses
          }
        ]
      }
    });
    
  } catch (error) {
    throw new Error(`Ошибка отрисовки: ${error.message}`);
  }
}

// Показать ошибку
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chart-error';
  errorDiv.innerHTML = `
    <p>⚠️ Ошибка</p>
    <small>${message}</small>
  `;
  document.querySelector('.analytics-section').appendChild(errorDiv);
}

// Запуск после загрузки страницы
document.addEventListener('DOMContentLoaded', initAnalytics);
