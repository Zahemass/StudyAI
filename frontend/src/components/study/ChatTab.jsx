import { useState, useEffect, useRef } from 'react';
import { Send, Loader, Trash2, MessageSquare, Bot, User } from 'lucide-react';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../../services/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

const ChatTab = ({ documentId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const response = await getChatHistory(documentId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to UI immediately
    const tempUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    
    setSending(true);
    try {
      const response = await sendChatMessage(documentId, userMessage);
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to send message');
      // Remove the temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
      setInput(userMessage);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (! confirm('Are you sure you want to clear the chat history?')) return;
    
    try {
      await clearChatHistory(documentId);
      setMessages([]);
      toast.success('Chat cleared');
    } catch (error) {
      toast.error('Failed to clear chat');
    }
  };

  const suggestedQuestions = [
    "What are the main topics covered? ",
    "Explain the key concepts in simple terms",
    "What are the most important points to remember?",
    "Can you give me a summary? ",
  ];

  if (loading) {
    return (
      <div className="tab-loading">
        <Loader className="spinner" size={32} />
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-tab">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={20} />
          <span>Ask Questions About Your Document</span>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={handleClearChat}>
            <Trash2 size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>Start a Conversation</h3>
            <p>Ask any question about your document. The AI will answer based only on the document content.</p>
            <div className="suggested-questions">
              <p className="suggested-label">Try asking:</p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  className="suggested-btn"
                  onClick={() => setInput(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`chat-message ${message.role}`}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {sending && (
              <div className="chat-message assistant">
                <div className="message-avatar">
                  <Bot size={20} />
                </div>
                <div className="message-content typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the document..."
          disabled={sending}
          className="chat-input"
        />
        <button
          type="submit"
          className="btn btn-primary btn-send"
          disabled={! input.trim() || sending}
        >
          {sending ? <Loader className="spinner" size={20} /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};

export default ChatTab;