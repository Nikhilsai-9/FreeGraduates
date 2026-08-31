import axios from "axios";
import { auth } from "../config/firebase";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Axios instance with minimum 60000ms timeout per spec
export const api = axios.create({
  baseURL,
  timeout: 60000
});

// Attach Firebase ID Token dynamically on requests
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-user-uid"] = user.uid;
      config.headers["x-user-email"] = user.email || "";
    } else {
      config.headers.Authorization = `Bearer dev-token`;
      config.headers["x-user-uid"] = "demo-student-uid";
      config.headers["x-user-email"] = "student@freegraduates.com";
    }
  } catch (err) {
    console.warn("Auth token attachment warning:", err);
  }
  return config;
});

export const resumeApi = {
  // --- 1. Original ATS Analyzer APIs ---
  fullAnalyze: async (formData) => {
    const response = await api.post("/api/resume/full-analyze", formData);
    return response.data;
  },

  upload: async (formData) => {
    const response = await api.post("/api/resume/upload", formData);
    return response.data;
  },

  analyze: async (analysisId, jobDescription) => {
    const response = await api.post("/api/resume/analyze", { analysisId, jobDescription });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get("/api/resume/history");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/api/resume/${id}`);
    return response.data;
  },

  deleteById: async (id) => {
    const response = await api.delete(`/api/resume/${id}`);
    return response.data;
  },

  checkHealth: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  // --- 2. Interactive Resume Builder APIs ---
  importLinkedIn: async (formData) => {
    const response = await api.post("/api/resumes/import-linkedin", formData);
    return response.data;
  },

  importFile: async (formData) => {
    const response = await api.post("/api/resumes/import-file", formData);
    return response.data;
  },

  createResume: async (resumeData) => {
    const response = await api.post("/api/resumes", resumeData);
    return response.data;
  },

  getResumes: async () => {
    const response = await api.get("/api/resumes");
    return response.data;
  },

  getResume: async (id) => {
    const response = await api.get(`/api/resumes/${id}`);
    return response.data;
  },

  updateResume: async (id, resumeData) => {
    const response = await api.put(`/api/resumes/${id}`, resumeData);
    return response.data;
  },

  deleteResume: async (id) => {
    const response = await api.delete(`/api/resumes/${id}`);
    return response.data;
  },

  suggestImprovements: async (id, jobDescription) => {
    const response = await api.post(`/api/resumes/${id}/suggest-improvements`, { jobDescription });
    return response.data;
  },

  exportDocxUrl: (id) => `${baseURL}/api/resumes/${id}/export-docx`
};
