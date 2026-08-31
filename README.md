# AI Resume Analyzer (MERN + Google Gemini)

A full-stack, production-quality AI Resume & Job Description match analyzer built using Node.js, Express, MongoDB, React (Vite), and the official Google Gemini SDK (`@google/genai`).

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or later
- **MongoDB**: Local instance running at `mongodb://127.0.0.1:27017` (or remote MongoDB Atlas connection string)
- **Google Gemini API Key**: Free tier API key from [Google AI Studio](https://aistudio.google.com/)

---

## 2. How to Get a Free Gemini API Key

1. Navigate to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click on **"Get API key"** in the left navigation sidebar.
4. Click **"Create API key"** and select or create a project.
5. Copy the generated key (starts with `AIzaSy...` or `AQ...`).
6. Paste it into `backend/.env` as `GEMINI_API_KEY`.

---

## 3. Environment Variables Setup

### Backend (`backend/.env`)
Create `backend/.env` (or copy from `backend/.env.example`):
```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/resume_analyzer
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```
> **Note**: Do NOT set `GOOGLE_API_KEY` or `GOOGLE_GENAI_USE_VERTEXAI=true`. Only use `GEMINI_API_KEY`.

### Frontend (`frontend/.env`)
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
```

---

## 4. Install & Run Commands

### Backend Setup
```bash
cd backend
npm install

# (Optional) Verify Gemini API key & model connectivity
npm run check:model

# Start backend server on port 4000
npm run dev
# Or for production:
npm start
```

### Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install

# Start Vite development server on port 5173
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check returning DB status and configured AI model |
| `POST` | `/api/resume/full-analyze` | Multipart (`resume` file + `jobDescription` string). Returns full ATS analysis |
| `POST` | `/api/resume/upload` | Multipart (`resume` file). Parses and structures resume data |
| `POST` | `/api/resume/analyze` | Body `{ analysisId, jobDescription }`. Analyzes existing resume record |
| `GET` | `/api/resume/history` | Fetches the last 20 analyses (sorted by newest first) |
| `GET` | `/api/resume/:id` | Retrieves a single complete analysis by ID |
| `DELETE` | `/api/resume/:id` | Deletes analysis document from MongoDB and unlinks local file |

---

## 6. Troubleshooting

### 1. "Could not load the default credentials" (P1)
- **Cause**: The Gemini client was instantiated before environment variables were loaded, triggering Google Application Default Credentials fallback.
- **Fix**: The application uses lazy initialization (`getClient()`). Ensure `GEMINI_API_KEY` is present in `backend/.env`.

### 2. Model hangs or returns HTTP 500 (P2)
- **Cause**: Using unavailable or deprecated model identifiers (e.g. `gemini-3.7-flash` or `gemini-2.5-flash`).
- **Fix**: The application is configured to use `gemini-3.6-flash`. Run the model check script in `backend/`:
  ```bash
  npm run check:model
  ```

### 3. Blank / Partial result cards (P3)
- **Cause**: Gemini structured output omitting fields when not declared in the `required` array.
- **Fix**: The backend schema strictly enforces `required` arrays on every object and array level.

### 4. GOOGLE_API_KEY shadowing GEMINI_API_KEY (P10)
- **Cause**: Having both environment variables defined causes the SDK to prioritize `GOOGLE_API_KEY`.
- **Fix**: Remove `GOOGLE_API_KEY` from your environment or `.env` and use `GEMINI_API_KEY` exclusively.

### 5. CORS Errors
- **Cause**: Origin mismatch between frontend and backend.
- **Fix**: `server.js` enables CORS for `http://localhost:5173` and `http://127.0.0.1:5173`. Ensure the frontend is calling `http://localhost:4000` without a Vite proxy.

### 6. MongoDB not running
- **Symptom**: `/api/health` reports `db: "disconnected"`.
- **Fix**: Ensure your local MongoDB service is started (`mongod` or `net start MongoDB`), or set `MONGO_URI` to a MongoDB Atlas cluster URI in `backend/.env`.

### 7. "Could not read text from this file — it may be a scanned image"
- **Cause**: The uploaded PDF is an image scan without an OCR text layer.
- **Fix**: Upload a text-selectable PDF or `.docx` file containing at least 100 characters of text.

---

## License

MIT License.
