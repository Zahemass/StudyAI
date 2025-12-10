import { useState } from 'react';
import { RefreshCw, Loader, FileText, Download } from 'lucide-react';
import { generateNotes } from '../../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const NotesTab = ({ document, onUpdate }) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerateNotes = async () => {
    setGenerating(true);
    try {
      toast.loading('Generating notes... This may take a minute.', { id: 'notes' });
      await generateNotes(document.id);
      toast.success('Notes generated successfully!', { id: 'notes' });
      onUpdate();
    } catch (error) {
      toast.error('Failed to generate notes', { id: 'notes' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!document.notes) return;
    
    const blob = new Blob([document.notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.filename.replace('.pdf', '')}_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Notes downloaded!');
  };

  if (!document.notes_generated || ! document.notes) {
    return (
      <div className="tab-empty-state">
        <div className="empty-icon">📝</div>
        <h3>Generate Study Notes</h3>
        <p>AI will create comprehensive, well-organized notes from your document.</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleGenerateNotes}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader className="spinner" size={20} />
              Generating Notes...
            </>
          ) : (
            <>
              <FileText size={20} />
              Generate Notes
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="notes-tab">
      <div className="notes-header">
        <h2>📝 Study Notes</h2>
        <div className="notes-actions">
          <button
            className="btn btn-secondary"
            onClick={handleDownload}
          >
            <Download size={18} />
            Download
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleGenerateNotes}
            disabled={generating}
          >
            {generating ? (
              <Loader className="spinner" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Regenerate
          </button>
        </div>
      </div>
      
      <div className="notes-content">
        <ReactMarkdown>{document.notes}</ReactMarkdown>
      </div>
    </div>
  );
};

export default NotesTab;