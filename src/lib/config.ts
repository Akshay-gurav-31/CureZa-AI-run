// Environment configuration
export const config = {
  // Database
  postgresUrl: import.meta.env.VITE_POSTGRES_URL,

  // OpenAI API
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,

  // Google OAuth
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
  },

  // Google Drive
  googleDrive: {
    clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_GOOGLE_DRIVE_REDIRECT_URI,
  },

  // Server
  port: import.meta.env.VITE_PORT || 4000,

  // Development mode check
  isDev: import.meta.env.DEV,
  
  // App URL
  appUrl: import.meta.env.DEV ? `http://localhost:${import.meta.env.VITE_PORT || 4000}` : window.location.origin,
};

// Validation function to check if required env vars are present
export const validateConfig = () => {
  const required = [
    'VITE_OPENAI_API_KEY',
    'VITE_GOOGLE_CLIENT_ID',
    'VITE_GOOGLE_DRIVE_CLIENT_ID'
  ];

  const missing = required.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
  }

  return missing.length === 0;
};