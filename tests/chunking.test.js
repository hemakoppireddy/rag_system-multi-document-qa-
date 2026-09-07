import { chunkText, chunkDocument } from '../src/services/chunking.js';

describe('Text Chunking Service', () => {
  describe('chunkText', () => {
    test('should split long text into overlapping chunks', () => {
      const sampleText = 'Sentence one is about vacation policy. Sentence two is about sick leave. Sentence three is about remote work and equipment stipends. Sentence four describes company holidays and wellness days.';
      const metadata = {
        documentId: 'doc-123',
        filename: 'handbook.pdf',
        pageNumber: 1,
      };

      const chunks = chunkText(sampleText, metadata, 80, 20);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);

      // Verify metadata attached to all chunks
      for (const chunk of chunks) {
        expect(chunk.metadata.document_id).toBe('doc-123');
        expect(chunk.metadata.filename).toBe('handbook.pdf');
        expect(chunk.metadata.page_number).toBe(1);
        expect(typeof chunk.text).toBe('string');
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });

    test('should handle short text as single chunk without error', () => {
      const shortText = 'Short snippet.';
      const chunks = chunkText(shortText, { documentId: 'doc-1', filename: 'test.pdf', pageNumber: 1 }, 500, 50);

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe('Short snippet.');
      expect(chunks[0].metadata.page_number).toBe(1);
    });

    test('should return empty array for empty or whitespace text', () => {
      expect(chunkText('', {})).toEqual([]);
      expect(chunkText('   \n  \t ', {})).toEqual([]);
      expect(chunkText(null, {})).toEqual([]);
    });
  });

  describe('chunkDocument', () => {
    test('should chunk multi-page document while preserving respective page numbers', () => {
      const pages = [
        {
          pageNumber: 1,
          text: 'Page 1 contains the policy for full-time employees. Full-time employees receive 20 days paid time off.',
        },
        {
          pageNumber: 2,
          text: 'Page 2 contains remote work guidelines. Engineering teams can work remotely 3 days a week.',
        },
      ];

      const chunks = chunkDocument({
        documentId: 'doc-multi-page',
        filename: 'policy.pdf',
        pages,
        chunkSize: 200,
        overlap: 40,
      });

      expect(chunks.length).toBe(2);

      // Verify Page 1 chunk
      expect(chunks[0].metadata.document_id).toBe('doc-multi-page');
      expect(chunks[0].metadata.filename).toBe('policy.pdf');
      expect(chunks[0].metadata.page_number).toBe(1);
      expect(chunks[0].text).toContain('20 days paid time off');

      // Verify Page 2 chunk
      expect(chunks[1].metadata.document_id).toBe('doc-multi-page');
      expect(chunks[1].metadata.filename).toBe('policy.pdf');
      expect(chunks[1].metadata.page_number).toBe(2);
      expect(chunks[1].text).toContain('work remotely 3 days');
    });
  });
});
