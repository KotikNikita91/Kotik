document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('budgetForm');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    const toast = document.getElementById('toast');
    
    // Установка текущей даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // URL вашего Google Apps Script (замените на ваш)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbySRyS0GrVAZPVzX767GzR9Im91TkpPlZSS_ev1HkRs4yxUcSF9OEbObhv5BXZVIHIepg/exec';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Показать спиннер загрузки
        submitBtn.disabled = true;
        buttonText.textContent = 'Сохранение...';
        spinner.classList.remove('hidden');
        
        try {
            const formData = new FormData(form);
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
            showToast('Данные успешно сохранены!', 'success');
            
            // Сбросить форму
            form.reset();
            // Вернуть текущую дату
            document.getElementById('date').value = today;
            
        } catch (error) {
            console.error('Ошибка!', error);
            showToast(`Ошибка при сохранении: ${error.message}`, 'error');
        } finally {
            // Скрыть спиннер загрузки
            submitBtn.disabled = false;
            buttonText.textContent = 'Сохранить';
            spinner.classList.add('hidden');
        }
    });
    
    function showToast(message, type) {
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
