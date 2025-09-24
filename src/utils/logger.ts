// Production-safe logging utility
const isDevelopment = () => {
  try {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.includes('lovableproject.com');
  } catch {
    return false;
  }
};

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment()) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment()) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, but sanitize in production
    if (isDevelopment()) {
      console.error(`[ERROR] ${message}`, error || '');
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment()) {
      console.debug(`[DEBUG] ${message}`, data || '');
    }
  }
};