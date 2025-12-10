import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadPdf } from '../services/api';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PdfUpload = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Please upload a valid PDF file (max 50MB)');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const response = await uploadPdf(selectedFile, setProgress);
      setSelectedFile(null);
      setProgress(0);
      onUploadSuccess?.(response);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setProgress(0);
  };

  return (
    <div className="pdf-upload">
      {! selectedFile ? (
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload size={48} className="dropzone-icon" />
          {isDragActive ? (
            <p>Drop your PDF here...</p>
          ) : (
            <>
              <p className="dropzone-title">Drag & drop your PDF here</p>
              <p className="dropzone-subtitle">or click to browse (max 50MB)</p>
            </>
          )}
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-info">
            <FileText size={32} />
            <div>
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-size">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>

          {uploading ?  (
            <div className="upload-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{progress}%</span>
            </div>
          ) : (
            <div className="file-actions">
              <button onClick={handleUpload} className="btn btn-primary">
                <CheckCircle size={16} />
                Upload
              </button>
              <button onClick={clearFile} className="btn btn-ghost">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfUpload;