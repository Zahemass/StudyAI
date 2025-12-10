const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configure multer for ALL document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Allowed:  PDF, DOCX, PPTX, TXT, XLSX, CSV'), false);
    }
  }
});

// ============================================
// UPLOAD DOCUMENT
// ============================================
router.post('/document', authMiddleware, upload.single('file'), async (req, res) => {
  let documentId = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`\n📄 Document uploaded:  ${req.file.originalname}`);
    console.log(`   Type: ${req.file.mimetype}`);
    console.log(`   Size: ${req.file.size} bytes`);

    const filePath = req.file.path;
    const fileUrl = `${process.env.BACKEND_URL}/uploads/documents/${req.file.filename}`;

    let extractedText = '';
    try {
      const extractResponse = await axios.post(
        `${AI_SERVICE_URL}/extract-text`,
        { file_path: filePath },
        { timeout: 30000 }
      );
      extractedText = extractResponse.data.text || '';
      console.log(`✅ Extracted ${extractedText.length} characters`);
    } catch (err) {
      console.error('❌ Text extraction failed:', err.message);
      extractedText = 'Text extraction failed.';
    }

    const extension = req.file.originalname.split('.').pop().toLowerCase();
    const sourceType = ['pptx', 'ppt'].includes(extension) ? 'pptx' : 
                       ['docx', 'doc'].includes(extension) ? 'docx' : 
                       ['xlsx', 'xls'].includes(extension) ? 'xlsx' :
                       ['txt', 'md'].includes(extension) ? 'txt' : 
                       ['csv'].includes(extension) ? 'csv' : 
                       'pdf';

    const { data: document, error:  docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user.id,
        filename: req.file.originalname,
        file_url:  fileUrl,
        file_size: req.file.size,
        extracted_text: extractedText,
        source_type: sourceType,
        notes_generated: false,
        podcast_generated: false
      })
      .select()
      .single();

    if (docError) throw docError;
    
    documentId = document.id;
    console.log(`✅ Document created: ${documentId}`);

    res.json({
      success: true,
      document,
      message: `${sourceType.toUpperCase()} uploaded!  Generating content...`
    });

    if (extractedText && extractedText.length > 100) {
      generateAllContent(documentId, extractedText, req.file.originalname).catch(err => {
        console.error(`❌ Background generation failed:`, err.message);
      });
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ success: false, message:  error.message });
  }
});

// ============================================
// UPLOAD PDF (Legacy)
// ============================================
router.post('/pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
  if (req.file && ! req.body.file) {
    req.file.fieldname = 'file';
  }
  return router.handle({ ...req, url: '/document' }, res);
});

// ============================================
// UPLOAD YOUTUBE
// ============================================
router.post('/youtube', authMiddleware, async (req, res) => {
  let documentId = null;
  
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required' });
    }

    console.log(`\n📹 YouTube URL:  ${url}`);

    let videoData;
    try {
      console.log('📝 Calling AI service to extract transcript...');
      const response = await axios.post(
        `${AI_SERVICE_URL}/extract-youtube`,
        { url },
        { timeout: 300000 }
      );
      videoData = response.data;
      console.log(`✅ Transcript received: ${videoData.text.length} characters`);
      console.log(`   Title: ${videoData.title}`);
      console.log(`   Duration: ${videoData.duration}s`);
    } catch (err) {
      console.error('❌ YouTube extraction failed:', err.response?.data?.detail || err.message);
      return res.status(400).json({ 
        success: false, 
        message: err.response?.data?.detail || 'Failed to extract video transcript.'
      });
    }

    console.log('💾 Creating document in database...');
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user.id,
        filename: videoData.title || `YouTube:  ${videoData.video_id}`,
        file_url: url,
        file_size: videoData.text.length,
        extracted_text: videoData.text,
        source_type: 'youtube',
        youtube_video_id: videoData.video_id,
        notes_generated:  false,
        podcast_generated:  false
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Database error:', docError);
      throw docError;
    }
    
    documentId = document.id;
    console.log(`✅ Document created: ${documentId}`);

    res.json({
      success: true,
      document,
      message: 'YouTube video processed!  Generating study materials...'
    });

    if (videoData.text && videoData.text.length > 100) {
      generateAllContent(
        documentId, 
        videoData.text, 
        videoData.title || `YouTube: ${videoData.video_id}`
      ).catch(err => {
        console.error(`❌ Background generation failed:`, err.message);
      });
    }

  } catch (error) {
    console.error('❌ YouTube upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'YouTube processing failed' 
    });
  }
});

// ============================================
// BACKGROUND CONTENT GENERATION
// ============================================
async function generateAllContent(documentId, textContent, filename) {
  console.log(`\n🚀 Generating content for: ${documentId}`);
  
  try {
    // Generate Notes
    console.log('📝 Generating notes...');
    try {
      const notesResponse = await axios.post(
        `${AI_SERVICE_URL}/generate-notes`,
        { 
          document_id:  documentId, 
          text_content: textContent, 
          filename: filename 
        },
        { timeout: 120000 }
      );
      
      await supabase
        .from('documents')
        .update({ 
          notes:  notesResponse.data.notes, 
          notes_generated: true 
        })
        .eq('id', documentId);
      
      console.log(`✅ Notes generated for ${documentId}`);
    } catch (err) {
      console.error(`❌ Notes generation failed:`, err.message);
    }

    // Generate Quiz
    console.log('❓ Generating quiz...');
    try {
      const quizResponse = await axios.post(
        `${AI_SERVICE_URL}/generate-quiz`,
        { 
          document_id: documentId, 
          text_content: textContent, 
          num_questions: 10 
        },
        { timeout: 120000 }
      );

      if (quizResponse.data.questions && quizResponse.data.questions.length > 0) {
        await supabase.from('quiz_questions').delete().eq('document_id', documentId);
        
        const questions = quizResponse.data.questions.map(q => ({
          document_id: documentId,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium'
        }));

        await supabase.from('quiz_questions').insert(questions);
        console.log(`✅ Quiz generated:  ${questions.length} questions`);
      }
    } catch (err) {
      console.error(`❌ Quiz generation failed:`, err.message);
    }

    // Generate Flashcards
    console.log('🎴 Generating flashcards...');
    try {
      const flashcardsResponse = await axios.post(
        `${AI_SERVICE_URL}/generate-flashcards`,
        { 
          document_id: documentId, 
          text_content: textContent, 
          num_cards: 15 
        },
        { timeout: 120000 }
      );

      if (flashcardsResponse.data.flashcards && flashcardsResponse.data.flashcards.length > 0) {
        await supabase.from('flashcards').delete().eq('document_id', documentId);
        
        const flashcards = flashcardsResponse.data.flashcards.map(f => ({
          document_id:  documentId,
          front: f.front,
          back: f.back,
          category: f.category || 'General'
        }));

        await supabase.from('flashcards').insert(flashcards);
        console.log(`✅ Flashcards generated: ${flashcards.length} cards`);
      }
    } catch (err) {
      console.error(`❌ Flashcard generation failed:`, err.message);
    }

    // ⭐ Generate Podcast - AI decides optimal duration
    console.log('🎧 Generating AI-optimized podcast...');
    try {
      const podcastResponse = await axios.post(
        `${AI_SERVICE_URL}/generate-podcast`,
        { 
          document_id: documentId, 
          text_content:  textContent
          // ⭐ NO duration_minutes - AI decides! 
        },
        { timeout:  180000 }
      );

      const sourcePath = podcastResponse.data.audio_path;
      const podcastScript = podcastResponse.data.script;
      const destDir = path.join(__dirname, '../../uploads/podcasts');
      const destPath = path.join(destDir, `${documentId}.mp3`);

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive:  true });
      }

      fs.copyFileSync(sourcePath, destPath);

      const podcastUrl = `${process.env.BACKEND_URL}/uploads/podcasts/${documentId}.mp3`;

      await supabase
        .from('documents')
        .update({ 
          podcast_url: podcastUrl,
          podcast_script: podcastScript,
          podcast_generated: true 
        })
        .eq('id', documentId);

      console.log(`✅ Podcast generated: ${podcastUrl}`);
      console.log(`✅ AI-optimized podcast script:  ${podcastScript.length} characters`);
    } catch (err) {
      console.error(`❌ Podcast generation failed:`, err.message);
    }

    console.log(`\n🎉 All content generated for:  ${documentId}\n`);
    
  } catch (error) {
    console.error(`❌ Background generation error:`, error.message);
  }
}

module.exports = router;