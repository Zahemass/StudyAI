const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Apply auth to all routes
router.use(authMiddleware);

// ============================================
// DOCUMENT CRUD
// ============================================

// Get all documents
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, filename, file_url, file_size, notes_generated, podcast_generated, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, documents: data });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    res.json({ success: true, document: data });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// NOTES
// ============================================

// Generate notes
router.post('/:id/generate-notes', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (docError) throw docError;

    if (!doc.extracted_text) {
      return res.status(400).json({ success: false, message: 'No text content available' });
    }

    console.log(`📝 Generating notes for document: ${id}`);

    const response = await axios.post(`${AI_SERVICE_URL}/generate-notes`, {
      document_id: id,
      text_content: doc.extracted_text,
      filename: doc.filename
    }, { timeout: 60000 });

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        notes: response.data.notes,
        notes_generated: true
      })
      .eq('id', id);

    if (updateError) throw updateError;

    console.log(`✅ Notes generated for document: ${id}`);

    res.json({
      success: true,
      notes: response.data.notes
    });
  } catch (error) {
    console.error('Error generating notes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// QUIZ
// ============================================

// Generate quiz
router.post('/:id/generate-quiz', async (req, res) => {
  try {
    const { id } = req.params;
    const { num_questions = 10 } = req.body;

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (docError) throw docError;

    console.log(`❓ Generating ${num_questions} quiz questions for document: ${id}`);

    const response = await axios.post(`${AI_SERVICE_URL}/generate-quiz`, {
      document_id: id,
      text_content: doc.extracted_text,
      num_questions
    }, { timeout: 60000 });

    // Delete old questions
    await supabase.from('quiz_questions').delete().eq('document_id', id);

    // Insert new questions
    if (response.data.questions && response.data.questions.length > 0) {
      const questions = response.data.questions.map(q => ({
        document_id: id,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'medium'
      }));

      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert(questions);

      if (insertError) throw insertError;
    }

    console.log(`✅ Quiz generated: ${response.data.questions.length} questions`);

    res.json({
      success: true,
      questions: response.data.questions
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get quiz questions
router.get('/:id/quiz', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('document_id', req.params.id)
      .order('created_at');

    if (error) throw error;

    res.json({ success: true, questions: data || [] });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// FLASHCARDS
// ============================================

// Generate flashcards
router.post('/:id/generate-flashcards', async (req, res) => {
  try {
    const { id } = req.params;
    const { num_cards = 15 } = req.body;

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (docError) throw docError;

    console.log(`🎴 Generating ${num_cards} flashcards for document: ${id}`);

    const response = await axios.post(`${AI_SERVICE_URL}/generate-flashcards`, {
      document_id: id,
      text_content: doc.extracted_text,
      num_cards
    }, { timeout: 60000 });

    // Delete old flashcards
    await supabase.from('flashcards').delete().eq('document_id', id);

    // Insert new flashcards
    if (response.data.flashcards && response.data.flashcards.length > 0) {
      const flashcards = response.data.flashcards.map(f => ({
        document_id: id,
        front: f.front,
        back: f.back,
        category: f.category || 'General'
      }));

      const { error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcards);

      if (insertError) throw insertError;
    }

    console.log(`✅ Flashcards generated: ${response.data.flashcards.length} cards`);

    res.json({
      success: true,
      flashcards: response.data.flashcards
    });
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get flashcards
router.get('/:id/flashcards', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('document_id', req.params.id)
      .order('created_at');

    if (error) throw error;

    res.json({ success: true, flashcards: data || [] });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// CHAT
// ============================================

// Chat with document
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (docError) throw docError;

    // Get chat history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('document_id', id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })
      .limit(20);

    console.log(`💬 Chat message for document: ${id}`);

    const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
      document_id: id,
      document_content: doc.extracted_text,
      user_message: message,
      chat_history: history || []
    }, { timeout: 30000 });

    // Save messages
    await supabase.from('chat_messages').insert([
      { document_id: id, user_id: req.user.id, role: 'user', content: message },
      { document_id: id, user_id: req.user.id, role: 'assistant', content: response.data.response }
    ]);

    res.json({
      success: true,
      response: response.data.response
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get chat history
router.get('/:id/chat', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('document_id', req.params.id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, messages: data || [] });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear chat history
router.delete('/:id/chat', async (req, res) => {
  try {
    await supabase
      .from('chat_messages')
      .delete()
      .eq('document_id', req.params.id)
      .eq('user_id', req.user.id);

    res.json({ success: true, message: 'Chat cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// PODCAST
// ============================================

// Generate podcast
router.post('/:id/generate-podcast', async (req, res) => {
  try {
    const { id } = req.params;
    const { duration_minutes = 5 } = req.body;

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (docError) throw docError;

    console.log(`🎧 Generating ${duration_minutes} min podcast for document: ${id}`);

    const response = await axios.post(`${AI_SERVICE_URL}/generate-podcast`, {
      document_id: id,
      text_content: doc.extracted_text,
      duration_minutes
    }, { timeout: 120000 });

    // Copy audio to backend uploads
    const sourcePath = response.data.audio_path;
    const destDir = path.join(__dirname, '../../uploads/podcasts');
    const destPath = path.join(destDir, `${id}.mp3`);

    if (! fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, destPath);

    const podcastUrl = `${process.env.BACKEND_URL}/uploads/podcasts/${id}.mp3`;

    // Update document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        podcast_url: podcastUrl,
        podcast_generated: true
      })
      .eq('id', id);

    if (updateError) throw updateError;

    console.log(`✅ Podcast generated: ${podcastUrl}`);

    res.json({
      success: true,
      podcast_url: podcastUrl
    });
  } catch (error) {
    console.error('Error generating podcast:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;