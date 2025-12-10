import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  HelpCircle, 
  MessageSquare, 
  Layers, 
  Headphones, 
  Loader 
} from 'lucide-react';
import { getDocument } from '../services/api';
import NotesTab from '../components/study/NotesTab';
import QuizTab from '../components/study/QuizTab';
import ChatTab from '../components/study/ChatTab';
import FlashcardsTab from '../components/study/FlashcardsTab';
import PodcastTab from '../components/study/PodcastTab';
import toast from 'react-hot-toast';
import '../styles/Study.css';

const Study = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await getDocument(documentId);
      setDocument(response.data.document);
    } catch (error) {
      toast.error('Failed to load document');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'notes', label: 'Notes', icon: FileText, emoji: '📝' },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, emoji: '❓' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, emoji: '💬' },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, emoji: '🎴' },
    { id: 'podcast', label: 'Podcast', icon: Headphones, emoji: '🎧' },
  ];

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader className="spinner" size={48} />
        <p>Loading study materials...</p>
      </div>
    );
  }

  return (
    <div className="study-page">
      {/* Header */}
      <div className="study-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
        <div className="study-title">
          <h1>{document?.filename}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-emoji">{tab.emoji}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'notes' && (
          <NotesTab document={document} onUpdate={fetchDocument} />
        )}
        {activeTab === 'quiz' && (
          <QuizTab documentId={documentId} />
        )}
        {activeTab === 'chat' && (
          <ChatTab documentId={documentId} />
        )}
        {activeTab === 'flashcards' && (
          <FlashcardsTab documentId={documentId} />
        )}
        {activeTab === 'podcast' && (
          <PodcastTab document={document} onUpdate={fetchDocument} />
        )}
      </div>
    </div>
  );
};

export default Study;