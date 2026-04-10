import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001/api";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let hasHandledSessionExpiry = false;

const clearSessionAndRedirect = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  if (hasHandledSessionExpiry) return;
  hasHandledSessionExpiry = true;
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

// Automatically attach token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and potential errors (like 401 unauthorized)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || "").toLowerCase();
    const hadAuthHeader = Boolean(error?.config?.headers?.Authorization);
    const isJwt422 =
      status === 422 &&
      (message.includes("token") ||
        message.includes("jwt") ||
        message.includes("signature") ||
        message.includes("expired"));

    if ((status === 401 && hadAuthHeader) || isJwt422) {
      clearSessionAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default API;
