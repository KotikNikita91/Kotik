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
  console.log('URL для запроса:', url.toString()); // ОТЛАДКА
  return url.toString();
}

// ================== ДАШБОРД ================== //

function updateDashboard(data) {
  console.log('Обновление дашборда, данные:', data);
  
  // Вычисляем сводку из данных monthly, если нет summary
  let income = 0, expenses = 0;
  
  if (data.summary) {
    income = data.summary.income;
    expenses = data.summary.expenses;
  } else if (data.data && data.data.monthly) {
    // Считаем из monthly
    const monthly = data.data.monthly;
    income = monthly.income.reduce((a, b) => a + b, 0);
    expenses = monthly.expenses.reduce((a, b) => a + b, 0);
  }
  
  const balance = income - expenses;
  
  const incomeEl = document.getElementById('totalIncome');
  const expenseEl = document.getElementById('totalExpense');
  const balanceEl = document.getElementById('totalBalance');
  const balanceCard = document.getElementById('balanceCard');
  
  if (incomeEl) incomeEl.textContent = formatCurrency(income);
  if (expenseEl) expenseEl.textContent = formatCurrency(expenses);
  if (balanceEl) balanceEl.textContent = formatCurrency(balance);
  
  if (balanceCard) {
    if (balance < 0) balanceCard.classList.add('negative');
    else balanceCard.classList.remove('negative');
  }
  
  console.log('Дашборд обновлен:', {income, expenses, balance});
}

// ================== ГРАФИКИ ================== //

function renderCharts(data) {
  try {
    console.log('Рендеринг графиков, данные:', data); // ОТЛАДКА
    
    // Уничтожаем старые графики
    if (state.charts.category) state.charts.category.destroy();
    if (state.charts.monthly) state.charts.monthly.destroy();

    // Данные в data.data
    const chartData = data.data;
    
    if (!chartData) {
      console.error('Нет chartData:', data);
      return;
    }

    console.log('Категории:', chartData.categories); // ОТЛАДКА
    console.log('Месяцы:', chartData.monthly); // ОТЛАДКА

    // 1. Круговой график категорий
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas && chartData.categories && chartData.categories.labels.length > 0) {
      const categoryCtx = categoryCanvas.getContext('2d');
      state.charts.category = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: chartData.categories.labels,
          datasets: [{
            data: chartData.categories.values,
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
    } else {
      console.log('Нет данных для графика категорий'); // ОТЛАДКА
    }

    // 2. График динамики по месяцам
    if (chartData.monthly && chartData.monthly.labels.length > 0) {
      updateMonthlyChart(chartData.monthly);
    } else {
      console.log('Нет данных для графика по месяцам'); // ОТЛАДКА
    }

  } catch (error) {
    console.error('Ошибка отрисовки графиков:', error);
    showToast('Ошибка обновления графиков', 'error');
  }
}

function updateMonthlyChart(monthlyData) {
  if (!monthlyData) return;
  
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

  const monthlyCanvas = document.getElementById('monthlyChart');
  if (!monthlyCanvas) return;
  
  const monthlyCtx = monthlyCanvas.getContext('2d');
  
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
  console.log('Рендеринг транзакций:', transactions);
  
  const container = document.getElementById('transactionsList');
  if (!container) {
    console.error('Не найден контейнер transactionsList');
    return;
  }
  
  // Если транзакций нет в ответе, показываем заглушку
  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<div class="loading-text">Нет операций за выбранный период</div>';
    return;
  }
  
  const html = transactions.map((t, index) => {
    console.log(`Транзакция ${index}:`, t);
    
    const isIncome = t.type === 'Доход';
    const amountClass = isIncome ? 'income' : 'expense';
    const icon = isIncome ? '💰' : getCategoryIcon(t.category);
    
    return `
      <div class="transaction-item">
        <div class="transaction-icon">${icon}</div>
        <div class="transaction-info">
          <div class="transaction-category">${t.category || 'Без категории'}</div>
          ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
          <div class="transaction-date">${t.date || '-'}</div>
        </div>
        <div class="transaction-amount ${amountClass}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount || 0)}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  console.log('Транзакции отрендерены');
}

function getCategoryIcon(category) {
  if (!category) return '💸';
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

async function updateAnalytics() {
  try {
    console.log('=== НАЧАЛО ОБНОВЛЕНИЯ АНАЛИТИКИ ===');
    const data = await fetchAnalyticsData();
    
    // ВСЕГДА обновляем дашборд (вычисляем из данных)
    console.log('Обновляем дашборд');
    updateDashboard(data);
    
    // Графики в data.data
    if (data.data && data.data.categories && data.data.monthly) {
      console.log('Найдены данные для графиков');
      renderCharts(data);
    } else {
      console.warn('Нет данных для графиков:', data.data);
    }
    
    // Транзакции - пока заглушка, т.к. бэкенд их не возвращает
    console.log('Транзакции временно недоступны (нет в ответе бэкенда)');
    const container = document.getElementById('transactionsList');
    if (container) {
      container.innerHTML = '<div class="loading-text">Функция в разработке</div>';
    }
    
    console.log('=== КОНЕЦ ОБНОВЛЕНИЯ АНАЛИТИКИ ===');
    
  } catch (error) {
    console.error('Ошибка в updateAnalytics:', error);
    showToast('Не удалось загрузить аналитику', 'error');
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
    
    // Логируем данные формы
    console.log('Отправка формы:', {
      date: formData.get('date'),
      category: formData.get('category'),
      sum: formData.get('sum'),
      description: formData.get('description'),
      type: formData.get('type')
    }); // ОТЛАДКА
    
    const response = await fetch(CONFIG.scriptURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    
    const result = await response.json();
    console.log('Ответ от сервера:', result); // ОТЛАДКА
    
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
  
  // Фильтры - важно: используем change и проверяем, что элементы существуют
  if (DOM.periodFilter) {
    DOM.periodFilter.addEventListener('change', () => {
      console.log('Изменен период на:', DOM.periodFilter.value); // ОТЛАДКА
      updateAnalytics();
    });
  }
  
  if (DOM.typeFilter) {
    DOM.typeFilter.addEventListener('change', () => {
      console.log('Изменен тип на:', DOM.typeFilter.value); // ОТЛАДКА
      updateAnalytics();
    });
  }
  
  // Тогглы графика
  if (DOM.showIncome) {
    DOM.showIncome.addEventListener('change', () => {
      if (state.currentData && state.currentData.data) {
        updateMonthlyChart(state.currentData.data.monthly);
      }
    });
  }
  
  if (DOM.showExpenses) {
    DOM.showExpenses.addEventListener('change', () => {
      if (state.currentData && state.currentData.data) {
        updateMonthlyChart(state.currentData.data.monthly);
      }
    });
  }
  
  if (DOM.showBalance) {
    DOM.showBalance.addEventListener('change', () => {
      if (state.currentData && state.currentData.data) {
        updateMonthlyChart(state.currentData.data.monthly);
      }
    });
  }
  
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
  console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==='); // ОТЛАДКА
  
  // Проверяем наличие DOM элементов
  console.log('DOM элементы:', {
    form: !!DOM.form,
    periodFilter: !!DOM.periodFilter,
    typeFilter: !!DOM.typeFilter,
    showIncome: !!DOM.showIncome,
    showExpenses: !!DOM.showExpenses,
    showBalance: !!DOM.showBalance
  }); // ОТЛАДКА
  
  // Установка текущей даты
  if (DOM.dateInput) {
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
  }
  
  // Настройка обработчиков
  setupEventListeners();
  
  // Первичная настройка
  handleMobileLayout();
  
  // Загрузка данных
  updateAnalytics();
  
  // Дашборд свёрнут по умолчанию
  state.dashboardExpanded = false;
  
  console.log('=== ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА ==='); // ОТЛАДКА
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);

// Экспорт для глобального доступа
window.toggleDashboard = toggleDashboard;
window.updateAnalytics = updateAnalytics;
