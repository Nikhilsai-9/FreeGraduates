import { GoogleGenAI, Type } from "@google/genai";

export const MODEL = "gemini-3.6-flash";

// P1: Build client lazily — ESM imports evaluate before server.js runs dotenv.config()
let aiInstance;
const getClient = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "your_key_here") {
      throw new Error("GEMINI_API_KEY is not set. Add it to backend/.env and restart the server.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey.trim() });
  }
  return aiInstance;
};

// Full Resume Schema for Import
const resumeImportSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        github: { type: Type.STRING },
        portfolio: { type: Type.STRING }
      },
      required: ["fullName", "email", "phone", "location", "linkedin", "github", "portfolio"]
    },
    summary: { type: Type.STRING },
    workExperience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          current: { type: Type.BOOLEAN },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["company", "role", "startDate", "endDate", "current", "bullets"]
      }
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          field: { type: Type.STRING },
          year: { type: Type.STRING },
          grade: { type: Type.STRING }
        },
        required: ["institution", "degree", "field", "year", "grade"]
      }
    },
    skills: {
      type: Type.OBJECT,
      properties: {
        technical: { type: Type.ARRAY, items: { type: Type.STRING } },
        tools: { type: Type.ARRAY, items: { type: Type.STRING } },
        soft: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["technical", "tools", "soft"]
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          link: { type: Type.STRING }
        },
        required: ["title", "description", "techStack", "link"]
      }
    },
    certifications: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    languages: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: [
    "title",
    "personalInfo",
    "summary",
    "workExperience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages"
  ]
};

// Schema for Real-Time Diff Improvement Suggestions
const diffSuggestionsSchema = {
  type: Type.OBJECT,
  properties: {
    targetRoleMatchScore: { type: Type.NUMBER },
    roleAlignmentSummary: { type: Type.STRING },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: {
            type: Type.STRING,
            enum: ["summary", "experience", "skills", "projects", "general"]
          },
          targetId: { type: Type.STRING },
          originalContent: { type: Type.STRING },
          suggestedContent: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["section", "targetId", "originalContent", "suggestedContent", "reason"]
      }
    },
    missingKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["targetRoleMatchScore", "roleAlignmentSummary", "suggestions", "missingKeywords"]
};

// Original ATS Analysis Schema
const fullAnalysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    parsedData: {
      type: Type.OBJECT,
      properties: {
        contact: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            location: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            github: { type: Type.STRING },
            portfolio: { type: Type.STRING }
          },
          required: ["name", "email", "phone", "location", "linkedin", "github", "portfolio"]
        },
        summary: { type: Type.STRING },
        totalExperienceYears: { type: Type.NUMBER },
        workExperience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              company: { type: Type.STRING },
              role: { type: Type.STRING },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              duration: { type: Type.STRING },
              bullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["company", "role", "startDate", "endDate", "duration", "bullets"]
          }
        },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              institution: { type: Type.STRING },
              degree: { type: Type.STRING },
              field: { type: Type.STRING },
              year: { type: Type.STRING },
              grade: { type: Type.STRING }
            },
            required: ["institution", "degree", "field", "year", "grade"]
          }
        },
        skills: {
          type: Type.OBJECT,
          properties: {
            technical: { type: Type.ARRAY, items: { type: Type.STRING } },
            tools: { type: Type.ARRAY, items: { type: Type.STRING } },
            soft: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["technical", "tools", "soft"]
        },
        projects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              techStack: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "description", "techStack"]
          }
        },
        certifications: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        languages: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: [
        "contact",
        "summary",
        "totalExperienceYears",
        "workExperience",
        "education",
        "skills",
        "projects",
        "certifications",
        "languages"
      ]
    },
    matchScore: { type: Type.NUMBER },
    verdict: { type: Type.STRING },
    subScores: {
      type: Type.OBJECT,
      properties: {
        skills: { type: Type.NUMBER },
        experience: { type: Type.NUMBER },
        education: { type: Type.NUMBER },
        keywordDensity: { type: Type.NUMBER }
      },
      required: ["skills", "experience", "education", "keywordDensity"]
    },
    matchedKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    missingKeywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING },
          importance: {
            type: Type.STRING,
            enum: ["critical", "important", "nice-to-have"]
          },
          why: { type: Type.STRING }
        },
        required: ["keyword", "importance", "why"]
      }
    },
    skillGaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          missing: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestion: { type: Type.STRING }
        },
        required: ["category", "missing", "suggestion"]
      }
    },
    bulletRewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          improved: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["original", "improved", "reason"]
      }
    },
    layoutSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    overallFeedback: {
      type: Type.OBJECT,
      properties: {
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        quickWins: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["strengths", "weaknesses", "quickWins"]
    }
  },
  required: [
    "parsedData",
    "matchScore",
    "verdict",
    "subScores",
    "matchedKeywords",
    "missingKeywords",
    "skillGaps",
    "bulletRewrites",
    "layoutSuggestions",
    "overallFeedback"
  ]
};

const parsedOnlySchema = fullAnalysisResponseSchema.properties.parsedData;

const SYSTEM_INSTRUCTION_BASE = `You are an expert ATS (Applicant Tracking System) parser and principal technical recruiter.
Your evaluations must be realistic, evidence-based, and objective.
You must return only valid JSON adhering strictly to the provided schema.
Never omit a field. If information is genuinely absent, return an empty string, 0, or an empty array.`;

/**
 * Executes a Gemini request with a 45s ceiling and backoff retries.
 */
async function callGeminiWithRetry(prompt, schema, customInstruction) {
  const client = getClient();
  const maxRetries = 2;
  const backoffs = [3000, 6000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await Promise.race([
        client.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION_BASE}\n${customInstruction || ""}`,
            responseMimeType: "application/json",
            responseSchema: schema,
            thinkingConfig: { thinkingLevel: "low" }
          }
        }),
        new Promise((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error("Gemini request timed out after 45 seconds"));
          });
        })
      ]);

      clearTimeout(timeoutId);

      const rawText = response.text ? response.text.trim() : "";
      if (!rawText) {
        throw new Error("Received empty response from Gemini");
      }

      return JSON.parse(rawText);
    } catch (err) {
      const isTransient =
        err.message?.includes("429") ||
        err.message?.includes("503") ||
        err.message?.includes("overloaded") ||
        err.message?.includes("timed out") ||
        err.message?.includes("RESOURCE_EXHAUSTED");

      if (attempt < maxRetries && isTransient) {
        console.warn(`Gemini attempt ${attempt + 1} failed (${err.message}). Retrying in ${backoffs[attempt]}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffs[attempt]));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Parses raw LinkedIn Profile PDF text into structured Resume format.
 */
export async function importLinkedInProfile(rawText) {
  const prompt = `Convert this raw text extracted from a LinkedIn Profile PDF into a complete, professional, structured resume schema:

LINKEDIN PROFILE TEXT:
${rawText}`;

  const customInstruction = `Extract the headline into summary if appropriate, map all Experience items into workExperience with clear bullet points, extract Education degrees and institutions, categorize all Skills into technical, tools, and soft, and extract Projects and Certifications.`;

  return await callGeminiWithRetry(prompt, resumeImportSchema, customInstruction);
}

/**
 * Parses standard resume files (PDF/DOCX) into full resume builder format.
 */
export async function importResumeFile(rawText) {
  const prompt = `Extract all details from this resume document into the structured resume builder schema:

RESUME DOCUMENT TEXT:
${rawText}`;

  const customInstruction = `Structure the candidate's personal contact info, professional summary, work experiences with structured bullet points, education, technical/tool/soft skills, and projects.`;

  return await callGeminiWithRetry(prompt, resumeImportSchema, customInstruction);
}

/**
 * Generates actionable before-and-after diff suggestions for the split-screen live editor.
 */
export async function generateResumeDiffSuggestions(resumeData, targetJobDescription) {
  const prompt = `Analyze this candidate's resume JSON and provide actionable, high-impact diff suggestions to align it with the target role and job description.

TARGET JOB DESCRIPTION:
${targetJobDescription || "Software Engineering and Technology Roles"}

CURRENT RESUME JSON:
${JSON.stringify(resumeData, null, 2)}`;

  const customInstruction = `Generate specific suggestions:
1. For work experience bullets, rewrite weak or generic bullets with strong action verbs, quantifiable metrics, and relevant JD keywords. Include the item/bullet targetId.
2. For the professional summary, propose a tailored version.
3. Identify missing technical keywords and provide missingKeywords list.
Set section to 'experience', 'summary', 'skills', or 'projects'.`;

  return await callGeminiWithRetry(prompt, diffSuggestionsSchema, customInstruction);
}

/**
 * Parses raw resume text into structured fields.
 */
export async function parseResume(rawText) {
  const prompt = `Please extract and structure all information from this resume into the JSON schema:

RESUME TEXT:
${rawText}`;

  const customInstruction = "Extract all contact details, work experience, education, projects, skills, certifications, and calculate total years of experience accurately.";

  return await callGeminiWithRetry(prompt, parsedOnlySchema, customInstruction);
}

/**
 * Analyzes resume text against a target job description.
 */
export async function analyzeAgainstJD(rawText, jobDescription) {
  const prompt = `Perform a comprehensive ATS and technical recruiter match evaluation comparing the candidate's resume to the target job description.

JOB DESCRIPTION:
${jobDescription}

RESUME TEXT:
${rawText}`;

  const customInstruction = `Evaluate match score (0-100), sub-scores (skills, experience, education, keyword density), matched and missing keywords, skill gaps, actionable bullet rewrites (action verb + metrics + target JD keywords), layout suggestions, and overall feedback.
Verdict must be a single concise summary phrase such as "Strong fit", "Moderate fit", or "Weak fit".`;

  return await callGeminiWithRetry(prompt, fullAnalysisResponseSchema, customInstruction);
}
