import React from 'react';
import { Bookmark, ExternalLink } from 'lucide-react';

export function CitationBadge({ citation, onClick }) {
  const docName = citation.document_name || citation.documentName || 'Document';
  const pageNum = citation.page_number || citation.pageNumber || 1;

  return (
    <button
      className="citation-pill"
      onClick={() => onClick && onClick(citation)}
      title={`Source: ${docName}, Page ${pageNum} - Click to inspect source snippet`}
    >
      <Bookmark size={12} color="#818cf8" />
      <span>
        {docName} (p. {pageNum})
      </span>
      <ExternalLink size={10} style={{ opacity: 0.6 }} />
    </button>
  );
}

export default CitationBadge;
