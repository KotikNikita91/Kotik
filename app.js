// Конфигурация приложения
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  maxMobileWidth: 500,
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9', '#e1a692', '#d4a5a5', '#f4a261', '#2a9d8f', '#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
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

function getDateRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch(period) {
    case 'current_month':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today,
        label: `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
      };
    case 'last_month':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        start: lastMonth,
        end: new Date(today.getFullYear(), today.getMonth(), 0),
        label: `${String(lastMonth.getMonth() + 1).padStart(2, '0')}.${lastMonth.getFullYear()}`
      };
    case 'last_3':
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 2, 1),
        end: today,
        label: 'last_3'
      };
    case 'last_6':
      return {
        start: new Date(today.getFullYear(), today.getMonth() - 5, 1),
        end: today,
        label: 'last_6'
      };
    case 'year':
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: today,
        label: 'year'
      };
    default:
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today,
        label: 'current'
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
}

// ================== ФИЛЬТРАЦИЯ ДАННЫХ ================== //

function filterDataByPeriod(data, period) {
  const range = getDateRange(period);
  
  // Фильтруем месяцы
  const filteredMonthly = {
    labels: [],
    income: [],
    expenses: []
  };
  
  let totalIncome = 0;
  let totalExpenses = 0;
  
  data.monthly.labels.forEach((label, index) => {
    const monthDate = parseMonthLabel(label);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    // Проверяем, пересекается ли месяц с выбранным периодом
    if (monthStart <= range.end && monthEnd >= range.start) {
      filteredMonthly.labels.push(label);
      filteredMonthly.income.push(data.monthly.income[index]);
      filteredMonthly.expenses.push(data.monthly.expenses[index]);
      
      totalIncome += data.monthly.income[index];
      totalExpenses += data.monthly.expenses[index];
    }
  });
  
  // Для категорий: если выбран конкретный месяц, пропорционально распределяем
  // Если диапазон — берём все категории (т.к. нет детальных данных)
  let filteredCategories = data.categories;
  
  if (period === 'current_month' || period === 'last_month') {
    // Для одного месяца пытаемся оценить пропорции
    const totalExpensesAllTime = data.categories.values.reduce((a, b) => a + b, 0);
    const totalExpensesPeriod = totalExpenses;
    
    if (totalExpensesAllTime > 0 && totalExpensesPeriod > 0) {
      const ratio = totalExpensesPeriod / totalExpensesAllTime;
      filteredCategories = {
        labels: data.categories.labels,
        values: data.categories.values.map(v => Math.round(v * ratio))
      };
    }
  }
  
  return {
    monthly: filteredMonthly,
    categories: filteredCategories,
    summary: {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses
    }
  };
}

function filterDataByType(data, type) {
  if (type === 'all') return data;
  
  // Фильтруем категории по типу
  const filteredCategories = {
    labels: [],
    values: []
  };
  
  if (type === 'expense') {
    // Все категории кроме Дохода
    data.categories.labels.forEach((label, index) => {
      if (label !== '💰 Доход') {
        filteredCategories.labels.push(label);
        filteredCategories.values.push(data.categories.values[index]);
      }
    });
  } else if (type === 'income') {
    // Только Доход
    data.categories.labels.forEach((label, index) => {
      if (label === '💰 Доход') {
        filteredCategories.labels.push(label);
        filteredCategories.values.push(data.categories.values[index]);
      }
    });
  }
  
  // Для monthly: если выбран только доход или только расход
  let filteredMonthly = data.monthly;
  if (type === 'income') {
    filteredMonthly = {
      labels: data.monthly.labels,
      income: data.monthly.income,
      expenses: data.monthly.expenses.map(() => 0) // Обнуляем расходы
    };
  } else if (type === 'expense') {
    filteredMonthly = {
      labels: data.monthly.labels,
      income: data.monthly.income.map(() => 0), // Обнуляем доходы
      expenses: data.monthly.expenses
    };
  }
  
  return {
    ...data,
    categories: filteredCategories,
    monthly: filteredMonthly
  };
}

// ================== ГРАФИКИ ================== //

function renderCharts(data) {
  try {
    // Уничтожаем старые графики
    if (state.charts.category) state.charts.category.destroy();
    if (state.charts.monthly) state.charts.monthly.destroy();

    // 1. Круговой график категорий
    const categoryCanvas = document.getElementById('categoryChart');
    if (categoryCanvas && data.categories.labels.length > 0) {
      // Фильтруем категории с нулевыми значениями
      const nonZeroCategories = {
        labels: [],
        values: []
      };
      
      data.categories.labels.forEach((label, index) => {
        if (data.categories.values[index] > 0) {
          nonZeroCategories.labels.push(label);
          nonZeroCategories.values.push(data.categories.values[index]);
        }
      });
      
      if (nonZeroCategories.labels.length > 0) {
        const categoryCtx = categoryCanvas.getContext('2d');
        state.charts.category = new Chart(categoryCtx, {
          type: 'doughnut',
          data: {
            labels: nonZeroCategories.labels,
            datasets: [{
              data: nonZeroCategories.values,
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
                  font: { size: 11 },
                  boxWidth: 12
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
        // Нет данных для отображения
        const ctx = categoryCanvas.getContext('2d');
        ctx.clearRect(0, 0, categoryCanvas.width, categoryCanvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('Нет данных за выбранный период', categoryCanvas.width / 2, categoryCanvas.height / 2);
      }
    }

    // 2. График динамики по месяцам
    updateMonthlyChart(data.monthly);

  } catch (error) {
    console.error('Ошибка отрисовки графиков:', error);
    showToast('Ошибка обновления графиков', 'error');
  }
}

function updateMonthlyChart(monthlyData) {
  if (!monthlyData || monthlyData.labels.length === 0) {
    const canvas = document.getElementById('monthlyChart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return;
  }
  
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

function renderRecentTransactions() {
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  // Скрываем блок, т.к. нет данных от бэкенда
  container.innerHTML = `
    <div style="text-align: center; padding: 30px; color: #999;">
      <i class="fas fa-clock" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
      <div>Скоро здесь появится список операций</div>
      <div style="font-size: 12px; margin-top: 5px;">Функция в разработке</div>
    </div>
  `;
}

// ================== ЗАГРУЗКА ДАННЫХ ================== //

async function fetchAnalyticsData() {
  try {
    const url = `${CONFIG.scriptURL}?action=getAnalytics`;
    
    console.log('Загрузка данных с URL:', url);
    
    const response = await fetch(url);
    console.log('Ответ получен, статус:', response.status);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    console.log('Данные получены:', data);
    
    if (data.status === 'success' && data.data) {
      state.allData = data.data;
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    throw error;
  }
}

async function updateAnalytics() {
  try {
    console.log('=== НАЧАЛО ОБНОВЛЕНИЯ АНАЛИТИКИ ===');
    
    if (!state.allData) {
      await fetchAnalyticsData();
    }
    
    if (!state.allData) {
      throw new Error('Не удалось загрузить данные');
    }
    
    const period = DOM.periodFilter.value;
    const type = DOM.typeFilter.value;
    
    console.log('Применяем фильтры:', { period, type });
    
    // Фильтруем по периоду
    let filteredData = filterDataByPeriod(state.allData, period);
    
    // Фильтруем по типу
    filteredData = filterDataByType(filteredData, type);
    
    console.log('Отфильтрованные данные:', filteredData);
    
    // Обновляем дашборд
    updateDashboard(filteredData.summary.income, filteredData.summary.expenses);
    
    // Обновляем графики
    renderCharts(filteredData);
    
    // Обновляем транзакции (заглушка)
    renderRecentTransactions();
    
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
    
    console.log('Отправка формы:', {
      date: formData.get('date'),
      category: formData.get('category'),
      sum: formData.get('sum'),
      type: formData.get('type')
    });
    
    const response = await fetch(CONFIG.scriptURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
    
    const result = await response.json();
    console.log('Ответ от сервера:', result);
    
    showToast('Данные успешно сохранены! ✅');
    DOM.form.reset();
    
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
    
    // Сбрасываем кэш и перезагружаем
    state.allData = null;
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
  DOM.form.addEventListener('submit', handleFormSubmit);
  
  if (DOM.periodFilter) {
    DOM.periodFilter.addEventListener('change', updateAnalytics);
  }
  
  if (DOM.typeFilter) {
    DOM.typeFilter.addEventListener('change', updateAnalytics);
  }
  
  if (DOM.showIncome) {
    DOM.showIncome.addEventListener('change', () => {
      if (state.allData) {
        const filtered = filterDataByPeriod(state.allData, DOM.periodFilter.value);
        updateMonthlyChart(filtered.monthly);
      }
    });
  }
  
  if (DOM.showExpenses) {
    DOM.showExpenses.addEventListener('change', () => {
      if (state.allData) {
        const filtered = filterDataByPeriod(state.allData, DOM.periodFilter.value);
        updateMonthlyChart(filtered.monthly);
      }
    });
  }
  
  if (DOM.showBalance) {
    DOM.showBalance.addEventListener('change', () => {
      if (state.allData) {
        const filtered = filterDataByPeriod(state.allData, DOM.periodFilter.value);
        updateMonthlyChart(filtered.monthly);
      }
    });
  }
  
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
  console.log('=== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===');
  
  if (DOM.dateInput) {
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
  }
  
  setupEventListeners();
  handleMobileLayout();
  updateAnalytics();
  
  state.dashboardExpanded = false;
  
  console.log('=== ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА ===');
}

document.addEventListener('DOMContentLoaded', initApp);

window.toggleDashboard = toggleDashboard;
window.updateAnalytics = updateAnalytics;
