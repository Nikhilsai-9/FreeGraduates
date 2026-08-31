# FreeGraduates — AI Resume Builder, Real-Time Editor & Firebase Auth

A production-quality MERN + Google Gemini + Firebase Authentication web application.

---

## Features

1. **Authentication (Firebase)**:
   - Email & Password Login & Registration with user profiles.
   - "Continue with Google" OAuth provider integration.
   - Protected dashboard and resume editor routes with Firebase Admin token verification on the backend.
2. **Resume Ingestion**:
   - **Path A — LinkedIn PDF Import**: Parses LinkedIn profile PDF exports automatically into structured resume fields.
   - **Path B — Resume File Import**: Parses standard PDF and DOCX files.
   - **Path C — Manual Step-by-Step Wizard**: Multi-step onboarding form for candidates building their first resume.
3. **Split-Screen Interactive Editor**:
   - **Left Canvas**: Real-time WYSIWYG paper preview rendering 4 interchangeable ATS templates (*Modern Tech*, *Minimal SDE*, *Student / Campus*, *Executive Classic*).
   - **Right AI Panel**: Real-time AI diff cards with `[✓ Accept]`, `[✗ Reject]`, and `[Accept All]` actions, plus a target JD keyword inserter and form editor.
4. **Dual Export**:
   - High-fidelity PDF export via browser print stylesheet.
   - Native Microsoft Word `.docx` generation via backend streaming.

---

## Environment Setup

### 1. Backend (`backend/.env`)
```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/resume_analyzer
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
CLIENT_URL=http://localhost:5173

# Optional: Firebase Admin Service Account Key (as JSON string) or Project ID
FIREBASE_PROJECT_ID=your_firebase_project_id
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 2. Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:4000

# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

---

## How to Run

### Backend
```bash
cd backend
npm run dev
```

### Frontend
In a new terminal:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.
