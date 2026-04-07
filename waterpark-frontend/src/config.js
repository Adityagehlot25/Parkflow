// API Configuration - loads from environment variables or defaults
// In production, set VITE_BACKEND_URL to your Render backend URL (e.g., "https://water-park-backend.onrender.com")
// In development, defaults to http://localhost:5000
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const config = {
  API_BASE_URL,
};

export default config;
