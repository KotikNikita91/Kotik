// Конфигурация
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxNFAEsdDx9M86ud1hMC4A2XMPNNPqz5rLmO3LSbnfH9BjHidAdaU-akcUJfpwFE31tdw/exec',
  maxMobileWidth: 500,
  storageKeys: {
    city: 'family_budget_city',
    offlineQueue: 'kotik_offline_queue'
  },
  cityTags: { msk: 'Мск' },
  colors: {
    categories: ['#b9a9dc', '#9d8bc9', '#c9a3d4', '#a8b4e0', '#d4b3dd', '#8f9ad4', '#cbb8ea', '#e0b5cf'],
    income: '#7fbf9a',
    expenses: '#d49ab5'
  }
};

// Состояние
const state = {
  isSubmitting: false,
  city: '',
  charts: { category: null, monthly: null },
  allTransactions: [],
  visibleCount: 10,
  pendingUndoRow: null,
  undoTimeoutId: null
};

// DOM-элементы
const DOM = {
  form: document.getElementById('budgetForm'),
  submitBtn: document.getElementById('submitBtn'),
  buttonText: document.getElementById('buttonText'),
  spinner: document.getElementById('spinner'),
  toast: document.getElementById('toast'),
  dateInput: document.getElementById('date'),
  sumInput: document.getElementById('sum'),
  categoryInput: document.getElementById('category'),
  categoryGrid: document.getElementById('categoryGrid'),
  periodFilter: document.getElementById('periodFilter'),
  summaryIncome: document.getElementById('summaryIncome'),
  summaryExpenses: document.getElementById('summaryExpenses'),
  summaryBalance: document.getElementById('summaryBalance'),
  transactionsList: document.getElementById('transactionsList'),
  categoryEmpty: document.getElementById('categoryEmpty'),
  monthlyEmpty: document.getElementById('monthlyEmpty'),
  citySeg: document.getElementById('citySeg'),
  offlineBanner: document.getElementById('offlineBanner'),
  showMoreBtn: document.getElementById('showMoreBtn'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon')
};

// ================== ТЕМА ==================

function getEffectiveTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (DOM.themeIcon) DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initTheme() {
  // data-theme уже выставлен инлайн-скриптом — просто синхронизируем иконку
  applyTheme(getEffectiveTheme());

  DOM.themeToggle?.addEventListener('click', () => {
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('kotik_theme', next);
    applyTheme(next);
  });

  // Следим за системными изменениями, если пользователь не выбрал явно
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('kotik_theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
}

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

function handleMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  formWrapper.style.width = window.innerWidth < CONFIG.maxMobileWidth
    ? 'calc(100vw - 30px)'
    : '';
}

function showToast(message, type = 'success', duration = 3000) {
  clearTimeout(state.undoTimeoutId);
  state.pendingUndoRow = null;
  DOM.toast.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  DOM.toast.style.pointerEvents = 'none';
  setTimeout(() => DOM.toast.classList.remove('show'), duration);
}

function showUndoToast(rowNumber) {
  state.pendingUndoRow = rowNumber;
  clearTimeout(state.undoTimeoutId);

  DOM.toast.innerHTML = `<span class="toast-msg">Сохранено!</span><button type="button" class="toast-undo-btn">Отменить</button>`;
  DOM.toast.className = 'toast show success';
  DOM.toast.style.pointerEvents = 'auto';

  DOM.toast.querySelector('.toast-undo-btn')?.addEventListener('click', triggerUndo);

  state.undoTimeoutId = setTimeout(() => {
    DOM.toast.classList.remove('show');
    DOM.toast.style.pointerEvents = 'none';
    state.pendingUndoRow = null;
  }, 6000);
}

async function triggerUndo() {
  if (!state.pendingUndoRow) return;
  const row = state.pendingUndoRow;
  state.pendingUndoRow = null;
  clearTimeout(state.undoTimeoutId);
  DOM.toast.classList.remove('show');
  DOM.toast.style.pointerEvents = 'none';

  try {
    const fd = new FormData();
    fd.set('action', 'delete');
    fd.set('row', row);
    const resp = await fetchWithTimeout(CONFIG.scriptURL, { method: 'POST', body: fd });
    const result = await resp.json();
    if (result.status === 'success') {
      showToast('Запись удалена');
      setTimeout(updateAnalytics, 500);
    } else {
      showToast(result.message || 'Не удалось отменить', 'error');
    }
  } catch {
    showToast('Ошибка при отмене', 'error');
  }
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

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ================== ГОРОД ==================

function setCityTag(city) {
  state.city = city || '';
  try {
    if (state.city) localStorage.setItem(CONFIG.storageKeys.city, state.city);
    else localStorage.removeItem(CONFIG.storageKeys.city);
  } catch (_) {}

  DOM.citySeg?.querySelectorAll('.city-seg-btn').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.city || '') === state.city);
  });
}

function initCityToggle() {
  let saved = '';
  try { saved = localStorage.getItem(CONFIG.storageKeys.city) || ''; } catch (_) {}
  setCityTag(saved);

  DOM.citySeg?.addEventListener('click', e => {
    const btn = e.target.closest('.city-seg-btn');
    if (!btn) return;
    setCityTag(btn.dataset.city || '');
    if (navigator.vibrate) navigator.vibrate(10);
  });
}

// ================== КАТЕГОРИИ ==================

function initCategoryGrid() {
  if (!DOM.categoryGrid) return;

  DOM.categoryGrid.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;

    DOM.categoryGrid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (DOM.categoryInput) DOM.categoryInput.value = btn.dataset.value;

    if (navigator.vibrate) navigator.vibrate(10);
  });
}

function resetCategoryGrid() {
  DOM.categoryGrid?.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (DOM.categoryInput) DOM.categoryInput.value = '';
}

// ================== БЫСТРЫЕ СУММЫ ==================

function initQuickAmounts() {
  const container = document.querySelector('.quick-amounts');
  if (!container) return;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.quick-amt');
    if (!btn) return;
    if (DOM.sumInput) DOM.sumInput.value = btn.dataset.value;
    if (navigator.vibrate) navigator.vibrate(10);
  });
}

// ================== ОФЛАЙН-ОЧЕРЕДЬ ==================

function getOfflineQueue() {
  try { return JSON.parse(localStorage.getItem(CONFIG.storageKeys.offlineQueue) || '[]'); }
  catch { return []; }
}

function saveOfflineQueue(queue) {
  try { localStorage.setItem(CONFIG.storageKeys.offlineQueue, JSON.stringify(queue)); }
  catch {}
}

function updateOfflineBanner(mode) {
  const banner = DOM.offlineBanner;
  if (!banner) return;

  const queue = getOfflineQueue();
  const online = navigator.onLine;

  if (mode === 'syncing' || (online && queue.length > 0)) {
    const n = queue.length;
    banner.textContent = `🔄 Отправка ${n} ${n === 1 ? 'записи' : 'записей'}...`;
    banner.className = 'offline-banner syncing';
    return;
  }

  if (!online) {
    const n = queue.length;
    banner.textContent = n > 0
      ? `📵 Нет соединения · ${n} ${n === 1 ? 'запись' : 'записей'} в очереди`
      : '📵 Нет соединения — данные отправятся при восстановлении';
    banner.className = 'offline-banner offline';
    return;
  }

  banner.className = 'offline-banner hidden';
}

async function processOfflineQueue() {
  const queue = getOfflineQueue();
  if (!queue.length || !navigator.onLine) return;

  updateOfflineBanner('syncing');
  const failed = [];

  for (const item of queue) {
    try {
      const fd = new FormData();
      Object.entries(item.data).forEach(([k, v]) => fd.set(k, v));
      const resp = await fetchWithTimeout(CONFIG.scriptURL, { method: 'POST', body: fd });
      const result = await resp.json();
      if (result.status !== 'success') failed.push(item);
    } catch {
      failed.push(item);
      break; // вероятно всё ещё нет соединения
    }
  }

  saveOfflineQueue(failed);
  updateOfflineBanner();

  if (failed.length < queue.length) {
    setTimeout(updateAnalytics, 700);
    if (failed.length === 0) {
      const n = queue.length;
      showToast(`${n} ${n === 1 ? 'запись отправлена' : 'записей отправлено'}!`);
    }
  }
}

// ================== ЗАГРУЗКА ДАННЫХ ==================

async function fetchAnalyticsData(period = 'current_month') {
  const url = `${CONFIG.scriptURL}?period=${encodeURIComponent(period)}`;
  const response = await fetchWithTimeout(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// ================== ОТРИСОВКА ==================

function renderSummary(summary) {
  if (!summary) return;
  DOM.summaryIncome.textContent = formatMoney(summary.income || 0);
  DOM.summaryExpenses.textContent = formatMoney(summary.expenses || 0);
  const balance = summary.balance || 0;
  DOM.summaryBalance.textContent = formatMoney(balance);
  DOM.summaryBalance.parentElement.classList.toggle('negative', balance < 0);
}

async function deleteTransaction(rowNum) {
  const idx = state.allTransactions.findIndex(t => t.rowNum === rowNum);
  if (idx === -1) return;

  // Оптимистично убираем из списка
  const removed = state.allTransactions.splice(idx, 1)[0];
  renderVisibleTransactions();

  try {
    const fd = new FormData();
    fd.set('action', 'delete');
    fd.set('row', rowNum);
    const resp = await fetchWithTimeout(CONFIG.scriptURL, { method: 'POST', body: fd });
    const result = await resp.json();
    if (result.status !== 'success') throw new Error(result.message);
    showToast('Запись удалена');
  } catch {
    // Восстанавливаем при ошибке
    state.allTransactions.splice(idx, 0, removed);
    renderVisibleTransactions();
    showToast('Не удалось удалить', 'error');
  }
}

function renderVisibleTransactions() {
  const visible = state.allTransactions.slice(0, state.visibleCount);

  if (visible.length === 0) {
    DOM.transactionsList.innerHTML = '<p class="no-data">Операций за выбранный период нет</p>';
  } else {
    DOM.transactionsList.innerHTML = visible.map(t => {
      const isIncome = t.type === 'Доход';
      const cityBadge = t.city ? `<span class="city-badge">${escapeHtml(t.city)}</span>` : '';
      const desc = t.description ? `<div class="tr-desc">${escapeHtml(t.description)}</div>` : '';
      const controls = t.rowNum ? `
        <button type="button" class="tr-delete" title="Удалить">×</button>
        <div class="tr-confirm hidden">
          <span class="tr-confirm-label">Удалить?</span>
          <button type="button" class="tr-confirm-yes">Да</button>
          <button type="button" class="tr-confirm-no">Нет</button>
        </div>` : '';
      return `
        <div class="transaction-row ${isIncome ? 'income' : 'expense'}" data-rownum="${t.rowNum || ''}">
          <div class="tr-left">
            <div class="tr-category">${cityBadge}${escapeHtml(t.category || '—')}</div>
            ${desc}
          </div>
          <div class="tr-right">
            <div class="tr-amount">${isIncome ? '+' : '−'}${formatMoney(t.amount)}</div>
            <div class="tr-date">${escapeHtml(t.date)}</div>
          </div>
          ${controls}
        </div>`;
    }).join('');
  }

  if (DOM.showMoreBtn) {
    const remaining = state.allTransactions.length - state.visibleCount;
    if (remaining > 0) {
      DOM.showMoreBtn.classList.remove('hidden');
      DOM.showMoreBtn.textContent = `Показать ещё (${Math.min(10, remaining)})`;
    } else {
      DOM.showMoreBtn.classList.add('hidden');
    }
  }
}

function renderTransactions(transactions) {
  state.allTransactions = transactions || [];
  state.visibleCount = 10;
  renderVisibleTransactions();
}

function renderCharts(data) {
  // ---- Круговой: расходы по категориям ----
  const catLabels = data.categories?.labels ?? [];
  const catValues = data.categories?.values ?? [];

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
          datasets: [{ data: catValues, backgroundColor: CONFIG.colors.categories, borderWidth: 1 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatMoney(ctx.raw)}` } }
          }
        }
      }
    );
  }

  // ---- Столбчатый: доходы и расходы по месяцам ----
  const monthLabels = data.monthly?.labels ?? [];

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
            { label: 'Доходы', data: data.monthly.income, backgroundColor: CONFIG.colors.income, borderRadius: 6 },
            { label: 'Расходы', data: data.monthly.expenses, backgroundColor: CONFIG.colors.expenses, borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { callback: val => formatMoney(val) } } },
          plugins: { tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } } }
        }
      }
    );
  }
}

// ================== ОБНОВЛЕНИЕ АНАЛИТИКИ ==================

async function updateAnalytics() {
  const period = DOM.periodFilter?.value ?? 'current_month';

  DOM.transactionsList.innerHTML = '<p class="loading-text">Загрузка...</p>';
  if (DOM.showMoreBtn) DOM.showMoreBtn.classList.add('hidden');
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
    const msg = error?.name === 'AbortError'
      ? 'Превышено время ожидания. Проверьте сеть.'
      : 'Не удалось загрузить данные. Проверьте подключение.';
    DOM.transactionsList.innerHTML = `<p class="no-data">${msg}</p>`;
    DOM.summaryIncome.textContent = '—';
    DOM.summaryExpenses.textContent = '—';
    DOM.summaryBalance.textContent = '—';
    showToast('Не удалось загрузить аналитику', 'error');
  }
}

// ================== ОТПРАВКА ФОРМЫ ==================

async function handleFormSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  const formData = new FormData(DOM.form);

  // Валидация категории
  const category = formData.get('category') || '';
  if (!category) {
    showToast('Выберите категорию', 'error');
    return;
  }

  // Авто-тип по категории
  formData.set('type', category === '💰 Доход' ? 'Доход' : 'Расход');

  // Нормализация суммы: запятая → точка, убираем пробелы
  const rawSum = String(formData.get('sum') || '').replace(/\s/g, '').replace(',', '.');
  const parsedSum = parseFloat(rawSum);
  if (!rawSum || isNaN(parsedSum) || parsedSum <= 0) {
    showToast('Введите корректную сумму', 'error');
    return;
  }
  formData.set('sum', parsedSum);

  if (state.city) formData.set('city', state.city);

  // Офлайн: складываем в очередь
  if (!navigator.onLine) {
    const entries = {};
    for (const [k, v] of formData.entries()) entries[k] = v;
    const queue = getOfflineQueue();
    queue.push({ data: entries, queuedAt: Date.now() });
    saveOfflineQueue(queue);
    updateOfflineBanner();
    showToast('Сохранено в очереди — отправится при соединении');
    DOM.form.reset();
    resetCategoryGrid();
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
    return;
  }

  state.isSubmitting = true;
  DOM.submitBtn.disabled = true;
  DOM.buttonText.textContent = 'Сохранение...';
  DOM.spinner.classList.remove('hidden');

  try {
    const response = await fetchWithTimeout(CONFIG.scriptURL, { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Ошибка сохранения');

    if (result.row) {
      showUndoToast(result.row);
    } else {
      showToast('Данные успешно сохранены!');
    }

    DOM.form.reset();
    resetCategoryGrid();
    DOM.dateInput.value = new Date().toISOString().split('T')[0];
    setTimeout(updateAnalytics, 700);

  } catch (error) {
    console.error('Ошибка отправки:', error);
    const msg = error?.name === 'AbortError'
      ? 'Превышено время ожидания. Проверьте сеть.'
      : (error.message || 'Ошибка сохранения');
    showToast(msg, 'error');
  } finally {
    DOM.submitBtn.disabled = false;
    DOM.buttonText.textContent = 'Сохранить';
    DOM.spinner.classList.add('hidden');
    state.isSubmitting = false;
  }
}

function cancelAllConfirms() {
  DOM.transactionsList.querySelectorAll('.transaction-row').forEach(row => {
    row.querySelector('.tr-delete')?.classList.remove('hidden');
    row.querySelector('.tr-confirm')?.classList.add('hidden');
  });
}

// ================== ИНИЦИАЛИЗАЦИЯ ==================

function initApp() {
  initTheme();

  DOM.dateInput.value = new Date().toISOString().split('T')[0];

  initCityToggle();
  initCategoryGrid();
  initQuickAmounts();

  DOM.form.addEventListener('submit', handleFormSubmit);
  window.addEventListener('resize', handleMobileLayout);
  document.addEventListener('gesturestart', e => e.preventDefault());

  if (DOM.periodFilter) DOM.periodFilter.addEventListener('change', updateAnalytics);

  if (DOM.showMoreBtn) {
    DOM.showMoreBtn.addEventListener('click', () => {
      state.visibleCount += 10;
      renderVisibleTransactions();
    });
  }

  // Делегированное удаление с подтверждением
  DOM.transactionsList.addEventListener('click', e => {
    if (e.target.closest('.tr-delete')) {
      const row = e.target.closest('.transaction-row');
      cancelAllConfirms();
      row.querySelector('.tr-delete').classList.add('hidden');
      row.querySelector('.tr-confirm').classList.remove('hidden');
      return;
    }
    if (e.target.closest('.tr-confirm-yes')) {
      const row = e.target.closest('.transaction-row');
      const rowNum = parseInt(row.dataset.rownum);
      if (rowNum) deleteTransaction(rowNum);
      return;
    }
    if (e.target.closest('.tr-confirm-no')) {
      cancelAllConfirms();
    }
  });

  // Отмена подтверждения при клике вне списка
  document.addEventListener('click', e => {
    if (!e.target.closest('#transactionsList')) cancelAllConfirms();
  });

  window.addEventListener('online', () => {
    updateOfflineBanner();
    processOfflineQueue();
  });
  window.addEventListener('offline', () => updateOfflineBanner());

  updateOfflineBanner();
  handleMobileLayout();
  updateAnalytics();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', initApp);
window.updateAnalytics = updateAnalytics;
