const axios = require('axios');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const aiService = {
  // Process PDF and extract text
  async processPdf(filePath) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/process-pdf`, {
        file_path: filePath
      }, {
        timeout: 60000 // 60 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('PDF processing error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Chunk the extracted text
  async chunkText(text, documentId) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/chunk-text`, {
        text,
        document_id: documentId
      }, {
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Chunking error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Generate video for a chunk
  async generateVideo(chunkData) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate-video`, chunkData, {
        timeout: 300000 // 5 minute timeout for video generation
      });
      
      // Convert local paths to URLs
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        if (data.video_path) {
          const videoFilename = path.basename(data.video_path);
          data.video_url = `${BACKEND_URL}/uploads/videos/${videoFilename}`;
        }
        if (data.audio_path) {
          const audioFilename = path.basename(data.audio_path);
          data.audio_url = `${BACKEND_URL}/uploads/audio/${audioFilename}`;
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Video generation error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Generate Q&A for a chunk
  async generateQA(chunkText, chunkId) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate-qa`, {
        text: chunkText,
        chunk_id: chunkId
      }, {
        timeout: 60000
      });
      return response.data;
    } catch (error) {
      console.error('QA generation error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

module.exports = aiService;