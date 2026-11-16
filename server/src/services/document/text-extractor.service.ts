import fs from "fs/promises";
// pdf-parse and mammoth are CJS modules - use createRequire
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

export interface ExtractedText {
  text: string;
  pageCount?: number;
}

export const extractText = async (filePath: string, mimeType: string): Promise<ExtractedText> => {
  if (mimeType === "application/pdf") {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return { text: data.text, pageCount: data.numpages };
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  }

  if (mimeType === "text/plain") {
    const text = await fs.readFile(filePath, "utf-8");
    return { text };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
};
