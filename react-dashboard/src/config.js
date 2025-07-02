/**
 * Application configuration
 * Contains centralized configuration settings for the application
 */

// Backend API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002';
const BACKEND_HEALTH_ENDPOINT = '/health';
const BACKEND_SECURITY_STATUS_ENDPOINT = '/api/security/status';

// Export configuration
const config = {
  // Backend settings
  backend: {
    url: BACKEND_URL,
    healthEndpoint: BACKEND_HEALTH_ENDPOINT,
    healthCheckUrl: `${BACKEND_URL}${BACKEND_HEALTH_ENDPOINT}`,
    securityStatusEndpoint: BACKEND_SECURITY_STATUS_ENDPOINT,
    securityStatusUrl: `${BACKEND_URL}${BACKEND_SECURITY_STATUS_ENDPOINT}`,
  },

  // Add other configuration sections as needed
  // ...
};

export default config;
