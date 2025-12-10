// frontend/src/pages/Home.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, Video, HelpCircle, TrendingUp } from 'lucide-react';
import '../styles/Study.css';
const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Transform Your PDFs into <span className="highlight">Learning Videos</span></h1>
          <p>
            Upload any study material and our AI will create bite-sized video lessons 
            with Q&A to help you learn faster and retain more.
          </p>
          <div className="hero-buttons">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
                <Link to="/login" className="btn btn-secondary">Login</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-graphic">
            <div className="pdf-icon">📄</div>
            <div className="arrow">→</div>
            <div className="video-icon">🎬</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Upload size={32} />
            </div>
            <h3>1.Upload PDF</h3>
            <p>Upload any study material - textbooks, notes, research papers</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Video size={32} />
            </div>
            <h3>2.AI Creates Videos</h3>
            <p>Our AI breaks content into chunks and generates short explainer videos</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <HelpCircle size={32} />
            </div>
            <h3>3.Test Your Knowledge</h3>
            <p>Answer auto-generated questions after each video to reinforce learning</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <TrendingUp size={32} />
            </div>
            <h3>4.Track Progress</h3>
            <p>Monitor your learning journey and revisit any topic anytime</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;