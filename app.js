// Конфигурация
const CONFIG = {
  scriptURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec',
  analyticsURL: 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec?action=getAnalytics'
};

// Главные элементы
const form = document.getElementById('budgetForm');
const submitBtn = document.getElementById('submitBtn');
const buttonText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');
const toast = document.getElementById('toast');

// Фиксация мобильного лейаута
function fixMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;
  
  formWrapper.style.width = window.innerWidth < 500 
    ? 'calc(100vw - 30px)' 
    : '';
}

// Показать уведомление
function showToast(message, type) {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Загрузить данные для аналитики
async function loadAnalyticsData() {
  try {
    const response = await fetch(CONFIG.analyticsURL);
    if (!response.ok) throw new Error('Ошибка загрузки данных');
    return await response.json();
  } catch (error) {
    console.error('Analytics error:', error);
    throw error;
  }
}

// Обработчик отправки формы
async function handleFormSubmit(e) {
  e.preventDefault();
  
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    showToast('Данные успешно сохранены!', 'success');
    form.reset();
    
    // Обновить аналитику после сохранения
    setTimeout(loadAnalyticsData, 1000);
    
  } catch (error) {
    console.error('Form submit error:', error);
    showToast(`Ошибка: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    buttonText.textContent = 'Сохранить';
    spinner.classList.add('hidden');
  }
}

// Инициализация
function initApp() {
  // Фикс лейаута
  fixMobileLayout();
  window.addEventListener('resize', fixMobileLayout);
  
  // Запрет масштабирования на iOS
  document.addEventListener('gesturestart', e => e.preventDefault());
  
  // Установка текущей даты
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  
  // Обработчики
  form.addEventListener('submit', handleFormSubmit);
  
  // Первая загрузка аналитики
  loadAnalyticsData().catch(e => console.error('Initial analytics load failed:', e));
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
