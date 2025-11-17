// Configuration for production backend
// This allows the Electron app to connect to the hosted backend
// instead of trying to connect to localhost

window.APP_CONFIG = {
  // Backend API URL (hosted on Render)
  API_URL: 'https://godcomplex.onrender.com',

  // WebSocket URL (same as API, using Socket.IO)
  WS_URL: 'https://godcomplex.onrender.com',

  // Frontend URL (for reference)
  FRONTEND_URL: 'https://godcomplex.vercel.app'
};

console.log('Loaded production config:', window.APP_CONFIG);
