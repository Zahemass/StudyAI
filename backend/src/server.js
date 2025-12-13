require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const documentRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------------------------
   Ensure upload directories exist
---------------------------------- */
const uploadDirs = ['uploads/pdfs', 'uploads/podcasts'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

/* ---------------------------------
   CORS (Render-safe + Express 5)
---------------------------------- */
const allowedOrigins = [
  'http://localhost:5173',
  'https://study-ai-indol.vercel.app'
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

/* ---------------------------------
   Parsers
---------------------------------- */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ---------------------------------
   Logging
---------------------------------- */
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* ---------------------------------
   Static uploads
---------------------------------- */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ---------------------------------
   Routes
---------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/documents', documentRoutes);

/* ---------------------------------
   Health
---------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

/* ---------------------------------
   Error handler
---------------------------------- */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

/* ---------------------------------
   404
---------------------------------- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

/* ---------------------------------
   Start server (Render)
---------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

module.exports = app;
