import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, Loader2, X, HardDrive } from 'lucide-react';

export function DocumentManager({
  documents = [],
  onUpload,
  onDeleteDocument,
  onClose,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message: string }
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files) => {
    const validFiles = files.filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      return ext === '.pdf' || ext === '.docx';
    });

    if (validFiles.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload only .pdf or .docx files.',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await onUpload(validFiles);
      setUploadStatus({
        type: 'success',
        message: res.message || `Successfully ingested ${validFiles.length} document(s).`,
      });
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Failed to upload document(s).',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '460px',
        maxWidth: '100vw',
        height: '100vh',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff' }}>Knowledge Base</h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Drawer Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '32px 20px',
            textAlign: 'center',
            background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
          />

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: 'var(--accent-primary)',
            }}
          >
            {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
          </div>

          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            {isUploading ? 'Ingesting & Chunking...' : 'Upload PDF or DOCX'}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Drag & drop files or click to browse
          </p>
        </div>

        {/* Upload Feedback Status */}
        {uploadStatus && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              background:
                uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${
                uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
              }`,
              color: uploadStatus.type === 'success' ? '#6ee7b7' : '#fda4af',
            }}
          >
            {uploadStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Documents List */}
        <div style={{ marginTop: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ingested Documents ({documents.length})
            </h3>
          </div>

          {documents.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              No documents uploaded yet. Upload PDFs or DOCX files to query.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background:
                          doc.file_type === 'pdf'
                            ? 'rgba(244, 63, 94, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        color: doc.file_type === 'pdf' ? '#f43f5e' : '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {doc.file_type ? doc.file_type.toUpperCase() : 'DOC'}
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '220px',
                        }}
                      >
                        {doc.filename}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        <span>{doc.page_count || 1} pages</span>
                        <span>•</span>
                        <span>{doc.chunk_count || 0} chunks</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    title="Delete document and remove vector index"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'flex',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentManager;
