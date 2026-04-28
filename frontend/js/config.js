// ===============================
// GLOBAL CONFIGURATION
// ===============================

// API Base URL - automatically detects environment
export const API_BASE_URL = window.location.hostname === "localhost" 
  ? "http://localhost:6030" 
  : "https://your-production-api.com";

// App Constants
export const APP_NAME = "Nearby";
export const OTP_LENGTH = 6;

// Helper: Show message with auto-hide
export function showMessage(element, message, isSuccess = false) {
  if (!element) return;
  
  element.style.display = "block";
  element.textContent = message;
  element.style.backgroundColor = isSuccess ? "#d4edda" : "#f8d7da";
  element.style.color = isSuccess ? "#155724" : "#721c24";
  
  setTimeout(() => {
    if (element) element.style.display = "none";
  }, 4000);
}

// Helper: Set button loading state
export function setButtonLoading(button, isLoading, originalText, originalIcon = null) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<span class="loading-spinner"></span> ${originalText}`;
  } else {
    button.disabled = false;
    if (originalIcon) {
      button.innerHTML = `${originalText} ${originalIcon}`;
    } else {
      button.innerHTML = originalText;
    }
  }
}

// Helper: Validate email format
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper: Validate phone number
export function isValidPhone(phone) {
  return phone && phone.length >= 6;
}