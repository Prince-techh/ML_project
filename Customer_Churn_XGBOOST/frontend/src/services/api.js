import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 15000,
  headers: { "Content-Type": "application/json" }
});

export const getDashboardStats = () => api.get("/dashboard/stats");
export const getCustomers = (params = {}) => api.get("/customers", { params });
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const getPredictions = (params = {}) => api.get("/predictions", { params });
export const createPrediction = (payload) => api.post("/predict", payload);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

export function getApiError(error) {
  return error?.response?.data?.detail || error?.message || "Something went wrong.";
}

export default api;
