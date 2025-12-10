import { useState, useRef, useEffect } from 'react';
import { 
  Headphones, 
  Loader, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  FileText
} from 'lucide-react';
import { generatePodcast } from '../../services/api';
import toast from 'react-hot-toast';

const PodcastTab = ({ document, onUpdate }) => {
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef(null);
  const transcriptRef = useRef(null);

  useEffect(() => {
    // Auto-refresh if podcast not ready
    if (!document.podcast_generated || !document.podcast_url) {
      const interval = setInterval(() => {
        console.log('🔄 Checking if podcast is ready...');
        onUpdate();
      }, 3000);

      const timeout = setTimeout(() => {
        setChecking(false);
        clearInterval(interval);
      }, 180000); // 3 minutes

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else {
      setChecking(false);
    }
  }, [document.podcast_generated, document.podcast_url, onUpdate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setTotalDuration(audio.duration);
    const handleEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [document?.podcast_url]);

  const handleGeneratePodcast = async () => {
    setGenerating(true);
    setChecking(true);
    try {
      toast.loading('Generating AI-optimized podcast...', { id: 'podcast' });
      await generatePodcast(document.id);
      toast.success('Podcast generated! ', { id: 'podcast' });
      onUpdate();
    } catch (error) {
      toast.error('Failed to generate podcast', { id: 'podcast' });
      setChecking(false);
    } finally {
      setGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(totalDuration, currentTime + seconds));
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = ! muted;
    setMuted(!muted);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!document.podcast_url) return;
    const a = window.document.createElement('a');
    a.href = document.podcast_url;
    a.download = `${document.filename.replace('.pdf', '')}_podcast.mp3`;
    a.click();
    toast.success('Downloading podcast...');
  };

  // ⭐ FIXED: Use podcast_script for transcript highlighting
  const getHighlightedTranscript = () => {
    // Use podcast script (the actual spoken content) instead of document text
    const text = document.podcast_script;
    
    if (!text) return null;
    
    const progress = currentTime / totalDuration;
    const currentCharIndex = Math.floor(progress * text.length);
    
    // Split text into sentences for better highlighting
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let charCount = 0;
    
    return sentences.map((sentence, idx) => {
      const sentenceStart = charCount;
      const sentenceEnd = charCount + sentence.length;
      charCount = sentenceEnd;
      
      const isActive = currentCharIndex >= sentenceStart && currentCharIndex < sentenceEnd;
      
      return (
        <span 
          key={idx}
          className={`transcript-sentence ${isActive ? 'active' : ''}`}
        >
          {sentence}
        </span>
      );
    });
  };

  if (! document.podcast_generated || ! document.podcast_url) {
    return (
      <div className="podcast-tab">
        <div className="tab-empty-state">
          {checking ? (
            <>
              <Loader className="spinner" size={48} />
              <h3>Generating Podcast...</h3>
              <p>AI is analyzing your content and creating an optimized podcast.</p>
              <div className="progress-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <p className="loading-hint">This may take 1-3 minutes. You can switch tabs and come back.</p>
            </>
          ) : (
            <>
              <div className="empty-icon">🎧</div>
              <h3>Generate AI Podcast</h3>
              <p>Our AI will analyze your content and create a podcast with the perfect duration—from 2 to 15 minutes based on complexity and depth.</p>
              
              <button
                className="btn btn-primary btn-lg"
                onClick={handleGeneratePodcast}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader className="spinner" size={20} />
                    Generating Podcast...
                  </>
                ) : (
                  <>
                    <Headphones size={20} />
                    Generate AI-Optimized Podcast
                  </>
                )}
              </button>
              <p className="hint-text">✨ AI determines optimal duration automatically</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="podcast-tab">
      <div className="podcast-player">
        <audio ref={audioRef} src={document.podcast_url} preload="metadata" />
        
        <div className="podcast-artwork">
          <div className="artwork-icon">
            <Headphones size={64} />
          </div>
          <div className="artwork-waves">
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={`wave ${playing ? 'playing' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
        
        <div className="podcast-info">
          <h3>{document.filename.replace('.pdf', '').replace('.docx', '').replace('.pptx', '')}</h3>
          <p>AI-Generated Podcast</p>
        </div>
        
        {/* Progress Bar */}
        <div className="podcast-progress" onClick={handleSeek}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="podcast-controls">
          <button className="control-btn" onClick={() => skip(-10)} title="Rewind 10s">
            <SkipBack size={24} />
          </button>
          
          <button className="control-btn play-btn" onClick={togglePlay}>
            {playing ? <Pause size={32} /> : <Play size={32} />}
          </button>
          
          <button className="control-btn" onClick={() => skip(10)} title="Forward 10s">
            <SkipForward size={24} />
          </button>
        </div>
        
        {/* Secondary Controls */}
        <div className="podcast-secondary-controls">
          <button className="btn btn-ghost btn-sm" onClick={toggleMute}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button 
            className={`btn btn-ghost btn-sm ${showTranscript ? 'active' : ''}`}
            onClick={() => setShowTranscript(!showTranscript)}
            disabled={!document.podcast_script}
          >
            <FileText size={18} />
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleDownload}>
            <Download size={18} />
            Download
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleGeneratePodcast}
            disabled={generating}
          >
            <RefreshCw size={18} />
            Regenerate
          </button>
        </div>
      </div>

      {/* ⭐ Live Transcript - Shows podcast script (spoken content) */}
      {showTranscript && document.podcast_script && (
        <div className="podcast-transcript" ref={transcriptRef}>
          <div className="transcript-header">
            <FileText size={20} />
            <h4>Podcast Transcript</h4>
            <span className="transcript-progress">{Math.floor(progress)}%</span>
          </div>
          <div className="transcript-content">
            {getHighlightedTranscript()}
          </div>
        </div>
      )}

      {/* ⭐ Show message if no script available */}
      {showTranscript && !document.podcast_script && (
        <div className="podcast-transcript">
          <div className="transcript-header">
            <FileText size={20} />
            <h4>Transcript Not Available</h4>
          </div>
          <div className="transcript-content" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <p>Transcript not available for this podcast.</p>
            <p>Try regenerating the podcast to include the transcript.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodcastTab;