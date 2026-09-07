import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as pdfjsModule from 'pdfjs-dist/legacy/build/pdf.js';

const getDocumentFn =
  pdfjsModule.getDocument ||
  pdfjsModule.default?.getDocument ||
  (pdfjsModule.default && pdfjsModule.default.default?.getDocument);

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

  const uint8Array = new Uint8Array(dataBuffer);

  const getDoc = getDocumentFn || pdfjsModule.getDocument || pdfjsModule.default?.getDocument;
  if (typeof getDoc !== 'function') {
    throw new Error('PDF.js getDocument function could not be loaded.');
  }

  const loadingTask = getDoc({
    data: uint8Array,
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pages = [];
  const allText = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = textContent.items || [];
    let pageText = items.map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim();

    pages.push({
      pageNumber: pageNum,
      text: pageText,
    });
    allText.push(pageText);
  }

  return {
    text: allText.join('\n\n'),
    pages,
    pageCount: numPages,
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

  // DOCX segmentation into logical blocks / estimated pages
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
