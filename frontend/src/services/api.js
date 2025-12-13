// frontend/src/services/api.js
import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data:  { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ============================================
// AUTH
// ============================================
export const login = (email, password) => 
  api.post('/auth/login', { email, password });

export const register = (email, password, name) => 
  api.post('/auth/register', { email, password, name });

// ============================================
// DOCUMENTS
// ============================================
export const getDocuments = () => 
  api.get('/documents');

export const getDocument = (id) => 
  api.get(`/documents/${id}`);

export const deleteDocument = (id) => 
  api.delete(`/documents/${id}`);

// Upload PDF
// Change uploadDocument to accept any file type
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);  // Changed from 'pdf' to 'file'
  
  return api.post('/upload/document', formData, {  // Changed from /pdf to /document
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000
  });
};

// Upload YouTube URL
export const uploadYouTube = async (url) => {
  return api.post('/upload/youtube', { url }, {
    timeout: 300000  // 5 minutes
  });
};

// ============================================
// NOTES
// ============================================
export const generateNotes = (documentId) => 
  api.post(`/documents/${documentId}/generate-notes`);

// ============================================
// QUIZ
// ============================================
export const generateQuiz = (documentId, numQuestions = 10) => 
  api.post(`/documents/${documentId}/generate-quiz`, { num_questions: numQuestions });

export const getQuiz = (documentId) => 
  api.get(`/documents/${documentId}/quiz`);

// ============================================
// FLASHCARDS
// ============================================
export const generateFlashcards = (documentId, numCards = 15) => 
  api.post(`/documents/${documentId}/generate-flashcards`, { num_cards: numCards });

export const getFlashcards = (documentId) => 
  api.get(`/documents/${documentId}/flashcards`);

// ============================================
// CHAT
// ============================================
export const sendChatMessage = (documentId, message) => 
  api.post(`/documents/${documentId}/chat`, { message });

export const getChatHistory = (documentId) => 
  api.get(`/documents/${documentId}/chat`);

export const clearChatHistory = (documentId) => 
  api.delete(`/documents/${documentId}/chat`);

// ============================================
// PODCAST
// ============================================
export const generatePodcast = async (documentId) => {
  return api.post('/documents/generate-podcast', {
    document_id: documentId
    // ⭐ No duration_minutes - AI decides!
  }, {
    timeout: 300000 // 5 minutes
  });
};

export default api;