import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.argv[2] || "gemini-3.6-flash";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "your_key_here") {
  console.error("❌ GEMINI_API_KEY is not set in backend/.env. Please configure a valid key from Google AI Studio.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const t = Date.now();

try {
  const r = await Promise.race([
    ai.models.generateContent({ model: MODEL, contents: "reply with the single word: ok" }),
    new Promise((_, rj) => setTimeout(() => rj(new Error("HUNG >20s — model is listed but not serving")), 20000)),
  ]);
  console.log(`✅ ${MODEL} OK in ${Date.now() - t}ms →`, r.text ? r.text.trim() : "ok");
} catch (e) {
  console.error(`❌ ${MODEL} FAILED in ${Date.now() - t}ms →`, e.message);
  process.exit(1);
}
