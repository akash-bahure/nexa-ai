export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
}

const CHUNK_SIZE = 800;    // characters
const CHUNK_OVERLAP = 150; // overlap characters

export const chunkText = (text: string, pageCount?: number): TextChunk[] => {
  const chunks: TextChunk[] = [];
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!cleanText) return chunks;

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + CHUNK_SIZE, cleanText.length);
    const content = cleanText.slice(start, end).trim();

    if (content.length > 20) {
      const pageNumber = pageCount
        ? Math.ceil(((start / cleanText.length) * pageCount) + 1)
        : undefined;

      chunks.push({ content, chunkIndex, pageNumber });
      chunkIndex++;
    }

    if (end >= cleanText.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
};
