// Конфигурация приложения
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  maxMobileWidth: 500,
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9', '#e1a692', '#d4a5a5', '#f4a261', '#2a9d8f'],
    income: '#7daf95',
    expenses: '#e1a692',
    balance: '#9bc4b2'
  }
};

// Состояние приложения
const state = {
  isSubmitting: false,
  charts: {
    category: null,
    monthly: null
  },
  currentData: null,
  dashboardExpanded: false
};

// Инициализация DOM элементов
const DOM = {
  form: document.getElementById('budgetForm'),
  submitBtn: document.getElementById('submitBtn'),
  buttonText: document.getElementById('buttonText'),
  spinner: document.getElementById('spinner'),
  toast: document.getElementById('toast'),
  dateInput: document.getElementById('date'),
  periodFilter: document.getElementById('periodFilter'),
  typeFilter: document.getElementById('typeFilter'),
  showIncome: document.getElementById('showIncome'),
  showExpenses: document.getElementById('showExpenses'),
  showBalance: document.getElementById('showBalance'),
  dashboardContent: document.getElementById('dashboardContent'),
  dashboardArrow: document.getElementById('dashboardArrow')
};

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================== //

function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}

function getAnalyticsURL() {
  const url = new URL(CONFIG.scriptURL);
  url.searchParams.append('action', 'getAnalytics');
  url.searchParams.append('period', DOM.periodFilter.value);
  url.searchParams.append('type', DOM.typeFilter.value);
  return url.toString();
}

// ================== ДАШБОРД ================== //

function toggleDashboard() {
  state.dashboardExpanded = !state.dashboardExpanded;
  const header = document.querySelector('.dashboard-header');
  const content = DOM.dashboardContent;
  
  if (state.dashboardExpanded) {
    header.classList.add('expanded');
    content.classList.add('expanded');
  } else {
    header.classList.remove('expanded');
    content.classList.remove('expanded');
  }
}

function updateDashboard(data) {
  if (!data || !data.summary) return;
  
  const { income, expenses, balance } = data.summary;
  
  document.getElementById('totalIncome').textContent = formatCurrency(income);
  document.getElementById('totalExpense').textContent = formatCurrency(expenses);
  document.getElementById('totalBalance').textContent = formatCurrency(balance);
  
  const balanceCard = document.getElementById('balanceCard');
  if (balance < 0) {
    balanceCard.classList.add('negative');
  } else {
    balanceCard.classList.remove('negative');
  }
}

// ================== ГРАФИКИ ================== //

function renderCharts(data) {
  try {
    // Уничтожаем старые графики
    if (state.charts.category) state.charts.category.destroy();
    if (state.charts.monthly) state.charts.monthly.destroy();

    // 1. Круговой график категорий
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    state.charts.category = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: data.categories.labels,
        datasets: [{
          data: data.categories.values,
          backgroundColor: CONFIG.colors.categories,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = formatCurrency(context.parsed);
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    // 2. График динамики по месяцам
    updateMonthlyChart(data.monthly);

  } catch (error) {
    console.error('Ошибка отрисовки графиков:', error);
    showToast('Ошибка обновления графиков', 'error');
  }
}

function updateMonthlyChart(monthlyData) {
  const showIncome = DOM.showIncome.checked;
  const showExpenses = DOM.showExpenses.checked;
  const showBalance = DOM.showBalance.checked;
  
  const datasets = [];
  
  if (showIncome) {
    datasets.push({
      label: 'Доходы',
      data: monthlyData.income,
      backgroundColor: CONFIG.colors.income,
      borderColor: CONFIG.colors.income,
      borderWidth: 2,
      borderRadius: 4,
      tension: 0.4
    });
  }
  
  if (showExpenses) {
    datasets.push({
      label: 'Расходы',
      data: monthlyData.expenses,
      backgroundColor: CONFIG.colors.expenses,
      borderColor: CONFIG.colors.expenses,
      borderWidth: 2,
      borderRadius: 4,
      tension: 0.4
    });
  }
  
  if (showBalance) {
    const balanceData = monthlyData.income.map((inc, i) => inc - monthlyData.expenses[i]);
    datasets.push({
      label: 'Баланс',
      data: balanceData,
      backgroundColor: CONFIG.colors.balance,
      borderColor: CONFIG.colors.balance,
      borderWidth: 2,
      type: 'line',
      tension: 0.4,
      pointRadius: 4
    });
  }

  const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
  
  if (state.charts.monthly) {
    state.charts.monthly.destroy();
  }
  
  state.charts.monthly = new Chart(monthlyCtx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 15, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// ================== ПОСЛЕДНИЕ ОПЕРАЦИИ ================== //

function renderRecentTransactions(transactions) {
  const container = document.getElementById('transactionsList');
  
  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<div class="loading-text">Нет операций за выбранный период</div>';
    return;
  }
  
  const html = transactions.slice(0, 10).map(t => {
    const isIncome = t.type === 'Доход';
    const amountClass = isIncome ? 'income' : 'expense';
    const icon = isIncome ? '💰' : getCategoryIcon(t.category);
    
    return `
      <div class="transaction-item">
        <div class="transaction-icon">${icon}</div>
        <div class="transaction-info">
          <div class="transaction-category">${t.category}</div>
          ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
          <div class="transaction-date">${t.date}</div>
        </div>
        <div class="transaction-amount ${amountClass}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

function getCategoryIcon(category) {
  const icons = {
    '🛒 Продукты': '🛒',
    '🏥 Здоровье': '🏥',
    '🏠 Дом': '🏠',
    '🚗 Автомобиль': '🚗',
    '🐱 Кот': '🐱',
    '📱 Связь': '📱',
    '👕 Одежда': '👕',
    '🍽️ Кафе/Рестораны': '🍽️',
    '🍱 Обед на работе': '🍱',
    '🎮 Развлечения': '🎮',
    '💄 Косметика': '💄',
    '💡 Коммуналка': '💡',
    '🏡 Ипотека': '🏡',
    '🛏 Аренда': '🛏',
    '🚕 Такси/Общ. транспорт': '🚕',
    '✈️ Авиа / ЖД билеты': '✈️',
    '🌎 Отпуск': '🌎',
    '❗ Непредвиденное': '❗',
    '🥊🏈⚽️ Спорт': '⚽',
    '💰 Доход': '💰'
  };
  return icons[category] || '💸';
}

// ================== ЗАГРУЗКА ДАННЫХ ================== //

async function fetchAnalyticsData() {
  try {
    const url = getAnalyticsURL();
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    state.currentData = data;
    
    return data;
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    throw error;
  }
}

async function updateAnalytics() {
  try {
    const data = await fetchAnalyticsData();
    
    if (data.summary) {
      updateDashboard(data);
    }
    
    if (data.categories && data.monthly) {
      renderCharts(data);
    }
    
    if (data.transactions) {
      renderRecentTransactions(data.transactions);
    }
    
  } catch (error) {
    showToast('Не удалось загрузить аналитику', 'error');
    console.error(error);
  }
}

// ================== ФОРМА ================== //

async function handleFormSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  state.isSubmitting = true;
  DOM.submitBtn.disabled = true;
  DOM.buttonText.textContent = 'Сохранение...';
  DOM.spinner.classList.remove('hidden');

  try {
    const formData = new FormData(DOM.form);
    const response = await fetch(CONFIG.scriptURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    
    showToast('Данные успешно сохранены! ✅');
    DOM.form.reset();
    
    // Обновляем дату и аналитику
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
    setTimeout(updateAnalytics, 1000);

  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    showToast(error.message || 'Ошибка сохранения', 'error');
  } finally {
    DOM.submitBtn.disabled = false;
    DOM.buttonText.textContent = 'Сохранить';
    DOM.spinner.classList.add('hidden');
    state.isSubmitting = false;
  }
}

function showToast(message, type = 'success') {
  DOM.toast.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

// ================== ОБРАБОТЧИКИ СОБЫТИЙ ================== //

function setupEventListeners() {
  // Форма
  DOM.form.addEventListener('submit', handleFormSubmit);
  
  // Фильтры
  DOM.periodFilter.addEventListener('change', updateAnalytics);
  DOM.typeFilter.addEventListener('change', updateAnalytics);
  
  // Тогглы графика
  DOM.showIncome.addEventListener('change', () => {
    if (state.currentData) updateMonthlyChart(state.currentData.monthly);
  });
  DOM.showExpenses.addEventListener('change', () => {
    if (state.currentData) updateMonthlyChart(state.currentData.monthly);
  });
  DOM.showBalance.addEventListener('change', () => {
    if (state.currentData) updateMonthlyChart(state.currentData.monthly);
  });
  
  // Мобильная оптимизация
  window.addEventListener('resize', handleMobileLayout);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

function handleMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  
  formWrapper.style.width = window.innerWidth < CONFIG.maxMobileWidth 
    ? 'calc(100vw - 30px)' 
    : '';
}

// ================== ИНИЦИАЛИЗАЦИЯ ================== //

function initApp() {
  // Установка текущей даты
  DOM.dateInput.value = new Date().toISOString().split('T')[0];
  
  // Настройка обработчиков
  setupEventListeners();
  
  // Первичная настройка
  handleMobileLayout();
  
  // Загрузка данных
  updateAnalytics();
  
  // Дашборд свёрнут по умолчанию
  state.dashboardExpanded = false;
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);

// Экспорт для глобального доступа
window.toggleDashboard = toggleDashboard;
window.updateAnalytics = updateAnalytics;
