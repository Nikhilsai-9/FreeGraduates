import axios from "axios";
import { auth } from "../config/firebase";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Axios instance with generous timeout for AI generation
export const api = axios.create({
  baseURL,
  timeout: 90000,
});

// Attach Firebase ID Token to every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-user-uid"] = user.uid;
      config.headers["x-user-email"] = user.email || "";
    } else {
      // Dev fallback so the user can poke the API without auth.
      config.headers.Authorization = "Bearer dev-token";
      config.headers["x-user-uid"] = "demo-student-uid";
      config.headers["x-user-email"] = "student@freegraduates.com";
    }
  } catch (err) {
    console.warn("Auth token attachment warning:", err);
  }
  return config;
});

// =====================================================================
// AI Resume Builder API
// All endpoints delegate to the Python FastAPI backend.
// Docs: backend/README.md
// =====================================================================

export const resumeApi = {
  // ---------- Health / meta ----------
  health: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  templates: async () => {
    const response = await api.get("/api/templates");
    return response.data;
  },

  // ---------- PDF upload + extraction ----------
  // IMPORTANT: do NOT set Content-Type manually for FormData uploads.
  // When you pass FormData, the browser/axios must auto-generate the
  // `boundary=...` parameter; hardcoding `multipart/form-data` without a
  // boundary makes python-multipart reject the body as unparseable,
  // which previously surfaced to the user as
  //   "We couldn't read this file. Please try another PDF."
  extract: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post("/api/resume/extract", form, {
      timeout: 120000,
    });
    return response.data;
  },

  // ---------- AI generation ----------
  generate: async ({ candidate, job, templateId }) => {
    const response = await api.post("/api/resume/generate", {
      candidate,
      job,
      templateId,
    });
    return response.data;
  },

  // ---------- CRUD: saved resumes ----------
  save: async (payload) => {
    const response = await api.post("/api/resume/save", payload);
    return response.data;
  },

  list: async () => {
    const response = await api.get("/api/resume/list");
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`/api/resume/${id}`);
    return response.data;
  },

  remove: async (id) => {
    const response = await api.delete(`/api/resume/${id}`);
    return response.data;
  },

  // ---------- Export ----------
  // The backend streams the binary directly; we use a fetch wrapper
  // so we can stream the response as a blob and trigger a download.
  exportUrl: (id, format) =>
    `${baseURL}/api/resume/${id}/export?format=${format}`,

  export: async (id, format) => {
    const user = auth.currentUser;
    const headers = {};
    if (user) {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
      headers["x-user-uid"] = user.uid;
      headers["x-user-email"] = user.email || "";
    } else {
      headers.Authorization = "Bearer dev-token";
    }
    const response = await fetch(
      `${baseURL}/api/resume/${id}/export?format=${format}`,
      { headers },
    );
    if (!response.ok) {
      throw new Error(`Export failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

