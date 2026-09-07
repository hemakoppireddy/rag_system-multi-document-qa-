import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Validates whether the uploaded file format is supported.
 * @param {string} filename
 * @param {string} mimetype
 * @returns {boolean}
 */
export function isSupportedFileType(filename, mimetype = '') {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return true;
  if (ext === '.docx') return true;
  if (mimetype === 'application/pdf') return true;
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
  return false;
}

/**
 * Parses a PDF file and extracts text page-by-page.
 * Preserves explicit page_number for every page.
 * @param {Buffer|string} source - File buffer or file path
 * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number }>}
 */
export async function parsePdf(source) {
  let dataBuffer;
  if (typeof source === 'string') {
    dataBuffer = fs.readFileSync(source);
  } else {
    dataBuffer = source;
  }

  const pages = [];

  // Custom page renderer to capture page-by-page text
  const customPageRender = (pageData) => {
    return pageData.getTextContent().then((textContent) => {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      const cleanText = text.trim();
      const pageNumber = pageData.pageIndex + 1; // 1-indexed
      pages.push({
        pageNumber,
        text: cleanText,
      });

      return cleanText;
    });
  };

  const parsed = await pdfParse(dataBuffer, {
    pagerender: customPageRender,
  });

  // Sort pages by page number in case of async ordering
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  // If for any reason custom renderer didn't capture pages (e.g. single page or empty), fallback
  if (pages.length === 0) {
    const fullText = (parsed.text || '').trim();
    pages.push({
      pageNumber: 1,
      text: fullText,
    });
  }

  return {
    text: parsed.text || pages.map((p) => p.text).join('\n\n'),
    pages,
    pageCount: parsed.numpages || pages.length,
    info: parsed.info || {},
  };
}

/**
 * Parses a DOCX file and extracts text preserving paragraphs and sequential blocks.
 * @param {Buffer|string} source - File buffer or file path
 * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number }>}
 */
export async function parseDocx(source) {
  let buffer;
  if (typeof source === 'string') {
    buffer = fs.readFileSync(source);
  } else {
    buffer = source;
  }

  const result = await mammoth.extractRawText({ buffer });
  const rawText = (result.value || '').trim();

  // DOCX files do not have explicit pagination metadata in raw format.
  // We segment the text into logical blocks / estimated pages (~1500 chars / paragraph groups)
  // while preserving sequential block indexing as fallback page numbers.
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const pages = [];

  if (paragraphs.length === 0) {
    pages.push({
      pageNumber: 1,
      text: rawText,
    });
  } else {
    let currentPageNumber = 1;
    let currentBlockText = '';
    const TARGET_BLOCK_LENGTH = 1200;

    for (const para of paragraphs) {
      if (currentBlockText.length + para.length > TARGET_BLOCK_LENGTH && currentBlockText.length > 0) {
        pages.push({
          pageNumber: currentPageNumber,
          text: currentBlockText.trim(),
        });
        currentPageNumber++;
        currentBlockText = para;
      } else {
        currentBlockText = currentBlockText ? `${currentBlockText}\n\n${para}` : para;
      }
    }

    if (currentBlockText.trim().length > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        text: currentBlockText.trim(),
      });
    }
  }

  return {
    text: rawText,
    pages,
    pageCount: pages.length,
    messages: result.messages || [],
  };
}

/**
 * Unified document parser for both PDF and DOCX formats.
 * @param {Object} options
 * @param {string} options.filename
 * @param {Buffer|string} options.source
 * @param {string} [options.mimetype]
 * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string }>, pageCount: number, fileType: string }>}
 */
export async function parseDocument({ filename, source, mimetype }) {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf' || mimetype === 'application/pdf') {
    const parsed = await parsePdf(source);
    return {
      ...parsed,
      fileType: 'pdf',
    };
  }

  if (ext === '.docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const parsed = await parseDocx(source);
    return {
      ...parsed,
      fileType: 'docx',
    };
  }

  throw new Error(`Unsupported file type: "${filename}". Only .pdf and .docx files are supported.`);
}

export default {
  isSupportedFileType,
  parsePdf,
  parseDocx,
  parseDocument,
};
