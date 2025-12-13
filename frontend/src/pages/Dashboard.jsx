// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Loader, Plus, Trash2, BookOpen, Youtube, File, Presentation, Table } from 'lucide-react';
import { getDocuments, uploadDocument, uploadYouTube, deleteDocument } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState('document'); // 'document' or 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await getDocuments();
      setDocuments(response.data.documents || []);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedExtensions = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'md', 'xlsx', 'xls', 'csv'];
    const extension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      toast.error('File type not supported.Allowed: PDF, DOCX, PPTX, TXT, XLSX, CSV');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadDocument(file);
      toast.success(`${extension.toUpperCase()} uploaded successfully! `);
      fetchDocuments();
      
      if (response.data.document?.id) {
        navigate(`/study/${response.data.document.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleYouTubeUpload = async (e) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setUploading(true);
    try {
      const response = await uploadYouTube(youtubeUrl);
      toast.success('YouTube video processed successfully! ');
      setYoutubeUrl('');
      fetchDocuments();
      
      if (response.data.document?.id) {
        navigate(`/study/${response.data.document.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'YouTube processing failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (! confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocument(id);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (sourceType) => {
    switch (sourceType) {
      case 'youtube':
        return <Youtube size={32} />;
      case 'pptx':
        return <Presentation size={32} />;
      case 'docx': 
        return <FileText size={32} />;
      case 'xlsx':
        return <Table size={32} />;
      case 'txt':
      case 'csv':
        return <File size={32} />;
      default: 
        return <FileText size={32} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader className="spinner" size={48} />
        <p>Loading your documents...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>📚 My Study Materials</h1>
          <p>Upload documents or YouTube videos and start learning with AI-powered tools</p>
        </div>
      </div>

      {/* Upload Type Toggle */}
      <div className="upload-type-toggle">
        <button
          className={`toggle-btn ${activeUploadType === 'document' ? 'active' :  ''}`}
          onClick={() => setActiveUploadType('document')}
          disabled={uploading}
        >
          <FileText size={20} />
          Upload Document
        </button>
        <button
          className={`toggle-btn ${activeUploadType === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveUploadType('youtube')}
          disabled={uploading}
        >
          <Youtube size={20} />
          YouTube URL
        </button>
      </div>

      {/* Upload Area */}
      {activeUploadType === 'document' ?  (
        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.xlsx,.xls,.csv"
            onChange={handleFileInput}
            id="file-upload"
            hidden
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="upload-label">
            {uploading ? (
              <>
                <Loader className="spinner" size={48} />
                <h3>Uploading & Processing...</h3>
                <p>This may take a moment</p>
              </>
            ) : (
              <>
                <div className="upload-icon">
                  <Upload size={48} />
                </div>
                <h3>Upload Document</h3>
                <p>Drag and drop or click to browse</p>
                <span className="upload-hint">
                  Supported:  PDF, DOCX, PPTX, TXT, XLSX, CSV (Max 50MB)
                </span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="youtube-upload-zone">
          <form onSubmit={handleYouTubeUpload} className="youtube-form">
            <div className="youtube-icon">
              <Youtube size={48} />
            </div>
            <h3>Paste YouTube Video URL</h3>
            <p>Works with any video - uses AI transcription</p>
            <div className="youtube-input-group">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={uploading}
                className="youtube-input"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading || !youtubeUrl.trim()}
              >
                {uploading ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add Video
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length > 0 ?  (
        <div className="documents-section">
          <h2>Your Documents ({documents.length})</h2>
          <div className="documents-grid">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="document-card"
                onClick={() => navigate(`/study/${doc.id}`)}
              >
                <div className="document-icon">
                  {getFileIcon(doc.source_type)}
                </div>
                <div className="document-info">
                  <h3>{doc.filename}</h3>
                  <div className="document-meta">
                    <span>{formatDate(doc.created_at)}</span>
                    <span>•</span>
                    <span>
  {doc.source_type === 'youtube'
    ? 'YouTube'
    : doc.file_size
      ? formatFileSize(doc.file_size)
      : 'PDF'}
</span>

                  </div>
                  <div className="document-status">
                    {doc.notes_generated && <span className="status-badge">📝 Notes</span>}
                    {doc.podcast_generated && <span className="status-badge">🎧 Podcast</span>}
                  </div>
                </div>
                <div className="document-actions">
                  <button
                    className="btn-icon btn-study"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/study/${doc.id}`);
                    }}
                    title="Study"
                  >
                    <BookOpen size={18} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={(e) => handleDelete(doc.id, e)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No documents yet</h3>
          <p>Upload your first document or add a YouTube video to start learning! </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;