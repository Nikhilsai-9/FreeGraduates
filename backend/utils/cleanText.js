/**
 * Normalizes text extracted from PDF / DOCX
 * - Strips weird unicode bullet points and replacement characters
 * - Collapses repeated whitespace and tabs
 * - Collapses 3+ consecutive newlines down to 2
 */
export function cleanExtractedText(text) {
  if (!text || typeof text !== "string") return "";

  return text
    // Normalize unicode bullets and special symbols to standard characters
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25CB\u25AA\u25AB\uF0A7\uF0B7]/g, " • ")
    // Replace non-breaking spaces and zero-width spaces
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
    // Normalize quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    // Replace control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Collapse multiple horizontal spaces/tabs
    .replace(/[^\S\r\n]+/g, " ")
    // Collapse 3 or more newlines to double newline
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
