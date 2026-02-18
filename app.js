// Конфигурация приложения
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  maxMobileWidth: 500,
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9', '#e1a692', '#d4a5a5', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#e76f51'],
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
  allData: null,
  transactions: [],
  dashboardExpanded: false,
  transactionsExpanded: true // По умолчанию развёрнут
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
  transactionsContent: document.getElementById('transactionsContent')
};

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================== //

function formatCurrency(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}

function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch(period) {
    case 'current_month':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today
      };
    case 'last_month':
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0)
      };
    case 'last_3':
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 2, 1),
        end: today
      };
    case 'last_6':
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 5, 1),
        end: today
      };
    case 'year':
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: today
      };
    default:
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today
      };
  }
}

function parseMonthLabel(label) {
  const [month, year] = label.split('.').map(Number);
  return new Date(year, month - 1, 1);
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

function updateDashboard(income, expenses) {
  const balance = income - expenses;
  
  document.getElementById('totalIncome').textContent = formatCurrency(income);
  document.getElementById('totalExpense').textContent = formatCurrency(expenses);
  document.getElementById('totalBalance').textContent = formatCurrency(balance);
  
  const balanceCard = document.getElementById('balanceCard');
  if (balance < 0) balanceCard.classList.add('negative');
  else balanceCard.classList.remove('negative');
}

// ================== ОПЕРАЦИИ ================== //

function toggleTransactions() {
  state.transactionsExpanded = !state.transactionsExpanded;
  const header = document.querySelector('.transactions-header');
  const content = DOM.transactionsContent;
  
  if (state.transactionsExpanded) {
    header.classList.add('expanded');
    content.classList.add('expanded');
  } else {
    header.classList.remove('expanded');
    content.classList.remove('expanded');
  }
}

function renderTransactions(transactions) {
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<div class="loading-text">Нет операций за выбранный период</div>';
    return;
  }
  
  const html = transactions.map(t => {
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

// ================== ФИЛЬТРАЦИЯ ДАННЫХ ================== //

function filterDataByPeriod(data, transactions, period) {
  const range = getDateRange(period);
  
  // Фильтруем месяцы для графика
  const filteredMonthly = {
    labels: [],
    income: [],
    expenses: []
  };
  
  data.monthly.labels.forEach((label, index) => {
    const monthDate = parseMonthLabel(label);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    if (monthStart <= range.end && monthEnd >= range.start) {
      filteredMonthly.labels.push(label);
      filteredMonthly.income.push(data.monthly.income[index]);
      filteredMonthly.expenses.push(data.monthly.expenses[index]);
    }
  });
  
  // Пересчитываем категории из транзакций за период
  const categories = {};
  let totalIncome = 0;
  let totalExpenses = 0;
  
  const filteredTransactions = transactions.filter(t => {
    const [day, month, year] = t.date.split('.').map(Number);
    const tDate = new Date(year, month - 1, day);
    return tDate >= range.start && tDate <= range.end;
  });
  
  filteredTransactions.forEach(t => {
    if (t.type === 'Расход' && t.category) {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    }
    
    if (t.type === 'Доход') totalIncome += t.amount;
    else totalExpenses += t.amount;
  });
  
  return {
    monthly: filteredMonthly,
    categories: {
      labels: Object.keys(categories),
      values: Object.values(categories)
    },
    summary: {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses
    },
    transactions: filteredTransactions.slice(0, 20) // Последние 20
  };
}

function filterDataByType(data, type) {
  if (type === 'all') return data;
  
  // Фильтруем категории
  const filteredCategories = {
    labels: [],
    values: []
  };
  
  if (type === 'expense') {
    data.categories.labels.forEach((label, index) => {
      if (label !== '💰 Доход') {
        filteredCategories.labels.push(label);
        filteredCategories.values.push(data.categories.values[index]);
      }
    });
  } else if (type === 'income') {
    data.categories.labels.forEach((label, index) => {
      if (label === '💰 Доход') {
        filteredCategories.labels.push(label);
        filteredCategories.values.push(data.categories.values[index]);
      }
    });
  }
  
  // Фильтруем месяцы
  let filteredMonthly = data.monthly;
  if (type === 'income') {
    filteredMonthly = {
      labels: data.monthly.labels,
      income: data.monthly.income,
      expenses: data.monthly.expenses.map(() => 0)
    };
  } else if (type === 'expense') {
    filteredMonthly = {
      labels: data.monthly.labels,
      income: data.monthly.income.map(() => 0),
      expenses: data.monthly.expenses
    };
  }
  
  // Фильтруем транзакции
  const filteredTransactions = data.transactions.filter(t => {
    if (type === 'income') return t.type === 'Доход';
    if (type === 'expense') return t.type === 'Расход';
    return true;
  });
  
  return {
    ...data,
    categories: filteredCategories,
    monthly: filteredMonthly,
    transactions: filteredTransactions
  };
}

// ================== ГРАФИКИ ================== //

function renderCharts(data) {
  try {
    if (state.charts.category) state.charts.category.destroy();
    if (state.charts.monthly) state.charts.monthly.destroy();

    // Круговой график
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas && data.categories.labels.length > 0) {
      const nonZero = {
        labels: [],
        values: []
      };
      
      data.categories.labels.forEach((label, i) => {
        if (data.categories.values[i] > 0) {
          nonZero.labels.push(label);
          nonZero.values.push(data.categories.values[i]);
        }
      });
      
      if (nonZero.labels.length > 0) {
        state.charts.category = new Chart(categoryCanvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: nonZero.labels,
            datasets: [{
              data: nonZero.values,
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
                labels: { padding: 15, font: { size: 11 }, boxWidth: 12 }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const value = formatCurrency(context.parsed);
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `${context.label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });
      }
    }

    // Столбчатый график
    updateMonthlyChart(data.monthly);

  } catch (error) {
    console.error('Ошибка отрисовки графиков:', error);
  }
}

function updateMonthlyChart(monthlyData) {
  if (!monthlyData || monthlyData.labels.length === 0) return;
  
  const datasets = [];
  
  if (DOM.showIncome.checked) {
    datasets.push({
      label: 'Доходы',
      data: monthlyData.income,
      backgroundColor: CONFIG.colors.income,
      borderRadius: 4
    });
  }
  
  if (DOM.showExpenses.checked) {
    datasets.push({
      label: 'Расходы',
      data: monthlyData.expenses,
      backgroundColor: CONFIG.colors.expenses,
      borderRadius: 4
    });
  }
  
  if (DOM.showBalance.checked) {
    const balanceData = monthlyData.income.map((inc, i) => inc - monthlyData.expenses[i]);
    datasets.push({
      label: 'Баланс',
      data: balanceData,
      type: 'line',
      borderColor: CONFIG.colors.balance,
      backgroundColor: CONFIG.colors.balance,
      borderWidth: 2,
      pointRadius: 4
    });
  }

  const ctx = document.getElementById('monthlyChart').getContext('2d');
  
  if (state.charts.monthly) state.charts.monthly.destroy();
  
  state.charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (val) => formatCurrency(val) }
        }
      }
    }
  });
}

// ================== ЗАГРУЗКА ДАННЫХ ================== //

async function fetchAllData() {
  try {
    // Загружаем аналитику
    const analyticsUrl = `${CONFIG.scriptURL}?action=getAnalytics`;
    const analyticsRes = await fetch(analyticsUrl);
    const analyticsData = await analyticsRes.json();
    
    // Загружаем транзакции за текущий период
    const period = DOM.periodFilter.value;
    const type = DOM.typeFilter.value;
    const transUrl = `${CONFIG.scriptURL}?action=getTransactions&period=${period}&type=${type}&limit=100`;
    const transRes = await fetch(transUrl);
    const transData = await transRes.json();
    
    if (analyticsData.status === 'success') {
      state.allData = analyticsData.data;
    }
    
    if (transData.status === 'success') {
      state.transactions = transData.transactions;
    }
    
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    throw error;
  }
}

async function updateAnalytics() {
  try {
    // Всегда перезагружаем данные при изменении фильтров
    await fetchAllData();
    
    if (!state.allData) return;
    
    const period = DOM.periodFilter.value;
    const type = DOM.typeFilter.value;
    
    // Фильтруем по периоду (пересчитываем категории из транзакций)
    let filtered = filterDataByPeriod(state.allData, state.transactions, period);
    
    // Фильтруем по типу
    filtered = filterDataByType(filtered, type);
    
    // Обновляем всё
    updateDashboard(filtered.summary.income, filtered.summary.expenses);
    renderTransactions(filtered.transactions);
    renderCharts(filtered);
    
  } catch (error) {
    console.error('Ошибка:', error);
    showToast('Ошибка загрузки данных', 'error');
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
    
    showToast('Данные сохранены! ✅');
    DOM.form.reset();
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
    
    // Перезагружаем всё
    setTimeout(updateAnalytics, 1000);

  } catch (error) {
    console.error('Ошибка:', error);
    showToast('Ошибка сохранения', 'error');
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

// ================== ИНИЦИАЛИЗАЦИЯ ================== //

function setupEventListeners() {
  DOM.form.addEventListener('submit', handleFormSubmit);
  
  DOM.periodFilter.addEventListener('change', updateAnalytics);
  DOM.typeFilter.addEventListener('change', updateAnalytics);
  
  DOM.showIncome.addEventListener('change', () => {
    if (state.allData) {
      const filtered = filterDataByPeriod(state.allData, state.transactions, DOM.periodFilter.value);
      updateMonthlyChart(filtered.monthly);
    }
  });
  
  DOM.showExpenses.addEventListener('change', () => {
    if (state.allData) {
      const filtered = filterDataByPeriod(state.allData, state.transactions, DOM.periodFilter.value);
      updateMonthlyChart(filtered.monthly);
    }
  });
  
  DOM.showBalance.addEventListener('change', () => {
    if (state.allData) {
      const filtered = filterDataByPeriod(state.allData, state.transactions, DOM.periodFilter.value);
      updateMonthlyChart(filtered.monthly);
    }
  });
  
  window.addEventListener('resize', () => {
    const formWrapper = document.querySelector('.form-wrapper');
    if (formWrapper) {
      formWrapper.style.width = window.innerWidth < CONFIG.maxMobileWidth 
        ? 'calc(100vw - 30px)' 
        : '';
    }
  });
}

function initApp() {
  DOM.dateInput.value = new Date().toISOString().split('T')[0];
  
  setupEventListeners();
  updateAnalytics();
  
  // Дашборд свёрнут, операции развёрнуты по умолчанию
  state.dashboardExpanded = false;
  state.transactionsExpanded = true;
  
  // Устанавливаем начальное состояние
  document.querySelector('.dashboard-content').classList.remove('expanded');
  document.querySelector('.transactions-content').classList.add('expanded');
}

document.addEventListener('DOMContentLoaded', initApp);

window.toggleDashboard = toggleDashboard;
window.toggleTransactions = toggleTransactions;
window.updateAnalytics = updateAnalytics;
