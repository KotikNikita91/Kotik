// Конфигурация приложения
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  analyticsURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec?action=getAnalytics',
  maxMobileWidth: 500
};

// DOM элементы
const DOM = {
  form: document.getElementById('budgetForm'),
  submitBtn: document.getElementById('submitBtn'),
  buttonText: document.getElementById('buttonText'),
  spinner: document.getElementById('spinner'),
  toast: document.getElementById('toast'),
  dateInput: document.getElementById('date')
};

// Состояние приложения
const state = {
  isSubmitting: false
};

// Функция для фиксации мобильного лейаута
function handleMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  
  const isMobile = window.innerWidth < CONFIG.maxMobileWidth;
  formWrapper.style.width = isMobile ? 'calc(100vw - 30px)' : '';
}

// Показать уведомление
function showToast(message, type = 'success') {
  const { toast } = DOM;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Загрузка данных аналитики
async function fetchAnalyticsData() {
  try {
    const response = await fetch(CONFIG.analyticsURL);
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(data.message || 'Неверный формат данных');
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    throw error;
  }
}

// Обновление аналитики
async function updateAnalytics() {
  try {
    const data = await fetchAnalyticsData();
    
    // Проверяем, есть ли функция для обновления графиков
    if (typeof window.renderCharts === 'function') {
      window.renderCharts(data);
    }
  } catch (error) {
    showToast('Не удалось обновить аналитику', 'error');
  }
}

// Обработка отправки формы
async function handleFormSubmit(event) {
  event.preventDefault();
  
  if (state.isSubmitting) return;
  state.isSubmitting = true;
  
  const { form, submitBtn, buttonText, spinner } = DOM;
  
  // Показать состояние загрузки
  submitBtn.disabled = true;
  buttonText.textContent = 'Сохранение...';
  spinner.classList.remove('hidden');

  try {
    const formData = new FormData(form);
    const response = await fetch(CONFIG.scriptURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }
    
    showToast('Данные успешно сохранены!');
    form.reset();
    
    // Обновить дату на текущую после отправки
    const today = new Date().toISOString().split('T')[0];
    DOM.dateInput.value = today;
    
    // Обновить аналитику с задержкой
    setTimeout(updateAnalytics, 1500);
    
  } catch (error) {
    console.error('Ошибка отправки формы:', error);
    showToast(error.message || 'Ошибка сохранения', 'error');
  } finally {
    submitBtn.disabled = false;
    buttonText.textContent = 'Сохранить';
    spinner.classList.add('hidden');
    state.isSubmitting = false;
  }
}

// Инициализация приложения
function initializeApp() {
  // Установка текущей даты по умолчанию
  const today = new Date().toISOString().split('T')[0];
  DOM.dateInput.value = today;
  
  // Обработчики событий
  DOM.form.addEventListener('submit', handleFormSubmit);
  window.addEventListener('resize', handleMobileLayout);
  
  // Запрет масштабирования на iOS
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  
  // Первичная настройка лейаута
  handleMobileLayout();
  
  // Первая загрузка аналитики
  updateAnalytics();
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', initializeApp);
