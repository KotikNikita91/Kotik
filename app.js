// Инициализация прозрачности для плавного появления
document.body.style.opacity = '0';

// Фиксация ширины для мобильных устройств
function fixMobileLayout() {
  const formWrapper = document.querySelector('.form-wrapper');
  const viewportWidth = window.innerWidth;
  
  if (viewportWidth < 500) {
    formWrapper.style.width = 'calc(100vw - 30px)';
  } else {
    formWrapper.style.width = '';
  }
}

// Запрет масштабирования на iOS
function preventZoom() {
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
  fixMobileLayout();
  preventZoom();
  window.addEventListener('resize', fixMobileLayout);
  
  // Установка текущей даты
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
});

    
    const form = document.getElementById('budgetForm');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    const toast = document.getElementById('toast');
    
    // Установка текущей даты по умолчанию
    const today = new Date().toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('.').reverse().join('-');
    document.getElementById('date').value = today;
    
    // URL вашего Google Apps Script (ЗАМЕНИТЕ на ваш реальный ID!)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxF4DtXNNpib9q6jBKbIu3See4I_wSkuzUJLcxpD5QCtWZe6FmanIva1Xq_HDIc1rWG5Q/exec';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Показать спиннер загрузки
        submitBtn.disabled = true;
        buttonText.textContent = 'Сохранение...';
        spinner.classList.remove('hidden');
        
        // Анимация нажатия кнопки
        submitBtn.style.transform = 'translateY(2px)';
        submitBtn.style.boxShadow = '0 2px 10px rgba(46, 204, 113, 0.3)';
        
        try {
            const formData = new FormData(form);
            
            // Добавляем проверочный ключ (опционально)
            // formData.append('key', 'YOUR_SECRET_KEY');
            
            const response = await fetch(scriptURL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const result = await response.text();
            console.log('Успех!', result);
            
            // Показать уведомление об успехе
            showToast('✅ Данные успешно сохранены!', 'success');
            
            // Сбросить форму
            form.reset();
            // Вернуть текущую дату
            document.getElementById('date').value = today;
            
            // Анимация успешного сохранения
            submitBtn.style.background = 'linear-gradient(to right, #2ecc71, #27ae60)';
            setTimeout(() => {
                submitBtn.style.transform = 'translateY(-2px)';
                submitBtn.style.boxShadow = '0 6px 20px rgba(46, 204, 113, 0.4)';
            }, 300);
            
        } catch (error) {
            console.error('Ошибка!', error);
            showToast(`❌ Ошибка при сохранении: ${error.message}`, 'error');
            
            // Анимация ошибки
            submitBtn.style.background = 'linear-gradient(to right, #e74c3c, #c0392b)';
            setTimeout(() => {
                submitBtn.style.background = 'linear-gradient(to right, #2ecc71, #27ae60)';
            }, 1000);
            
        } finally {
            // Скрыть спиннер загрузки
            submitBtn.disabled = false;
            buttonText.textContent = 'Сохранить';
            spinner.classList.add('hidden');
        }
    });
    
    // Функция показа toast-уведомлений
    function showToast(message, type) {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        // Скрыть уведомление через 3 секунды
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Дополнительная анимация при фокусе на полях ввода
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.querySelector('label').style.color = '#27ae60';
            this.parentNode.style.transform = 'scale(1.01)';
        });
        
        input.addEventListener('blur', function() {
            this.parentNode.querySelector('label').style.color = '#2c3e50';
            this.parentNode.style.transform = 'scale(1)';
        });
    });
});

// Небольшая анимация при загрузке страницы
window.addEventListener('load', function() {
    const container = document.querySelector('.container');
    container.style.animation = 'fadeInUp 0.6s ease-out';
});

// Добавляем CSS анимации динамически
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// Добавьте в app.js для iPhone
if (navigator.standalone) {
    document.body.classList.add('ios-standalone');
}
