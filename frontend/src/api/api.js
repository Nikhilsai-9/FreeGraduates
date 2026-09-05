import axios from "axios";
import { auth } from "../config/firebase";

const envUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : "";

// Production MUST point at the deployed Render backend. If the var is
// missing in prod we log loudly instead of silently downloading to the
// end-user's own machine (localhost), which is what caused the
// "Cannot reach the resume extraction service" production failure.
const baseURL =
  envUrl || (import.meta.env.PROD ? "https://freegraduates-backend.onrender.com" : "http://localhost:8000");

if (import.meta.env.PROD && !envUrl) {
  console.warn(
    "[api] VITE_API_URL is not set for this production build — using default " + baseURL + ". " +
    "Set VITE_API_URL in your Vercel project env vars to the Render backend URL (see frontend/.env.example)."
  );
}

export const api = axios.create({
  baseURL,
  timeout: 90000,
});

api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-user-uid"] = user.uid;
      config.headers["x-user-email"] = user.email || "";
    } else {
      config.headers.Authorization = "Bearer dev-token";
      config.headers["x-user-uid"] = "demo-student-uid";
      config.headers["x-user-email"] = "student@freegraduates.com";
    }
  } catch (err) {
    console.warn("Auth token attachment warning:", err);
  }
  return config;
});

export class ExtractError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.name = "ExtractError";
    this.status = status;
    this.detail = detail;
  }
}

function categoriseExtractError(err) {
  if (err.response) {
    const { status, data } = err.response;
    const detail = data?.detail || "";
    switch (status) {
      case 415:
        return new ExtractError("File must be a PDF.", 415, detail);
      case 413:
        return new ExtractError("PDF exceeds the supported file size (16 MB max).", 413, detail);
      case 422:
        return new ExtractError(
          "Your PDF appears to be image-based or empty. Try a text-based PDF, or enter your information manually.",
          422,
          detail
        );
      case 500:
        return new ExtractError(
          "Resume extraction service encountered an error. Please try again or enter your information manually.",
          500,
          detail
        );
      default:
        return new ExtractError(
          detail || "Unable to extract text from this PDF.",
          status,
          detail
        );
    }
  }
  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return new ExtractError("Extraction timed out. The file may be too complex — try a simpler PDF.", 0, "timeout");
  }
  if (err.code === "ERR_NETWORK" || !err.response) {
    return new ExtractError(
      "Cannot reach the resume extraction service. Please try again later.",
      0,
      "network"
    );
  }
  return new ExtractError("Unable to process this file. Please try another PDF.", 0, "unknown");
}

export const resumeApi = {
  health: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  templates: async () => {
    const response = await api.get("/api/templates");
    return response.data;
  },

  extract: async (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await api.post("/api/resume/extract", form, {
        timeout: 120000,
        onUploadProgress: onProgress
          ? (e) => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 50));
            }
          : undefined,
      });
      return response.data;
    } catch (err) {
      throw categoriseExtractError(err);
    }
  },

  generate: async ({ candidate, job, templateId }) => {
    const response = await api.post("/api/resume/generate", {
      candidate,
      job,
      templateId,
    });
    return response.data;
  },

  /**
   * Score a candidate's resume against a target JD and return a list of
   * actionable diffs. Backed by `POST /api/resume/analyze` — deterministic,
   * no LLM in the loop, so the score is reproducible.
   */
  analyze: async ({ candidate, job }) => {
    const response = await api.post("/api/resume/analyze", { candidate, job });
    return response.data;
  },

  /**
   * Run the ATS-format/structure checklist against the candidate's resume.
   * Backed by `POST /api/resume/ats-check`. Returns a weighted score
   * plus per-check pass/warn/fail items.
   */
  atsCheck: async ({ candidate }) => {
    const response = await api.post("/api/resume/ats-check", { candidate });
    return response.data;
  },

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
      { headers }
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

export const profileApi = {
  get: async () => {
    const response = await api.get("/api/profile");
    return response.data;
  },
  save: async (partial) => {
    const response = await api.put("/api/profile", partial);
    return response.data;
  },
  markOnboarded: async () => {
    const response = await api.post("/api/profile/onboard");
    return response.data;
  },
};
