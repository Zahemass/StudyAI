import { useState, useEffect } from 'react';
import { RefreshCw, Loader, CheckCircle, XCircle, HelpCircle, RotateCcw } from 'lucide-react';
import { generateQuiz, getQuiz } from '../../services/api';
import toast from 'react-hot-toast';

const QuizTab = ({ documentId }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState([]);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [documentId]);

  const fetchQuiz = async () => {
    try {
      const response = await getQuiz(documentId);
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    try {
      toast.loading('Generating quiz questions...', { id: 'quiz' });
      const response = await generateQuiz(documentId, 10);
      setQuestions(response.data.questions || []);
      resetQuiz();
      toast.success('Quiz generated! ', { id: 'quiz' });
    } catch (error) {
      toast.error('Failed to generate quiz', { id: 'quiz' });
    } finally {
      setGenerating(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswered([]);
    setQuizComplete(false);
  };

  const handleSelectAnswer = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;
    
    const correct = selectedAnswer === questions[currentQuestion].correct_answer;
    if (correct) setScore(score + 1);
    
    setAnswered([...answered, { 
      questionIndex: currentQuestion, 
      selected: selectedAnswer, 
      correct 
    }]);
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <Loader className="spinner" size={32} />
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="tab-empty-state">
        <div className="empty-icon">❓</div>
        <h3>Generate Quiz</h3>
        <p>Test your knowledge with AI-generated multiple choice questions.</p>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleGenerateQuiz}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader className="spinner" size={20} />
              Generating Quiz...
            </>
          ) : (
            <>
              <HelpCircle size={20} />
              Generate Quiz (10 Questions)
            </>
          )}
        </button>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-complete">
        <div className="quiz-result-card">
          <div className="result-icon">
            {percentage >= 70 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
          </div>
          <h2>Quiz Complete!</h2>
          <div className="result-score">
            <span className="score">{score}</span>
            <span className="divider">/</span>
            <span className="total">{questions.length}</span>
          </div>
          <div className="result-percentage">{percentage}%</div>
          <p className="result-message">
            {percentage >= 70
              ? 'Excellent! You have a great understanding of the material!'
              : percentage >= 50
              ? 'Good job! Keep studying to improve further.'
              : 'Keep learning! Review the notes and try again.'}
          </p>
          <div className="result-actions">
            <button className="btn btn-primary" onClick={resetQuiz}>
              <RotateCcw size={18} />
              Retake Quiz
            </button>
            <button className="btn btn-secondary" onClick={handleGenerateQuiz} disabled={generating}>
              <RefreshCw size={18} />
              New Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const options = [
    { key: 'A', value: question.option_a },
    { key: 'B', value: question.option_b },
    { key: 'C', value: question.option_c },
    { key: 'D', value: question.option_d },
  ];

  return (
    <div className="quiz-tab">
      {/* Progress */}
      <div className="quiz-progress">
        <div className="progress-text">
          Question {currentQuestion + 1} of {questions.length}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="score-display">Score: {score}/{answered.length}</div>
      </div>

      {/* Question Card */}
      <div className="question-card">
        <div className="difficulty-badge" data-difficulty={question.difficulty}>
          {question.difficulty}
        </div>
        <h3 className="question-text">{question.question}</h3>

        <div className="options-list">
          {options.map((option) => {
            let optionClass = 'option';
            if (selectedAnswer === option.key) optionClass += ' selected';
            if (showResult) {
              if (option.key === question.correct_answer) {
                optionClass += ' correct';
              } else if (selectedAnswer === option.key) {
                optionClass += ' incorrect';
              }
            }

            return (
              <button
                key={option.key}
                className={optionClass}
                onClick={() => handleSelectAnswer(option.key)}
                disabled={showResult}
              >
                <span className="option-key">{option.key}</span>
                <span className="option-text">{option.value}</span>
                {showResult && option.key === question.correct_answer && (
                  <CheckCircle className="option-icon correct" size={20} />
                )}
                {showResult && selectedAnswer === option.key && option.key !== question.correct_answer && (
                  <XCircle className="option-icon incorrect" size={20} />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && question.explanation && (
          <div className="explanation">
            <strong>💡 Explanation:</strong> {question.explanation}
          </div>
        )}

        {/* Actions */}
        <div className="question-actions">
          {! showResult ?  (
            <button
              className="btn btn-primary"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleNextQuestion}>
              {currentQuestion < questions.length - 1 ?  'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizTab;