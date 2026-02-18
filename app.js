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

// Форматирование валюты
function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0}).format(n);
}

// Переключение секций
function toggleSection(name) {
  const content = document.getElementById(name + '-content');
  const icon = document.getElementById(name + '-icon');
  content.classList.toggle('expanded');
  icon.classList.toggle('rotated');
}

// Загрузка данных
async function loadData() {
  const period = document.getElementById('periodFilter').value;
  const type = document.getElementById('typeFilter').value;
  
  try {
    const url = `${CONFIG.scriptURL}?action=getAnalytics&period=${period}&type=${type}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status !== 'success') {
      showToast('Ошибка загрузки', 'error');
      return;
    }
    
    updateDashboard(data.summary);
    updateTransactions(data.transactions);
    updateCharts(data);
    
  } catch (e) {
    console.error(e);
    showToast('Ошибка соединения', 'error');
  }
}

// Обновление сводки
function updateDashboard(summary) {
  document.getElementById('totalIncome').textContent = formatMoney(summary.income);
  document.getElementById('totalExpense').textContent = formatMoney(summary.expenses);
  document.getElementById('totalBalance').textContent = formatMoney(summary.balance);
  
  const card = document.getElementById('balanceCard');
  if (summary.balance < 0) card.classList.add('negative');
  else card.classList.remove('negative');
}

// Обновление операций
function updateTransactions(list) {
  const container = document.getElementById('transactionsList');
  
  if (!list || list.length === 0) {
    container.innerHTML = '<div class="loading-text">Нет операций</div>';
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
          <div class="transaction-category">${t.category}</div>
          ${t.description ? `<div class="transaction-description">${t.description}</div>` : ''}
          <div class="transaction-date">${t.date}</div>
        </div>
        <div class="transaction-amount ${isInc ? 'income' : 'expense'}">
          ${isInc ? '+' : '-'}${formatMoney(t.amount)}
        </div>
      </div>
    `;
  }).join('');
}

// Обновление графиков
function updateCharts(data) {
  // Уничтожаем старые
  if (charts.category) charts.category.destroy();
  if (charts.monthly) charts.monthly.destroy();
  
  // Круговой график
  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas && data.categories.labels.length > 0) {
    charts.category = new Chart(catCanvas, {
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
  }
  
  // Столбчатый график
  const showInc = document.getElementById('showIncome').checked;
  const showExp = document.getElementById('showExpenses').checked;
  const showBal = document.getElementById('showBalance').checked;
  
  const datasets = [];
  if (showInc) datasets.push({label: 'Доходы', data: data.monthly.income, backgroundColor: CONFIG.colors.income, borderRadius: 4});
  if (showExp) datasets.push({label: 'Расходы', data: data.monthly.expenses, backgroundColor: CONFIG.colors.expenses, borderRadius: 4});
  if (showBal) {
    const bal = data.monthly.income.map((v, i) => v - data.monthly.expenses[i]);
    datasets.push({label: 'Баланс', data: bal, type: 'line', borderColor: CONFIG.colors.balance, borderWidth: 2, pointRadius: 4});
  }
  
  if (datasets.length > 0) {
    charts.monthly = new Chart(document.getElementById('monthlyChart'), {
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
document.getElementById('budgetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('submitBtn');
  const txt = document.getElementById('buttonText');
  const spin = document.getElementById('spinner');
  
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
      document.getElementById('date').value = new Date().toISOString().split('T')[0];
      setTimeout(loadData, 500);
    } else {
      showToast(data.message || 'Ошибка', 'error');
    }
    
  } catch (err) {
    showToast('Ошибка соединения', 'error');
  } finally {
    btn.disabled = false;
    txt.textContent = 'Сохранить';
    spin.classList.add('hidden');
  }
});

// Фильтры
document.getElementById('periodFilter').addEventListener('change', loadData);
document.getElementById('typeFilter').addEventListener('change', loadData);

// Тогглы графика
['showIncome', 'showExpenses', 'showBalance'].forEach(id => {
  document.getElementById(id).addEventListener('change', loadData);
});

// Тост
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Инициализация
document.getElementById('date').value = new Date().toISOString().split('T')[0];
loadData();
