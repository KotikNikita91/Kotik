// Конфигурация приложения
const CONFIG = {
  // ВАШ URL Google Apps Script (используется и для POST, и для GET)
  scriptURL: 'https://script.google.com/macros/s/AKfycbxKO5p5ZNnbzMzJP2SwUdBhfCObgX0ZDYFBxcC9A3cFGaPufSbt-gwaieYPmDr9SMA/exec',
  maxMobileWidth: 500,
  storageKeys: {
    city: 'family_budget_city'
  },
  cityTags: {
    msk: 'Мск'
  },
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9', '#e1a692', '#d4b896'],
    income: '#7daf95',
    expenses: '#e1a692'
  }
};

// Состояние приложения
const state = {
  isSubmitting: false,
  city: '',
  charts: {
    category: null,
    monthly: null
  }
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
  summaryIncome: document.getElementById('summaryIncome'),
  summaryExpenses: document.getElementById('summaryExpenses'),
  summaryBalance: document.getElementById('summaryBalance'),
  transactionsList: document.getElementById('transactionsList'),
  categoryEmpty: document.getElementById('categoryEmpty'),
  monthlyEmpty: document.getElementById('monthlyEmpty'),
  cityMskBtn: document.getElementById('cityMskBtn'),
  cityHint: document.getElementById('cityHint')
};

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================== //

function handleMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  formWrapper.style.width = window.innerWidth < CONFIG.maxMobileWidth
    ? 'calc(100vw - 30px)'
    : '';
}

function showToast(message, type = 'success') {
  DOM.toast.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

function formatMoney(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function setCityTag(city) {
  state.city = city || '';
  try {
    if (state.city) localStorage.setItem(CONFIG.storageKeys.city, state.city);
    else localStorage.removeItem(CONFIG.storageKeys.city);
  } catch (_) {}

  const isMsk = state.city === CONFIG.cityTags.msk;
  if (DOM.cityMskBtn) {
    DOM.cityMskBtn.classList.toggle('active', isMsk);
    DOM.cityMskBtn.setAttribute('aria-pressed', String(isMsk));
  }
  if (DOM.cityHint) {
    DOM.cityHint.textContent = state.city ? `активно: ${state.city}` : 'по умолчанию — без города';
  }
}

function initCityToggle() {
  let saved = '';
  try {
    saved = localStorage.getItem(CONFIG.storageKeys.city) || '';
  } catch (_) {}
  setCityTag(saved);

  if (DOM.cityMskBtn) {
    DOM.cityMskBtn.addEventListener('click', () => {
      const next = state.city === CONFIG.cityTags.msk ? '' : CONFIG.cityTags.msk;
      setCityTag(next);
    });
  }
}

// ================== ЗАГРУЗКА ДАННЫХ ================== //

async function fetchAnalyticsData(period = 'current_month') {
  const url = `${CONFIG.scriptURL}?period=${encodeURIComponent(period)}`;
  const response = await fetchWithTimeout(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// ================== ОТРИСОВКА ================== //

function renderSummary(summary) {
  if (!summary) return;
  DOM.summaryIncome.textContent = formatMoney(summary.income || 0);
  DOM.summaryExpenses.textContent = formatMoney(summary.expenses || 0);
  const balance = summary.balance || 0;
  DOM.summaryBalance.textContent = formatMoney(balance);
  DOM.summaryBalance.parentElement.classList.toggle('negative', balance < 0);
}

function renderTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    DOM.transactionsList.innerHTML = '<p class="no-data">Операций за выбранный период нет</p>';
    return;
  }

  const rows = transactions.map(t => {
    const isIncome = t.type === 'Доход';
    const cityBadge = t.city ? `<span class="city-badge" title="Город">${escapeHtml(t.city)}</span>` : '';
    const desc = t.description ? `<div class="tr-desc">${escapeHtml(t.description)}</div>` : '';

    return `
      <div class="transaction-row ${isIncome ? 'income' : 'expense'}">
        <div class="tr-left">
          <div class="tr-category">${cityBadge}${escapeHtml(t.category || '—')}</div>
          ${desc}
        </div>
        <div class="tr-right">
          <div class="tr-amount">${isIncome ? '+' : '-'}${formatMoney(t.amount)}</div>
          <div class="tr-date">${escapeHtml(t.date)}</div>
        </div>
      </div>
    `;
  }).join('');

  DOM.transactionsList.innerHTML = rows;
}

function renderCharts(data) {
  // ---- Круговой: расходы по категориям ----
  const catLabels = data.categories ? data.categories.labels : [];
  const catValues = data.categories ? data.categories.values : [];

  if (state.charts.category) state.charts.category.destroy();

  if (catLabels.length === 0) {
    document.getElementById('categoryChart').style.display = 'none';
    DOM.categoryEmpty.style.display = 'block';
  } else {
    document.getElementById('categoryChart').style.display = 'block';
    DOM.categoryEmpty.style.display = 'none';
    state.charts.category = new Chart(
      document.getElementById('categoryChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: CONFIG.colors.categories,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}`
              }
            }
          }
        }
      }
    );
  }

  // ---- Столбчатый: доходы и расходы по месяцам ----
  const monthLabels = data.monthly ? data.monthly.labels : [];

  if (state.charts.monthly) state.charts.monthly.destroy();

  if (monthLabels.length === 0) {
    document.getElementById('monthlyChart').style.display = 'none';
    DOM.monthlyEmpty.style.display = 'block';
  } else {
    document.getElementById('monthlyChart').style.display = 'block';
    DOM.monthlyEmpty.style.display = 'none';
    state.charts.monthly = new Chart(
      document.getElementById('monthlyChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Доходы',
              data: data.monthly.income,
              backgroundColor: CONFIG.colors.income,
              borderRadius: 6
            },
            {
              label: 'Расходы',
              data: data.monthly.expenses,
              backgroundColor: CONFIG.colors.expenses,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: val => formatMoney(val) }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
              }
            }
          }
        }
      }
    );
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ================== ОБНОВЛЕНИЕ АНАЛИТИКИ ================== //

async function updateAnalytics() {
  const period = DOM.periodFilter ? DOM.periodFilter.value : 'current_month';

  DOM.transactionsList.innerHTML = '<p class="loading-text">Загрузка...</p>';
  DOM.summaryIncome.textContent = '...';
  DOM.summaryExpenses.textContent = '...';
  DOM.summaryBalance.textContent = '...';

  try {
    const data = await fetchAnalyticsData(period);
    if (data.status !== 'success') throw new Error(data.message || 'Ошибка сервера');

    renderSummary(data.summary);
    renderCharts(data);
    renderTransactions(data.transactions);
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    const msg = error && error.name === 'AbortError'
      ? 'Превышено время ожидания ответа. Проверьте сеть и попробуйте снова.'
      : 'Не удалось загрузить данные. Проверьте подключение.';
    DOM.transactionsList.innerHTML = `<p class="no-data">${msg}</p>`;
    DOM.summaryIncome.textContent = '—';
    DOM.summaryExpenses.textContent = '—';
    DOM.summaryBalance.textContent = '—';
    showToast('Не удалось загрузить аналитику', 'error');
  }
}

// ================== ОТПРАВКА ФОРМЫ ================== //

async function handleFormSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  state.isSubmitting = true;
  DOM.submitBtn.disabled = true;
  DOM.buttonText.textContent = 'Сохранение...';
  DOM.spinner.classList.remove('hidden');

  try {
    const formData = new FormData(DOM.form);
    if (state.city) formData.set('city', state.city);

    const response = await fetchWithTimeout(CONFIG.scriptURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Ошибка сохранения');

    showToast('Данные успешно сохранены!');
    DOM.form.reset();
    DOM.dateInput.value = new Date().toISOString().split('T')[0];

    setTimeout(updateAnalytics, 700);
  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    const msg = error && error.name === 'AbortError'
      ? 'Превышено время ожидания при сохранении. Проверьте сеть.'
      : (error.message || 'Ошибка сохранения');
    showToast(msg, 'error');
  } finally {
    DOM.submitBtn.disabled = false;
    DOM.buttonText.textContent = 'Сохранить';
    DOM.spinner.classList.add('hidden');
    state.isSubmitting = false;
  }
}

// ================== ИНИЦИАЛИЗАЦИЯ ================== //

function initApp() {
  DOM.dateInput.value = new Date().toISOString().split('T')[0];

  initCityToggle();

  DOM.form.addEventListener('submit', handleFormSubmit);
  window.addEventListener('resize', handleMobileLayout);
  document.addEventListener('gesturestart', e => e.preventDefault());

  if (DOM.periodFilter) DOM.periodFilter.addEventListener('change', updateAnalytics);

  handleMobileLayout();
  updateAnalytics();
}

document.addEventListener('DOMContentLoaded', initApp);

window.updateAnalytics = updateAnalytics;

