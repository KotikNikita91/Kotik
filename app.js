// Конфигурация приложения
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  analyticsURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec?action=getAnalytics',
  maxMobileWidth: 500,
  colors: {
    categories: ['#9bc4b2', '#7daf95', '#6a8f7e', '#b8d5c5', '#88c9a1', '#a8d7b9'],
    income: '#7daf95',
    expenses: '#e1a692'
  }
};

// Состояние приложения
const state = {
  isSubmitting: false,
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
  dateInput: document.getElementById('date')
};

// ================== ОСНОВНЫЕ ФУНКЦИИ ================== //

/**
 * Оптимизация отображения на мобильных устройствах
 */
function handleMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  
  formWrapper.style.width = window.innerWidth < CONFIG.maxMobileWidth 
    ? 'calc(100vw - 30px)' 
    : '';
}

/**
 * Показ уведомлений
 */
function showToast(message, type = 'success') {
  DOM.toast.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

/**
 * Загрузка данных аналитики
 */
async function fetchAnalyticsData() {
  try {
    const response = await fetch(CONFIG.analyticsURL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    throw error;
  }
}

/**
 * Отрисовка графиков
 */
function renderCharts(data) {
  try {
    // Уничтожаем старые графики
    if (state.charts.category) state.charts.category.destroy();
    if (state.charts.monthly) state.charts.monthly.destroy();

    // 1. Круговой график категорий
    state.charts.category = new Chart(
      document.getElementById('categoryChart').getContext('2d'),
      {
        type: 'doughnut',
        data: {
          labels: data.data.categories.labels,
          datasets: [{
            data: data.data.categories.values,
            backgroundColor: CONFIG.colors.categories,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      }
    );

    // 2. Столбчатый график по месяцам
    state.charts.monthly = new Chart(
      document.getElementById('monthlyChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: data.data.monthly.labels,
          datasets: [
            {
              label: 'Доходы',
              data: data.data.monthly.income,
              backgroundColor: CONFIG.colors.income,
              borderRadius: 6
            },
            {
              label: 'Расходы',
              data: data.data.monthly.expenses,
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
              beginAtZero: true
            }
          }
        }
      }
    );

  } catch (error) {
    console.error('Ошибка отрисовки графиков:', error);
    showToast('Ошибка обновления графиков', 'error');
  }
}

/**
 * Обновление аналитических данных
 */
async function updateAnalytics() {
  try {
    const data = await fetchAnalyticsData();
    renderCharts(data);
  } catch (error) {
    showToast('Не удалось загрузить аналитику', 'error');
  }
}

/**
 * Обработка отправки формы
 */
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
    
    showToast('Данные успешно сохранены!');
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

// ================== ИНИЦИАЛИЗАЦИЯ ================== //

/**
 * Инициализация приложения
 */
function initApp() {
  // Установка текущей даты
  DOM.dateInput.value = new Date().toISOString().split('T')[0];

  // Настройка обработчиков событий
  DOM.form.addEventListener('submit', handleFormSubmit);
  window.addEventListener('resize', handleMobileLayout);
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Первичная настройка
  handleMobileLayout();
  updateAnalytics();
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);

// Экспорт функций для глобального доступа (если нужно)
window.updateAnalytics = updateAnalytics;
window.renderCharts = renderCharts;
