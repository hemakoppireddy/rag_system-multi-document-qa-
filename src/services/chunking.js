import config from '../config.js';

/**
 * Finds a natural break point (paragraph or sentence boundary) near the target index.
 * @param {string} text
 * @param {number} targetIndex
 * @param {number} maxLookahead
 * @returns {number}
 */
function findNaturalBreakPoint(text, targetIndex, maxLookahead = 80) {
  if (targetIndex >= text.length) {
    return text.length;
  }

  // Look ahead for paragraph break
  const paraBreak = text.indexOf('\n\n', targetIndex);
  if (paraBreak !== -1 && paraBreak - targetIndex <= maxLookahead) {
    return paraBreak + 2;
  }

  // Look ahead for sentence boundary (. ! ?)
  const searchSlice = text.slice(targetIndex, targetIndex + maxLookahead);
  const sentenceMatch = searchSlice.match(/[\.\!\?]\s+/);
  if (sentenceMatch && sentenceMatch.index !== undefined) {
    return targetIndex + sentenceMatch.index + sentenceMatch[0].length;
  }

  // Look ahead for line break
  const lineBreak = text.indexOf('\n', targetIndex);
  if (lineBreak !== -1 && lineBreak - targetIndex <= maxLookahead) {
    return lineBreak + 1;
  }

  // Look ahead for space
  const spaceIndex = text.indexOf(' ', targetIndex);
  if (spaceIndex !== -1 && spaceIndex - targetIndex <= maxLookahead) {
    return spaceIndex + 1;
  }

  // Fallback to strict cut
  return targetIndex;
}

/**
 * Splits text into overlapping chunks while preserving metadata.
 * @param {string} text - Raw text to split
 * @param {Object} metadata - Metadata object { documentId, filename, pageNumber }
 * @param {number} [chunkSize] - Target character length for a chunk
 * @param {number} [overlap] - Number of characters to overlap with previous chunk
 * @returns {Array<{ id: string, text: string, metadata: object }>}
 */
export function chunkText(text, metadata = {}, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const cleanText = text.trim();
  if (cleanText.length === 0) {
    return [];
  }

  if (overlap >= chunkSize) {
    overlap = Math.floor(chunkSize * 0.2); // Safeguard against invalid overlap
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    let rawEndIndex = startIndex + chunkSize;
    let endIndex = findNaturalBreakPoint(cleanText, rawEndIndex, 60);

    if (endIndex > cleanText.length) {
      endIndex = cleanText.length;
    }

    const chunkContent = cleanText.slice(startIndex, endIndex).trim();

    if (chunkContent.length > 0) {
      const docId = metadata.documentId || metadata.document_id || 'unknown';
      const pageNum = metadata.pageNumber || metadata.page_number || 1;
      const filename = metadata.filename || 'unknown';

      chunks.push({
        id: `${docId}-p${pageNum}-c${chunkIndex}`,
        text: chunkContent,
        metadata: {
          document_id: docId,
          documentId: docId,
          filename: filename,
          page_number: pageNum,
          pageNumber: pageNum,
          chunk_index: chunkIndex,
          char_count: chunkContent.length,
          start_offset: startIndex,
          end_offset: endIndex,
        },
      });
      chunkIndex++;
    }

    // Move next start index forward by (endIndex - overlap)
    if (endIndex >= cleanText.length) {
      break;
    }

    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
}

/**
 * Splits an entire parsed document (with pages) into chunks preserving exact page numbers.
 * @param {Object} options
 * @param {string} options.documentId - Unique document ID
 * @param {string} options.filename - Original file name
 * @param {Array<{ pageNumber: number, text: string }>} options.pages - Array of pages
 * @param {number} [options.chunkSize] - Target chunk size
 * @param {number} [options.overlap] - Target overlap
 * @returns {Array<{ id: string, text: string, metadata: object }>}
 */
export function chunkDocument({
  documentId,
  filename,
  pages = [],
  chunkSize = config.chunkSize,
  overlap = config.chunkOverlap,
}) {
  const allChunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(
      page.text,
      {
        documentId,
        filename,
        pageNumber: page.pageNumber,
      },
      chunkSize,
      overlap
    );

    for (const chunk of pageChunks) {
      chunk.id = `${documentId}-chunk-${globalChunkIndex}`;
      chunk.metadata.global_chunk_index = globalChunkIndex;
      chunk.metadata.text = chunk.text; // Embed text in metadata payload for vector DB
      allChunks.push(chunk);
      globalChunkIndex++;
    }
  }

  return allChunks;
}

export default {
  chunkText,
  chunkDocument,
};
