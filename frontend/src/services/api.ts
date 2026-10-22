import axios, { AxiosError } from "axios";

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production builds (e.g. Vercel), default directly to deployed Render backend
  if (import.meta.env.PROD) {
    return "https://eventwise-ai-planner.onrender.com/api/v1";
  }
  const hostname =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "localhost";
  return `http://${hostname}:8000/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor to inject Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("eventwise_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error)
);

