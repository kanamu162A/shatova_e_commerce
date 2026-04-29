(function() {
    // ========== SOCIAL AUTH CONFIGURATION ==========
    async function handleSocialAuth(provider) {
      const signinMsgDiv = document.getElementById('signinMessage');
      if (!signinMsgDiv) return;
      const googleBtn = document.getElementById('googleSigninBtn');
      const facebookBtn = document.getElementById('facebookSigninBtn');
      const activeBtn = provider === 'Google' ? googleBtn : facebookBtn;
      
      setButtonLoading(activeBtn, true, `Loading...`);
      
      setTimeout(() => {
        setButtonLoading(activeBtn, false);
        showMessage(signinMsgDiv, `✨ ${provider} Sign-in is coming soon! Stay tuned for updates.`, false);
      }, 1000);
    }
    
    // ========== API CONFIGURATION ==========
    const API_BASE_URL = "https://nearbuy-e-commerce.onrender.com";
    const OTP_EXPIRY_SECONDS = 300; // Changed to 5 minutes (300 seconds)
    
    // ========== DOM ELEMENTS ==========
    const loginForm = document.getElementById('loginForm');
    const otpForm = document.getElementById('otpForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const resetOtpForm = document.getElementById('resetOtpForm');
    const setNewPasswordForm = document.getElementById('setNewPasswordForm');
    
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const signinBtn = document.getElementById('signinBtn');
    const signinMessage = document.getElementById('signinMessage');
    
    const loginOtpInputs = ['otp0', 'otp1', 'otp2', 'otp3', 'otp4', 'otp5'].map(id => document.getElementById(id));
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const resendOtpBtn = document.getElementById('resendOtpBtn');
    const backBtn = document.getElementById('backBtn');
    const otpMessage = document.getElementById('otpMessage');
    const otpTimerDisplay = document.getElementById('otpTimerDisplay');
    
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const resetEmail = document.getElementById('resetEmail');
    const sendResetOtpBtn = document.getElementById('sendResetOtpBtn');
    const resetMessage = document.getElementById('resetMessage');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    
    const resetOtpInputs = ['resetOtp0', 'resetOtp1', 'resetOtp2', 'resetOtp3', 'resetOtp4', 'resetOtp5'].map(id => document.getElementById(id));
    const verifyResetOtpBtn = document.getElementById('verifyResetOtpBtn');
    const resendResetOtpBtn = document.getElementById('resendResetOtpBtn');
    const backToForgotBtn = document.getElementById('backToForgotBtn');
    const resetOtpMessage = document.getElementById('resetOtpMessage');
    const resetTimerDisplay = document.getElementById('resetTimerDisplay');
    
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const setNewPasswordBtn = document.getElementById('setNewPasswordBtn');
    const setPasswordMessage = document.getElementById('setPasswordMessage');
    const backToLoginFromSetBtn = document.getElementById('backToLoginFromSetBtn');
    
    const googleBtn = document.getElementById('googleSigninBtn');
    const facebookBtn = document.getElementById('facebookSigninBtn');
    
    // ========== STATE MANAGEMENT ==========
    let currentUserId = null;
    let currentEmail = null;
    let resetUserId = null;
    let verifiedResetOtp = null;
    let loginTimerInterval = null;
    let resetTimerInterval = null;
    let loginExpiryTime = null;
    let resetExpiryTime = null;
    
    // ========== HELPER FUNCTIONS ==========
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function stopTimer(type) {
      if (type === 'login' && loginTimerInterval) { 
        clearInterval(loginTimerInterval); 
        loginTimerInterval = null; 
      }
      if (type === 'reset' && resetTimerInterval) { 
        clearInterval(resetTimerInterval); 
        resetTimerInterval = null; 
      }
    }
    
    function startCountdown(displayElement, onExpire, type, initialSeconds = OTP_EXPIRY_SECONDS) {
      if (!displayElement) return null;
      let remaining = initialSeconds;
      displayElement.innerHTML = `⏱️ ${formatTime(remaining)}`;
      displayElement.classList.remove('expired');
      
      const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
          displayElement.innerHTML = `⏱️ Expired!`;
          displayElement.classList.add('expired');
          if (onExpire) onExpire();
          if (type === 'login') { 
            loginTimerInterval = null; 
            if(resendOtpBtn) resendOtpBtn.classList.remove('disabled'); 
          }
          if (type === 'reset') { 
            resetTimerInterval = null; 
            if(resendResetOtpBtn) resendResetOtpBtn.classList.remove('disabled'); 
          }
        } else { 
          displayElement.innerHTML = `⏱️ ${formatTime(remaining)}`; 
        }
      }, 1000);
      return interval;
    }
    
    function resetLoginTimer(expirySeconds = OTP_EXPIRY_SECONDS) { 
      if(loginTimerInterval) stopTimer('login'); 
      if(resendOtpBtn) resendOtpBtn.classList.add('disabled'); 
      loginTimerInterval = startCountdown(otpTimerDisplay, () => showMessage(otpMessage, '⚠️ OTP expired. Request new code.', false), 'login', expirySeconds); 
    }
    
    function resetResetTimer(expirySeconds = OTP_EXPIRY_SECONDS) { 
      if(resetTimerInterval) stopTimer('reset'); 
      if(resendResetOtpBtn) resendResetOtpBtn.classList.add('disabled'); 
      resetTimerInterval = startCountdown(resetTimerDisplay, () => showMessage(resetOtpMessage, '⚠️ Reset OTP expired.', false), 'reset', expirySeconds); 
    }
    
    function checkPasswordStrength(password) {
      const reqs = { 
        length: { regex: /.{8,}/, element: 'lengthReq' }, 
        uppercase: { regex: /[A-Z]/, element: 'upperReq' }, 
        lowercase: { regex: /[a-z]/, element: 'lowerReq' }, 
        number: { regex: /[0-9]/, element: 'numberReq' }, 
        special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: 'specialReq' } 
      };
      let strength = 0;
      for (const [key, req] of Object.entries(reqs)) {
        const isValid = req.regex.test(password);
        const elem = document.getElementById(req.element);
        const span = elem.querySelector('span');
        if (isValid) { 
          elem.classList.add('valid'); 
          elem.classList.remove('invalid'); 
          span.innerHTML = '✅'; 
          strength++; 
        } else { 
          elem.classList.add('invalid'); 
          elem.classList.remove('valid'); 
          span.innerHTML = '❌'; 
        }
      }
      const bar = document.getElementById('strengthBar'); 
      const txt = document.getElementById('strengthText'); 
      const percent = (strength / 5) * 100;
      bar.style.width = percent + '%';
      bar.style.background = strength <= 2 ? '#EF4444' : strength <= 4 ? '#F59E0B' : '#10B981';
      txt.textContent = strength === 0 ? 'Enter a password' : strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong!';
      return strength === 5;
    }
    
    window.togglePasswordVisibility = function(inputId, element) { 
      const inp = document.getElementById(inputId); 
      if (inp.type === 'password') { 
        inp.type = 'text'; 
        element.classList.remove('fa-eye'); 
        element.classList.add('fa-eye-slash'); 
      } else { 
        inp.type = 'password'; 
        element.classList.remove('fa-eye-slash'); 
        element.classList.add('fa-eye'); 
      } 
    };
    
    function showMessage(element, message, isSuccess = false) { 
      if (!element) return; 
      element.textContent = message; 
      element.className = `message-toast ${isSuccess ? 'success-message' : 'error-message'}`; 
      element.style.display = 'block'; 
      setTimeout(() => { 
        if (element.textContent === message) element.style.display = 'none'; 
      }, 4000); 
    }
    
    function setButtonLoading(button, isLoading, loadingText = 'Processing...') { 
      if (!button) return; 
      if (isLoading) { 
        button.disabled = true; 
        button.classList.add('loading'); 
        const orig = button.innerHTML; 
        button.setAttribute('data-original-html', orig); 
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`; 
      } else { 
        button.disabled = false; 
        button.classList.remove('loading'); 
        const orig = button.getAttribute('data-original-html'); 
        if (orig) button.innerHTML = orig; 
      } 
    }
    
    function setupOtpNavigation(inputs, callback) { 
      inputs.forEach((input, idx) => { 
        if(!input) return; 
        input.addEventListener('input', (e) => { 
          let val = e.target.value.replace(/\D/g, ''); 
          if(val.length>1) val=val.charAt(0); 
          e.target.value=val; 
          if(val && idx<inputs.length-1) inputs[idx+1].focus(); 
          if(callback && idx===inputs.length-1 && val) callback(); 
        }); 
        input.addEventListener('keydown', (e) => { 
          if(e.key==='Backspace' && !input.value && idx>0) inputs[idx-1].focus(); 
        }); 
      }); 
    }
    
    function getEnteredOtp(inputs) { 
      let code=''; 
      for(let i=0;i<inputs.length;i++){ 
        const val=inputs[i]?.value.trim()||''; 
        if(val.length===0||!/^\d$/.test(val)) return ''; 
        code+=val; 
      } 
      return code; 
    }
    
    function clearOtpBoxes(inputs) { 
      inputs.forEach(input=>{if(input) input.value='';}); 
      if(inputs[0]) inputs[0].focus(); 
    }
    
    function showLoginForm() { 
      stopTimer('login'); 
      stopTimer('reset'); 
      loginForm.classList.add('active'); 
      otpForm.classList.remove('active'); 
      forgotForm.classList.remove('active'); 
      resetOtpForm.classList.remove('active'); 
      setNewPasswordForm.classList.remove('active'); 
      clearOtpBoxes(loginOtpInputs); 
    }
    
    function showOtpForm() { 
      loginForm.classList.remove('active'); 
      otpForm.classList.add('active'); 
      clearOtpBoxes(loginOtpInputs); 
      resetLoginTimer(); 
    }
    
    function showForgotForm() { 
      stopTimer('reset'); 
      loginForm.classList.remove('active'); 
      otpForm.classList.remove('active'); 
      forgotForm.classList.add('active'); 
      resetOtpForm.classList.remove('active'); 
      setNewPasswordForm.classList.remove('active'); 
      resetEmail.value=''; 
      verifiedResetOtp=null; 
    }
    
    function showResetOtpForm() { 
      loginForm.classList.remove('active'); 
      forgotForm.classList.remove('active'); 
      resetOtpForm.classList.add('active'); 
      clearOtpBoxes(resetOtpInputs); 
      resetResetTimer(); 
    }
    
    function showSetNewPasswordForm() { 
      stopTimer('reset'); 
      resetOtpForm.classList.remove('active'); 
      setNewPasswordForm.classList.add('active'); 
      newPassword.value=''; 
      confirmNewPassword.value=''; 
      document.getElementById('strengthBar').style.width='0%'; 
      document.getElementById('strengthText').textContent = 'Enter a password';
    }
    
    // ========== API CALLS WITH TIMEOUT ==========
    async function fetchWithTimeout(url, options, timeout = 15000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Server is taking too long to respond.');
        }
        throw error;
      }
    }
    
    // ========== LOGIN HANDLERS ==========
    async function handleSignIn() { 
      const email = loginEmail.value.trim(); 
      const password = loginPassword.value.trim(); 
      
      if (!email || !password) { 
        showMessage(signinMessage, 'Please enter both email and password'); 
        return; 
      } 
      
      setButtonLoading(signinBtn, true, 'Signing in...'); 
      loginEmail.disabled = true;
      loginPassword.disabled = true;
      
      const startTime = Date.now();
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/login`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email, password }) 
        }, 10000);
        
        const data = await res.json(); 
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (res.ok && data.success) { 
          currentUserId = data.user?.id; 
          currentEmail = email; 
          
          // Store expiry time from server if provided
          const expirySeconds = data.expiresIn || OTP_EXPIRY_SECONDS;
          
          showMessage(signinMessage, `✓ OTP sent to your email (${elapsedTime}s)`, true); 
          
          setTimeout(() => {
            showOtpForm();
            resetLoginTimer(expirySeconds);
          }, 1000); 
        } else { 
          showMessage(signinMessage, data.message || 'Login failed'); 
          setButtonLoading(signinBtn, false); 
          loginEmail.disabled = false;
          loginPassword.disabled = false;
        } 
      } catch (error) { 
        console.error('Login error:', error);
        
        let errorMessage = 'Network error. ';
        if (error.message.includes('timeout')) {
          errorMessage = '⏱️ Server timeout. The backend might be slow. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = '🔌 Cannot connect to server. Please check if the backend is running.';
        } else {
          errorMessage += error.message || 'Please try again.';
        }
        
        showMessage(signinMessage, errorMessage); 
        setButtonLoading(signinBtn, false); 
        loginEmail.disabled = false;
        loginPassword.disabled = false;
      } 
    }
    
    async function handleVerifyOtp() { 
      const otp = getEnteredOtp(loginOtpInputs); 
      if (!otp || otp.length !== 6) { 
        showMessage(otpMessage, 'Please enter a valid 6-digit OTP code'); 
        return; 
      } 
      
      setButtonLoading(verifyOtpBtn, true, 'Verifying...'); 
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/verify-otp`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId: currentUserId, otp }) 
        }, 10000);
        
        const data = await res.json(); 
        
        if (res.ok && data.success) { 
          showMessage(otpMessage, '✓ Login successful! Redirecting...', true); 
          if (data.token) localStorage.setItem('auth_token', data.token); 
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user)); 
          setTimeout(() => { 
            window.location.href = 'dashboard.html'; 
          }, 1500); 
        } else { 
          showMessage(otpMessage, data.message || 'Invalid or expired OTP'); 
          setButtonLoading(verifyOtpBtn, false); 
        } 
      } catch (error) { 
        console.error('OTP verification error:', error);
        showMessage(otpMessage, 'Verification failed. Please try again.'); 
        setButtonLoading(verifyOtpBtn, false); 
      } 
    }
    
    async function handleResendOtp() { 
      if (!currentEmail) { 
        showMessage(otpMessage, 'Session expired. Please login again.'); 
        showLoginForm(); 
        return; 
      } 
      
      setButtonLoading(resendOtpBtn, true, 'Sending...'); 
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/resend-otp`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: currentEmail }) 
        }, 10000);
        
        const data = await res.json();
        
        if (res.ok && data.success) { 
          showMessage(otpMessage, '✓ New OTP sent to your email', true); 
          const expirySeconds = data.expiresIn || OTP_EXPIRY_SECONDS;
          resetLoginTimer(expirySeconds); 
          clearOtpBoxes(loginOtpInputs); 
        } else { 
          showMessage(otpMessage, data.message || 'Unable to resend OTP. Please try again.'); 
        } 
      } catch (error) { 
        showMessage(otpMessage, 'Failed to resend OTP'); 
      } finally { 
        setButtonLoading(resendOtpBtn, false); 
      } 
    }
    
    // ========== PASSWORD RESET HANDLERS ==========
    async function handleSendResetOtp() { 
      const email = resetEmail.value.trim(); 
      if (!email) { 
        showMessage(resetMessage, 'Please enter your email address'); 
        return; 
      } 
      
      setButtonLoading(sendResetOtpBtn, true, 'Sending...'); 
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/forgot-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email }) 
        }, 10000);
        
        const data = await res.json(); 
        
        if (res.ok && data.success) { 
          resetUserId = data.userId; 
          showMessage(resetMessage, '✓ Reset OTP sent to your email!', true); 
          const expirySeconds = data.expiresIn || OTP_EXPIRY_SECONDS;
          setTimeout(() => {
            showResetOtpForm();
            resetResetTimer(expirySeconds);
          }, 1500); 
        } else { 
          showMessage(resetMessage, data.message || 'Unable to send reset OTP'); 
          setButtonLoading(sendResetOtpBtn, false); 
        } 
      } catch (error) { 
        showMessage(resetMessage, 'Network error. Please try again.'); 
        setButtonLoading(sendResetOtpBtn, false); 
      } 
    }
    
    async function handleVerifyResetOtp() { 
      const otp = getEnteredOtp(resetOtpInputs); 
      if (!otp || otp.length !== 6) { 
        showMessage(resetOtpMessage, 'Please enter a valid 6-digit OTP code'); 
        return; 
      } 
      
      if (!resetUserId) { 
        showMessage(resetOtpMessage, 'Session expired. Please request a new OTP.'); 
        showForgotForm(); 
        return; 
      } 
      
      setButtonLoading(verifyResetOtpBtn, true, 'Verifying...'); 
      verifiedResetOtp = otp; 
      showMessage(resetOtpMessage, '✓ OTP verified! Please set your new password.', true); 
      setTimeout(() => { 
        showSetNewPasswordForm(); 
        setButtonLoading(verifyResetOtpBtn, false); 
      }, 1000); 
    }
    
    async function handleResendResetOtp() { 
      const email = resetEmail.value.trim(); 
      if (!email && !resetUserId) { 
        showMessage(resetOtpMessage, 'Please go back and enter your email'); 
        showForgotForm(); 
        return; 
      } 
      
      setButtonLoading(resendResetOtpBtn, true, 'Sending...'); 
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/forgot-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: email || resetEmail.value }) 
        }, 10000);
        
        const data = await res.json(); 
        
        if (res.ok && data.success) { 
          resetUserId = data.userId; 
          verifiedResetOtp = null; 
          showMessage(resetOtpMessage, '✓ New reset OTP sent to your email!', true); 
          const expirySeconds = data.expiresIn || OTP_EXPIRY_SECONDS;
          resetResetTimer(expirySeconds); 
          clearOtpBoxes(resetOtpInputs); 
        } else { 
          showMessage(resetOtpMessage, data.message || 'Unable to resend OTP'); 
        } 
      } catch (error) { 
        showMessage(resetOtpMessage, 'Failed to resend OTP'); 
      } finally { 
        setButtonLoading(resendResetOtpBtn, false); 
      } 
    }
    
    async function handleSetNewPassword() { 
      const pwd = newPassword.value; 
      const confirm = confirmNewPassword.value; 
      
      if (!pwd || !confirm) { 
        showMessage(setPasswordMessage, 'Please fill in both password fields'); 
        return; 
      } 
      
      if (!checkPasswordStrength(pwd)) { 
        showMessage(setPasswordMessage, 'Please meet all password requirements'); 
        return; 
      } 
      
      if (pwd !== confirm) { 
        showMessage(setPasswordMessage, 'Passwords do not match'); 
        return; 
      } 
      
      if (!resetUserId || !verifiedResetOtp) { 
        showMessage(setPasswordMessage, 'Session expired. Please restart the reset process.'); 
        showForgotForm(); 
        return; 
      } 
      
      setButtonLoading(setNewPasswordBtn, true, 'Resetting...'); 
      
      try { 
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/auth/reset-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId: resetUserId, otp: verifiedResetOtp, newPassword: pwd }) 
        }, 10000);
        
        const data = await res.json(); 
        
        if (res.ok && data.success) { 
          showMessage(setPasswordMessage, '✓ Password reset successful! Redirecting to login...', true); 
          resetUserId = null; 
          verifiedResetOtp = null; 
          setTimeout(() => { 
            showLoginForm(); 
            loginEmail.value = resetEmail.value || ''; 
            showMessage(signinMessage, 'Password reset successful! Please login with your new password.', true);
          }, 2000); 
        } else { 
          showMessage(setPasswordMessage, data.message || 'Password reset failed'); 
          setButtonLoading(setNewPasswordBtn, false); 
        } 
      } catch (error) { 
        showMessage(setPasswordMessage, 'Network error. Please try again.'); 
        setButtonLoading(setNewPasswordBtn, false); 
      } 
    }
    
    // ========== HEALTH CHECK ==========
    async function checkBackendHealth() {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/shatova/v1/health`, {}, 5000);
        if (response.ok) {
          console.log('✅ Backend is healthy');
          return true;
        }
      } catch (error) {
        console.warn('⚠️ Backend health check failed:', error.message);
        
        // Show warning to user
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = '⚠️ Server is waking up. Login might take 15-30 seconds on first attempt.';
        warningDiv.style.cssText = 'background: #FEF3C7; color: #92400E; padding: 10px; text-align: center; font-size: 14px; margin-bottom: 15px; border-radius: 8px; animation: pulse 1s infinite;';
        const formContainer = document.querySelector('.form-container');
        if (formContainer && !document.querySelector('.server-warning')) {
          warningDiv.className = 'server-warning';
          formContainer.insertBefore(warningDiv, formContainer.firstChild);
          setTimeout(() => warningDiv.remove(), 8000);
        }
      }
      return false;
    }
    
    // ========== EVENT LISTENERS ==========
    signinBtn?.addEventListener('click', handleSignIn);
    verifyOtpBtn?.addEventListener('click', handleVerifyOtp);
    resendOtpBtn?.addEventListener('click', handleResendOtp);
    backBtn?.addEventListener('click', showLoginForm);
    forgotBtn?.addEventListener('click', showForgotForm);
    sendResetOtpBtn?.addEventListener('click', handleSendResetOtp);
    backToLoginBtn?.addEventListener('click', showLoginForm);
    verifyResetOtpBtn?.addEventListener('click', handleVerifyResetOtp);
    resendResetOtpBtn?.addEventListener('click', handleResendResetOtp);
    backToForgotBtn?.addEventListener('click', showForgotForm);
    setNewPasswordBtn?.addEventListener('click', handleSetNewPassword);
    backToLoginFromSetBtn?.addEventListener('click', showLoginForm);
    googleBtn?.addEventListener('click', () => handleSocialAuth('Google'));
    facebookBtn?.addEventListener('click', () => handleSocialAuth('Facebook'));
    
    loginPassword?.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSignIn(); });
    resetEmail?.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSendResetOtp(); });
    
    newPassword?.addEventListener('input', () => { checkPasswordStrength(newPassword.value); });
    confirmNewPassword?.addEventListener('input', () => { 
      if(newPassword.value !== confirmNewPassword.value) {
        confirmNewPassword.style.borderColor = '#EF4444';
      } else {
        confirmNewPassword.style.borderColor = '#10B981';
      }
    });
    
    setupOtpNavigation(loginOtpInputs, handleVerifyOtp);
    setupOtpNavigation(resetOtpInputs, handleVerifyResetOtp);
    
    // Initialize
    loginEmail?.focus();
    checkBackendHealth();
})();
