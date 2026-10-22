import axios, { AxiosError } from "axios";

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
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

// Response interceptor to handle auth failures and auto-recover with demo session
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const demoRes = await axios.post(`${API_BASE_URL}/auth/demo`);
        if (demoRes.data?.access_token) {
          localStorage.setItem("eventwise_token", demoRes.data.access_token);
          localStorage.setItem("eventwise_user", JSON.stringify(demoRes.data.user));
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${demoRes.data.access_token}`;
          }
          return apiClient(originalRequest);
        }
      } catch {
        localStorage.removeItem("eventwise_token");
        localStorage.removeItem("eventwise_user");
      }
    }
    return Promise.reject(error);
  }
);

