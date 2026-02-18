const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9', '#e1a692', '#d4a5a5', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#e76f51'],
    income: '#7daf95',
    expenses: '#e1a692',
    balance: '#9bc4b2'
  }
};

let charts = {};

function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0}).format(n || 0);
}

function toggleSection(name) {
  const content = document.getElementById(name + '-content');
  const icon = document.getElementById(name + '-icon');
  if (content && icon) {
    content.classList.toggle('expanded');
    icon.classList.toggle('rotated');
  }
}

async function loadData() {
  const period = document.getElementById('periodFilter')?.value || 'current_month';
  const type = document.getElementById('typeFilter')?.value || 'all';
  
  console.log('Загрузка данных:', {period, type});
  
  try {
    const url = `${CONFIG.scriptURL}?action=getAnalytics&period=${period}&type=${type}`;
    console.log('URL:', url);
    
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('Ответ:', data);
    
    if (data.status !== 'success') {
      console.error('Ошибка в ответе:', data);
      showToast(data.message || 'Ошибка загрузки', 'error');
      return;
    }
    
    // Проверяем структуру данных
    if (!data.summary) {
      console.error('Нет summary в данных:', data);
      showToast('Некорректные данные от сервера', 'error');
      return;
    }
    
    updateDashboard(data.summary);
    updateTransactions(data.transactions || []);
    updateCharts(data);
    
  } catch (e) {
    console.error('Ошибка загрузки:', e);
    showToast('Ошибка соединения', 'error');
  }
}

function updateDashboard(summary) {
  console.log('Обновление дашборда:', summary);
  
  const incomeEl = document.getElementById('totalIncome');
  const expenseEl = document.getElementById('totalExpense');
  const balanceEl = document.getElementById('totalBalance');
  const card = document.getElementById('balanceCard');
  
  if (incomeEl) incomeEl.textContent = formatMoney(summary.income);
  if (expenseEl) expenseEl.textContent = formatMoney(summary.expenses);
  if (balanceEl) balanceEl.textContent = formatMoney(summary.balance);
  
  if (card) {
    if ((summary.balance || 0) < 0) card.classList.add('negative');
    else card.classList.remove('negative');
  }
}

function updateTransactions(list) {
  console.log('Обновление операций:', list);
  
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="loading-text">Нет операций за выбранный период</div>';
    return;
  }
  
  const icons = {
    '🛒 Продукты': '🛒', '🏥 Здоровье': '🏥', '🏠 Дом': '🏠', '🚗 Автомобиль': '🚗',
    '🐱 Кот': '🐱', '📱 Связь': '📱', '👕 Одежда': '👕', '🍽️ Кафе/Рестораны': '🍽️',
    '🍱 Обед на работе': '🍱', '🎮 Развлечения': '🎮', '💄 Косметика': '💄',
    '💡 Коммуналка': '💡', '🏡 Ипотека': '🏡', '🛏 Аренда': '🛏',
    '🚕 Такси/Общ. транспорт': '🚕', '✈️ Авиа / ЖД билеты': '✈️',
    '🌎 Отпуск': '🌎', '❗ Непредвиденное': '❗', '🥊🏈⚽️ Спорт': '⚽', '💰 Доход': '💰'
  };
  
  container.innerHTML = list.map(t => {
    const isInc = t.type === 'Доход';
    return `
      <div class="transaction-item">
        <div class="transaction-icon">${icons[t.category] || '💸'}</div>
        <div class="transaction-info">
          <div class="transaction-category">${t.category || 'Без категории'}</div>
          ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
          <div class="transaction-date">${t.date || '-'}</div>
        </div>
        <div class="transaction-amount ${isInc ? 'income' : 'expense'}">
          ${isInc ? '+' : '-'}${formatMoney(t.amount)}
        </div>
      </div>
    `;
  }).join('');
}

function updateCharts(data) {
  console.log('Обновление графиков:', data);
  
  // Уничтожаем старые
  if (charts.category) {
    charts.category.destroy();
    charts.category = null;
  }
  if (charts.monthly) {
    charts.monthly.destroy();
    charts.monthly = null;
  }
  
  // Проверяем данные
  if (!data.categories || !data.monthly) {
    console.error('Нет данных для графиков:', data);
    return;
  }
  
  // Круговой график
  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas && data.categories.labels && data.categories.labels.length > 0) {
    const ctx = catCanvas.getContext('2d');
    charts.category = new Chart(ctx, {
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
          legend: {position: 'bottom', labels: {font: {size: 11}, boxWidth: 12}},
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const sum = ctx.dataset.data.reduce((a,b) => a+b, 0);
                const pct = ((ctx.parsed / sum) * 100).toFixed(1);
                return `${ctx.label}: ${formatMoney(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  } else if (catCanvas) {
    // Очищаем canvas если нет данных
    const ctx = catCanvas.getContext('2d');
    ctx.clearRect(0, 0, catCanvas.width, catCanvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText('Нет данных', catCanvas.width/2, catCanvas.height/2);
  }
  
  // Столбчатый график
  const showInc = document.getElementById('showIncome')?.checked ?? true;
  const showExp = document.getElementById('showExpenses')?.checked ?? true;
  const showBal = document.getElementById('showBalance')?.checked ?? false;
  
  const datasets = [];
  if (showInc && data.monthly.income) {
    datasets.push({
      label: 'Доходы', 
      data: data.monthly.income, 
      backgroundColor: CONFIG.colors.income, 
      borderRadius: 4
    });
  }
  if (showExp && data.monthly.expenses) {
    datasets.push({
      label: 'Расходы', 
      data: data.monthly.expenses, 
      backgroundColor: CONFIG.colors.expenses, 
      borderRadius: 4
    });
  }
  if (showBal && data.monthly.income && data.monthly.expenses) {
    const bal = data.monthly.income.map((v, i) => v - data.monthly.expenses[i]);
    datasets.push({
      label: 'Баланс', 
      data: bal, 
      type: 'line', 
      borderColor: CONFIG.colors.balance, 
      borderWidth: 2, 
      pointRadius: 4
    });
  }
  
  const monCanvas = document.getElementById('monthlyChart');
  if (monCanvas && datasets.length > 0 && data.monthly.labels && data.monthly.labels.length > 0) {
    charts.monthly = new Chart(monCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.monthly.labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {position: 'bottom'},
          tooltip: {callbacks: {label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.parsed.y)}`}}
        },
        scales: {
          y: {beginAtZero: true, ticks: {callback: (v) => formatMoney(v)}}
        }
      }
    });
  }
}

// Отправка формы
document.getElementById('budgetForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('submitBtn');
  const txt = document.getElementById('buttonText');
  const spin = document.getElementById('spinner');
  
  if (!btn || !txt || !spin) return;
  
  btn.disabled = true;
  txt.textContent = 'Сохранение...';
  spin.classList.remove('hidden');
  
  try {
    const res = await fetch(CONFIG.scriptURL, {
      method: 'POST',
      body: new FormData(e.target)
    });
    
    const data = await res.json();
    
    if (data.status === 'success') {
      showToast('Сохранено! ✅');
      e.target.reset();
      const dateInput = document.getElementById('date');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      setTimeout(loadData, 500);
    } else {
      showToast(data.message || 'Ошибка', 'error');
    }
    
  } catch (err) {
    console.error(err);
    showToast('Ошибка соединения', 'error');
  } finally {
    btn.disabled = false;
    txt.textContent = 'Сохранить';
    spin.classList.add('hidden');
  }
});

// Обработчики фильтров
document.getElementById('periodFilter')?.addEventListener('change', loadData);
document.getElementById('typeFilter')?.addEventListener('change', loadData);

// Тогглы графика
['showIncome', 'showExpenses', 'showBalance'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', loadData);
});

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  
  // Разворачиваем секции по умолчанию
  const transContent = document.getElementById('transactions-content');
  const transIcon = document.getElementById('transactions-icon');
  if (transContent && transIcon) {
    transContent.classList.add('expanded');
    transIcon.classList.add('rotated');
  }
  
  loadData();
});
