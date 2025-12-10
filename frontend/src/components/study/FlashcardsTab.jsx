import { useState, useEffect } from 'react';
import { RefreshCw, Loader, Layers, ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { generateFlashcards, getFlashcards } from '../../services/api';
import toast from 'react-hot-toast';

const FlashcardsTab = ({ documentId }) => {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState([]);

  useEffect(() => {
    fetchFlashcards();
  }, [documentId]);

  const fetchFlashcards = async () => {
    try {
      const response = await getFlashcards(documentId);
      setFlashcards(response.data.flashcards || []);
    } catch (error) {
      console.error('Failed to fetch flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    setGenerating(true);
    try {
      toast.loading('Generating flashcards...', { id: 'flashcards' });
      const response = await generateFlashcards(documentId, 15);
      setFlashcards(response.data.flashcards || []);
      setCurrentIndex(0);
      setFlipped(false);
      setReviewed([]);
      toast.success('Flashcards generated! ', { id: 'flashcards' });
    } catch (error) {
      toast.error('Failed to generate flashcards', { id: 'flashcards' });
    } finally {
      setGenerating(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
    if (!flipped && ! reviewed.includes(currentIndex)) {
      setReviewed([...reviewed, currentIndex]);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
    toast.success('Cards shuffled!');
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setReviewed([]);
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <Loader className="spinner" size={32} />
        <p>Loading flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="tab-empty-state">
        <div className="empty-icon">🎴</div>
        <h3>Generate Flashcards</h3>
        <p>Create flashcards to help memorize key concepts and definitions.</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleGenerateFlashcards}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader className="spinner" size={20} />
              Generating Flashcards...
            </>
          ) : (
            <>
              <Layers size={20} />
              Generate Flashcards
            </>
          )}
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((reviewed.length / flashcards.length) * 100).toFixed(0);

  return (
    <div className="flashcards-tab">
      {/* Header */}
      <div className="flashcards-header">
        <div className="flashcards-progress">
          <span>Card {currentIndex + 1} of {flashcards.length}</span>
          <span className="progress-divider">•</span>
          <span>{reviewed.length} reviewed ({progress}%)</span>
        </div>
        <div className="flashcards-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleShuffle}>
            <Shuffle size={16} />
            Shuffle
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleGenerateFlashcards}
            disabled={generating}
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flashcards-progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div className="flashcard-container">
        <div 
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={handleFlip}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <span className="card-label">Question / Term</span>
              <p className="card-content">{currentCard.front}</p>
              <span className="card-hint">Click to flip</span>
            </div>
            <div className="flashcard-back">
              <span className="card-label">Answer / Definition</span>
              <p className="card-content">{currentCard.back}</p>
              {currentCard.category && (
                <span className="card-category">{currentCard.category}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flashcard-navigation">
        <button
          className="btn btn-secondary"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={20} />
          Previous
        </button>
        <div className="card-dots">
          {flashcards.slice(
            Math.max(0, currentIndex - 3),
            Math.min(flashcards.length, currentIndex + 4)
          ).map((_, i) => {
            const actualIndex = Math.max(0, currentIndex - 3) + i;
            return (
              <span
                key={actualIndex}
                className={`dot ${actualIndex === currentIndex ? 'active' : ''} ${reviewed.includes(actualIndex) ? 'reviewed' : ''}`}
                onClick={() => {
                  setCurrentIndex(actualIndex);
                  setFlipped(false);
                }}
              />
            );
          })}
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default FlashcardsTab;