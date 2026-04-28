(function() {
    // ========== SOCIAL AUTH CONFIGURATION ==========
    // Google and Facebook sign-in will be available soon
    
    async function handleSocialAuth(provider) {
      const signinMsgDiv = document.getElementById('signinMessage');
      if (!signinMsgDiv) return;
      const googleBtn = document.getElementById('googleSigninBtn');
      const facebookBtn = document.getElementById('facebookSigninBtn');
      const activeBtn = provider === 'Google' ? googleBtn : facebookBtn;
      
      // Show coming soon message instead of actual authentication
      setButtonLoading(activeBtn, true, `Loading...`);
      
      setTimeout(() => {
        setButtonLoading(activeBtn, false);
        showMessage(signinMsgDiv, `✨ ${provider} Sign-in is coming soon! Stay tuned for updates.`, false);
      }, 1000);
    }
    
    // ========== REST OF THE APPLICATION (Email/Password, OTP flows) ==========
    const API_BASE_URL = "http://localhost:6030";
    const OTP_EXPIRY_SECONDS = 60;
    
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
    
    let currentUserId = null;
    let currentEmail = null;
    let resetUserId = null;
    let verifiedResetOtp = null;
    let loginTimerInterval = null;
    let resetTimerInterval = null;
    
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    function stopTimer(type) {
      if (type === 'login' && loginTimerInterval) { clearInterval(loginTimerInterval); loginTimerInterval = null; }
      if (type === 'reset' && resetTimerInterval) { clearInterval(resetTimerInterval); resetTimerInterval = null; }
    }
    
    function startCountdown(displayElement, onExpire, type) {
      if (!displayElement) return null;
      let remaining = OTP_EXPIRY_SECONDS;
      displayElement.innerHTML = `⏱️ ${formatTime(remaining)}`;
      displayElement.classList.remove('expired');
      const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
          displayElement.innerHTML = `⏱️ Expired!`;
          displayElement.classList.add('expired');
          if (onExpire) onExpire();
          if (type === 'login') { loginTimerInterval = null; if(resendOtpBtn) resendOtpBtn.classList.remove('disabled'); }
          if (type === 'reset') { resetTimerInterval = null; if(resendResetOtpBtn) resendResetOtpBtn.classList.remove('disabled'); }
        } else { displayElement.innerHTML = `⏱️ ${formatTime(remaining)}`; }
      }, 1000);
      return interval;
    }
    
    function resetLoginTimer() { if(loginTimerInterval) stopTimer('login'); if(resendOtpBtn) resendOtpBtn.classList.add('disabled'); loginTimerInterval = startCountdown(otpTimerDisplay, () => showMessage(otpMessage, '⚠️ OTP expired. Request new code.', false), 'login'); }
    function resetResetTimer() { if(resetTimerInterval) stopTimer('reset'); if(resendResetOtpBtn) resendResetOtpBtn.classList.add('disabled'); resetTimerInterval = startCountdown(resetTimerDisplay, () => showMessage(resetOtpMessage, '⚠️ Reset OTP expired.', false), 'reset'); }
    
    function checkPasswordStrength(password) {
      const reqs = { length: { regex: /.{8,}/, element: 'lengthReq' }, uppercase: { regex: /[A-Z]/, element: 'upperReq' }, lowercase: { regex: /[a-z]/, element: 'lowerReq' }, number: { regex: /[0-9]/, element: 'numberReq' }, special: { regex: /[!@#$%^&*(),.?":{}|<>]/, element: 'specialReq' } };
      let strength = 0;
      for (const [key, req] of Object.entries(reqs)) {
        const isValid = req.regex.test(password);
        const elem = document.getElementById(req.element);
        const span = elem.querySelector('span');
        if (isValid) { elem.classList.add('valid'); elem.classList.remove('invalid'); span.innerHTML = '✅'; strength++; } else { elem.classList.add('invalid'); elem.classList.remove('valid'); span.innerHTML = '❌'; }
      }
      const bar = document.getElementById('strengthBar'); const txt = document.getElementById('strengthText'); const percent = (strength / 5) * 100;
      bar.style.width = percent + '%';
      bar.style.background = strength <= 2 ? '#EF4444' : strength <= 4 ? '#F59E0B' : '#10B981';
      txt.textContent = strength === 0 ? 'Enter a password' : strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong!';
      return strength === 5;
    }
    
    window.togglePasswordVisibility = function(inputId, element) { const inp = document.getElementById(inputId); if (inp.type === 'password') { inp.type = 'text'; element.classList.remove('fa-eye'); element.classList.add('fa-eye-slash'); } else { inp.type = 'password'; element.classList.remove('fa-eye-slash'); element.classList.add('fa-eye'); } };
    
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
    
    async function handleSignIn() { 
      const email = loginEmail.value.trim(); 
      const password = loginPassword.value.trim(); 
      if (!email || !password) { 
        showMessage(signinMessage, 'Please enter both email and password'); 
        return; 
      } 
      setButtonLoading(signinBtn, true, 'Signing in...'); 
      try { 
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/login`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email, password }) 
        }); 
        const data = await res.json(); 
        if (res.ok && data.success) { 
          currentUserId = data.user?.id; 
          currentEmail = email; 
          showMessage(signinMessage, data.message || '✓ OTP sent to your email', true); 
          setTimeout(() => showOtpForm(), 1000); 
        } else { 
          showMessage(signinMessage, data.message || 'Login failed'); 
          setButtonLoading(signinBtn, false); 
        } 
      } catch (error) { 
        showMessage(signinMessage, 'Network error. Please check if backend is running.'); 
        setButtonLoading(signinBtn, false); 
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
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/verify-otp`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId: currentUserId, otp }) 
        }); 
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
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/resend-otp`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: currentEmail }) 
        }); 
        if (res.ok) { 
          showMessage(otpMessage, '✓ New OTP sent to your email', true); 
          resetLoginTimer(); 
          clearOtpBoxes(loginOtpInputs); 
        } else { 
          showMessage(otpMessage, 'Unable to resend OTP. Please try again.'); 
        } 
      } catch (error) { 
        showMessage(otpMessage, 'Failed to resend OTP'); 
      } finally { 
        setButtonLoading(resendOtpBtn, false); 
      } 
    }
    
    async function handleSendResetOtp() { 
      const email = resetEmail.value.trim(); 
      if (!email) { 
        showMessage(resetMessage, 'Please enter your email address'); 
        return; 
      } 
      setButtonLoading(sendResetOtpBtn, true, 'Sending...'); 
      try { 
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/forgot-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email }) 
        }); 
        const data = await res.json(); 
        if (res.ok && data.success) { 
          resetUserId = data.userId; 
          showMessage(resetMessage, '✓ Reset OTP sent to your email!', true); 
          setTimeout(() => showResetOtpForm(), 1500); 
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
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/forgot-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: email || resetEmail.value }) 
        }); 
        const data = await res.json(); 
        if (res.ok && data.success) { 
          resetUserId = data.userId; 
          verifiedResetOtp = null; 
          showMessage(resetOtpMessage, '✓ New reset OTP sent to your email!', true); 
          resetResetTimer(); 
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
        const res = await fetch(`${API_BASE_URL}/api/shatova/v1/auth/reset-password`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ userId: resetUserId, otp: verifiedResetOtp, newPassword: pwd }) 
        }); 
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
    
    // Event Listeners
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
    loginEmail?.focus();
})();