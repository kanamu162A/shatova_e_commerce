  // ===============================
  // COMPLETE REGISTER SCRIPT - NO MODULES NEEDED
  // ===============================
  
  (function() {
    // API Configuration - CHANGE THIS TO YOUR BACKEND URL
    const API_BASE_URL = "https://nearbuy-e-commerce.onrender.com";
    
    // DOM Elements
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPhone = document.getElementById('registerPhone');
    const registerPassword = document.getElementById('registerPassword');
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    const registerBtn = document.getElementById('registerBtn');
    const registerMessage = document.getElementById('registerMessage');
    const googleBtn = document.getElementById('googleRegisterBtn');
    const facebookBtn = document.getElementById('facebookRegisterBtn');

    // Helper: Show message
    function showMessage(message, isSuccess = false) {
      if (!registerMessage) return;
      registerMessage.textContent = message;
      registerMessage.className = `message-toast ${isSuccess ? 'success-message' : 'error-message'}`;
      registerMessage.style.display = 'block';
      setTimeout(() => {
        if (registerMessage.textContent === message) {
          registerMessage.style.display = 'none';
        }
      }, 4000);
    }

    // Helper: Set button loading
    function setButtonLoading(button, isLoading, loadingText = 'Creating Account...') {
      if (!button) return;
      if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
      } else {
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = `Create Account <i class="fas fa-arrow-right"></i>`;
      }
    }

    // Helper: Set field status
    function setFieldStatus(input, isValid, errorMessage = '') {
      if (!input) return;
      const parent = input.parentElement;
      const existingIcon = parent.querySelector('.field-status-icon');
      const existingError = parent.querySelector('.field-error');
      if (existingIcon) existingIcon.remove();
      if (existingError) existingError.remove();
      
      input.style.borderColor = '';
      input.style.backgroundColor = '';
      
      if (!input.value || input.value.trim() === '') return;
      
      input.style.borderColor = isValid ? '#10b981' : '#ef4444';
      input.style.backgroundColor = isValid ? '#f0fdf4' : '#fef2f2';
      
      const icon = document.createElement('i');
      icon.className = `field-status-icon ${isValid ? 'fas fa-check-circle valid-icon' : 'fas fa-exclamation-circle error-icon'}`;
      parent.appendChild(icon);
      
      if (!isValid && errorMessage) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'field-error';
        errorSpan.textContent = errorMessage;
        parent.appendChild(errorSpan);
      }
    }

    // Validators
    function validateName() {
      const name = registerName?.value.trim() || '';
      if (name === '') return false;
      const isValid = name.length >= 2 && /^[a-zA-Z\s\-']+$/.test(name);
      setFieldStatus(registerName, isValid, isValid ? '' : 'Name must be at least 2 characters');
      return isValid;
    }

    function validateEmail() {
      const email = registerEmail?.value.trim() || '';
      if (email === '') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);
      setFieldStatus(registerEmail, isValid, isValid ? '' : 'Enter a valid email address');
      return isValid;
    }

    function validatePhone() {
      const phone = registerPhone?.value.trim() || '';
      if (phone === '') return false;
      const isValid = phone.length >= 6 && /^[0-9+\-\s()]+$/.test(phone);
      setFieldStatus(registerPhone, isValid, isValid ? '' : 'Enter a valid phone number (min 6 digits)');
      return isValid;
    }

    function validatePassword() {
      const password = registerPassword?.value || '';
      if (password === '') return false;
      const isValid = password.length >= 6;
      setFieldStatus(registerPassword, isValid, isValid ? '' : 'Password must be at least 6 characters');
      if (registerConfirmPassword?.value) validateConfirmPassword();
      return isValid;
    }

    function validateConfirmPassword() {
      const password = registerPassword?.value || '';
      const confirm = registerConfirmPassword?.value || '';
      if (confirm === '') return false;
      const isValid = password === confirm && password.length > 0;
      setFieldStatus(registerConfirmPassword, isValid, isValid ? '' : 'Passwords do not match');
      return isValid;
    }

    function validateAll() {
      return validateName() && validateEmail() && validatePhone() && validatePassword() && validateConfirmPassword();
    }

    // Setup real-time validation
    function setupValidation() {
      registerName?.addEventListener('input', validateName);
      registerName?.addEventListener('blur', validateName);
      registerEmail?.addEventListener('input', validateEmail);
      registerEmail?.addEventListener('blur', validateEmail);
      registerPhone?.addEventListener('input', validatePhone);
      registerPhone?.addEventListener('blur', validatePhone);
      registerPassword?.addEventListener('input', validatePassword);
      registerPassword?.addEventListener('blur', validatePassword);
      registerConfirmPassword?.addEventListener('input', validateConfirmPassword);
      registerConfirmPassword?.addEventListener('blur', validateConfirmPassword);
    }

    // Password toggle
    function setupPasswordToggle() {
      const passwordFields = [registerPassword, registerConfirmPassword];
      passwordFields.forEach(field => {
        if (!field) return;
        const toggle = document.createElement('i');
        toggle.className = 'fas fa-eye-slash password-toggle';
        toggle.addEventListener('click', () => {
          const type = field.type === 'password' ? 'text' : 'password';
          field.type = type;
          toggle.className = type === 'password' ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
        field.parentElement.appendChild(toggle);
      });
    }

    // Handle registration - ACTUAL API CALL
    async function handleRegister() {
      const name = registerName?.value.trim() || '';
      const email = registerEmail?.value.trim() || '';
      const phone = registerPhone?.value.trim() || '';
      const password = registerPassword?.value || '';
      const confirmPassword = registerConfirmPassword?.value || '';

      if (!name || !email || !phone || !password || !confirmPassword) {
        showMessage('Please fill in all fields');
        return;
      }
      
      if (!validateAll()) {
        showMessage('Please fix the errors above');
        return;
      }

      setButtonLoading(registerBtn, true);

      try {
        const requestData = { name, email: email.toLowerCase(), phone, password };
        console.log('📤 Sending to:', `${API_BASE_URL}/api/shatova/v1/auth/register`);
        console.log('📤 Data:', { ...requestData, password: '***' });
        
        const response = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(requestData),
        });

        const data = await response.json();
        console.log('📥 Response:', data);

        if (response.ok && data.success) {
          showMessage(data.message || '✓ Account created successfully!', true);
          
          // Clear form
          registerName.value = '';
          registerEmail.value = '';
          registerPhone.value = '';
          registerPassword.value = '';
          registerConfirmPassword.value = '';
          
          // Clear validation styles
          [registerName, registerEmail, registerPhone, registerPassword, registerConfirmPassword].forEach(field => {
            if (field) {
              field.style.borderColor = '';
              field.style.backgroundColor = '';
              field.parentElement.querySelectorAll('.field-status-icon, .field-error').forEach(el => el.remove());
            }
          });
          
          setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
          showMessage(data.message || 'Registration failed. Please try again.');
          setButtonLoading(registerBtn, false);
        }
      } catch (error) {
        console.error('❌ Error:', error);
        let errorMsg = 'Network error. Please check your connection.';
        if (error.message === 'Failed to fetch') {
          errorMsg = `Cannot connect to server at ${API_BASE_URL}. Make sure backend is running.`;
        }
        showMessage(errorMsg);
        setButtonLoading(registerBtn, false);
      }
    }

    function handleSocial(provider) {
      showMessage(`${provider} registration coming soon!`);
    }

    // Event listeners
    registerBtn?.addEventListener('click', handleRegister);
    googleBtn?.addEventListener('click', () => handleSocial('Google'));
    facebookBtn?.addEventListener('click', () => handleSocial('Facebook'));
    
    // Enter key support
    [registerName, registerEmail, registerPhone, registerPassword, registerConfirmPassword].forEach(input => {
      input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleRegister(); });
    });
    
    // Initialize
    setupValidation();
    setupPasswordToggle();
    registerName?.focus();
    
    console.log('✅ Registration page loaded. API URL:', API_BASE_URL);
  })();
