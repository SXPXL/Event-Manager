// src/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api',
});

API.interceptors.request.use((req) => {
  // Check if we have a token saved
  const token = localStorage.getItem('admin_token');
  
  if (token) {
    // If yes, attach it to the header: "Authorization: Bearer <token>"
    req.headers.Authorization = `Bearer ${token}`;
  }
  
  return req;
});

// 3. Response Interceptor (The "Bouncer Handler")
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the Backend says "401 Unauthorized" (Token invalid/expired)
    if (error.response && error.response.status === 401) {
      // Clear the bad token
      localStorage.removeItem('admin_token');
      // Redirect to Login (unless we are already there)
      if (window.location.pathname !== '/admin') {
        window.location.href = '/admin';
      }
    }
    return Promise.reject(error);
  }
);

export default API;

