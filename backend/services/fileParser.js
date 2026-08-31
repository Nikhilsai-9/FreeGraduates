import { createRequire } from "module";
import fs from "fs/promises";
import mammoth from "mammoth";
import { cleanExtractedText } from "../utils/cleanText.js";

// P7: pdf-parse v1.1.1 internal debug branch throws under ESM if imported via index.js.
// Import the library direct entry point via createRequire.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export async function parseFileToText(filePath, mimeType) {
  const fileBuffer = await fs.readFile(filePath);
  let rawText = "";

  if (mimeType === "application/pdf") {
    const pdfData = await pdfParse(fileBuffer);
    rawText = pdfData.text || "";
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    rawText = result.value || "";
  } else if (mimeType.startsWith("image/")) {
    throw new Error(
      "Image files are not supported for automatic text extraction. Please upload a searchable PDF or DOCX file."
    );
  } else {
    throw new Error(`Unsupported file format (${mimeType}). Please upload a PDF or DOCX.`);
  }

  const cleaned = cleanExtractedText(rawText);

  if (cleaned.length < 100) {
    throw new Error(
      "Could not read text from this file — it may be a scanned image or empty. Please upload a text-selectable PDF or DOCX."
    );
  }

  return cleaned;
}
