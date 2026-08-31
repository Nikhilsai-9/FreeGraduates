import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Axios instance with minimum 60000ms timeout per spec
export const api = axios.create({
  baseURL,
  timeout: 60000
});

export const resumeApi = {
  // POST /api/resume/full-analyze (Multipart file + jobDescription in one shot)
  fullAnalyze: async (formData) => {
    // Note: Do NOT set Content-Type manually for FormData — let browser set multipart boundary
    const response = await api.post("/api/resume/full-analyze", formData);
    return response.data;
  },

  // POST /api/resume/upload (Multipart file only)
  upload: async (formData) => {
    const response = await api.post("/api/resume/upload", formData);
    return response.data;
  },

  // POST /api/resume/analyze (Job description analysis on existing record)
  analyze: async (analysisId, jobDescription) => {
    const response = await api.post("/api/resume/analyze", { analysisId, jobDescription });
    return response.data;
  },

  // GET /api/resume/history
  getHistory: async () => {
    const response = await api.get("/api/resume/history");
    return response.data;
  },

  // GET /api/resume/:id
  getById: async (id) => {
    const response = await api.get(`/api/resume/${id}`);
    return response.data;
  },

  // DELETE /api/resume/:id
  deleteById: async (id) => {
    const response = await api.delete(`/api/resume/${id}`);
    return response.data;
  },

  // GET /api/health
  checkHealth: async () => {
    const response = await api.get("/api/health");
    return response.data;
  }
};
