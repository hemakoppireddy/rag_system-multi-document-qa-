import path from 'path';
import { fileURLToPath } from 'url';
import { parseDocument, parsePdf, parseDocx, isSupportedFileType } from '../src/services/document.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

describe('Document Parser Service', () => {
  const pdfPath = path.join(fixturesDir, 'employee_handbook.pdf');
  const docxPath = path.join(fixturesDir, 'contractor_guidelines.docx');

  describe('File type validation', () => {
    test('should identify supported file types', () => {
      expect(isSupportedFileType('sample.pdf')).toBe(true);
      expect(isSupportedFileType('sample.docx')).toBe(true);
      expect(isSupportedFileType('SAMPLE.PDF')).toBe(true);
      expect(isSupportedFileType('file.txt')).toBe(false);
      expect(isSupportedFileType('image.png')).toBe(false);
    });
  });

  describe('PDF Parsing & Page Preservation', () => {
    test('should extract multi-page text and preserve explicit page_number for each page', async () => {
      const parsed = await parsePdf(pdfPath);

      expect(parsed).toBeDefined();
      expect(parsed.pageCount).toBe(2);
      expect(Array.isArray(parsed.pages)).toBe(true);
      expect(parsed.pages.length).toBe(2);

      // Verify Page 1
      expect(parsed.pages[0].pageNumber).toBe(1);
      expect(parsed.pages[0].text).toContain('20 days of paid time off');
      expect(parsed.pages[0].text).toContain('carry over up to 5 days');

      // Verify Page 2
      expect(parsed.pages[1].pageNumber).toBe(2);
      expect(parsed.pages[1].text).toContain('work remotely up to 3 days');
      expect(parsed.pages[1].text).toContain('$500');
    });
  });

  describe('DOCX Parsing', () => {
    test('should extract structured text and paragraphs from docx', async () => {
      const parsed = await parseDocx(docxPath);

      expect(parsed).toBeDefined();
      expect(parsed.text.length).toBeGreaterThan(0);
      expect(parsed.pages.length).toBeGreaterThan(0);
      expect(parsed.text).toContain('Contractors operate on hourly billing');
      expect(parsed.text).toContain('corporate VPN');
    });
  });

  describe('Unified Document Parser', () => {
    test('should parse PDF using unified interface', async () => {
      const result = await parseDocument({
        filename: 'employee_handbook.pdf',
        source: pdfPath,
      });

      expect(result.fileType).toBe('pdf');
      expect(result.pages.length).toBe(2);
      expect(result.pages[0].pageNumber).toBe(1);
    });

    test('should parse DOCX using unified interface', async () => {
      const result = await parseDocument({
        filename: 'contractor_guidelines.docx',
        source: docxPath,
      });

      expect(result.fileType).toBe('docx');
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.text).toContain('Contractors operate on hourly billing');
    });

    test('should reject unsupported file extensions', async () => {
      await expect(
        parseDocument({
          filename: 'unsupported.exe',
          source: Buffer.from('test'),
        })
      ).rejects.toThrow(/Unsupported file type/);
    });
  });
});
