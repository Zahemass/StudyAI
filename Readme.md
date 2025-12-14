# 🎓 StudyAI - AI-Powered Learning Platform

Transform documents and YouTube videos into comprehensive study materials with AI-generated notes, quizzes, flashcards, and podcasts. 

[![License:  MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22. x-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10-blue)](https://www.python.org/)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│                  Hosted on Vercel                        │
│          https://your-app.vercel.app                     │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ HTTPS REST API
                     ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND (Node.js/Express)                   │
│                  Hosted on Vercel                        │
│          https://your-backend.vercel.app                 │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │   Upload    │  │  Documents  │    │
│  │   Routes    │  │   Routes    │  │   Routes    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└──────────┬─────────────────────┬────────────────────────┘
           │                     │
           │ PostgreSQL          │ HTTPS REST API
           ▼                     ▼
┌────────────────────┐  ┌─────────────────────────────────┐
│   SUPABASE         │  │   AI SERVICE (FastAPI/Python)   │
│  Database +        │  │   Hosted on Google Cloud Run    │
│  File Storage      │  │   https://xxx.run.app           │
│                    │  │                                 │
│  ┌──────────────┐  │  │  ┌────────────────────────┐    │
│  │  PostgreSQL  │  │  │  │     Oumi AI API        │    │
│  │   Tables     │  │  │  │  - Chat Completions    │    │
│  └──────────────┘  │  │  │  - Text-to-Speech      │    │
│                    │  │  └────────────────────────┘    │
│  ┌──────────────┐  │  │                                 │
│  │   Storage    │  │  │  ┌────────────────────────┐    │
│  │   Buckets    │  │  │  │   Document Processor   │    │
│  │  (documents) │  │  │  │   Content Generator    │    │
│  └──────────────┘  │  │  │   TTS Generator        │    │
└────────────────────┘  │  │   YouTube Service      │    │
                        │  └────────────────────────┘    │
                        └─────────────────────────────────┘
```

### Data Flow

```
1. User uploads document → Frontend → Backend → Supabase Storage
2. Backend calls AI Service → Extract text from document
3. AI Service generates content: 
   - Notes (Oumi AI)
   - Quiz questions (Oumi AI)
   - Flashcards (Oumi AI)
   - Podcast script (Oumi AI) → Audio (Oumi TTS) → Supabase Storage
4. Frontend fetches generated content from Backend API
```

---

## 🛠️ Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Vercel |
| **Backend** | Node. js 22 + Express | Vercel Serverless |
| **AI Service** | Python 3.10 + FastAPI | Google Cloud Run |
| **Database** | PostgreSQL (Supabase) | Supabase Cloud |
| **Storage** | Supabase Storage | Supabase Cloud |
| **AI Provider** | Oumi AI (Chat + TTS) | Oumi Cloud |


## 🚀 Quick Setup

### Prerequisites
- Node.js 22+
- Python 3.10+
- Google Cloud SDK
- Vercel CLI
- Supabase account
- Oumi AI API key

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/study-video-app.git
cd study-video-app
```

### 2. Setup Supabase

Create tables in Supabase SQL Editor:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  notes TEXT,
  podcast_url TEXT,
  podcast_script TEXT,
  source_type VARCHAR(50),
  notes_generated BOOLEAN DEFAULT FALSE,
  podcast_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer VARCHAR(1),
  explanation TEXT,
  difficulty VARCHAR(20)
);

CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  category VARCHAR(100)
);
```

Create Storage Bucket:  `documents` (public)

### 3. Local Development

#### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm run dev
# Runs on http://localhost:5173
```

#### Backend
```bash
cd backend
npm install
cat > .env << EOF
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_key
JWT_SECRET=your_secret
AI_SERVICE_URL=http://localhost:8000
EOF
npm run dev
# Runs on http://localhost:5000
```

#### AI Service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cat > .env << EOF
OUMI_API_KEY=your_oumi_key
OUMI_API_URL=https://api.oumi.ai/v1
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_key
EOF
uvicorn app:app --reload --port 8000
# Runs on http://localhost:8000
```

---

## 🌐 Deployment

### Deploy AI Service to Cloud Run

```bash
cd ai-service
gcloud run deploy studyai-ai-service \
  --source .  \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --timeout 3600 \
  --set-env-vars OUMI_API_KEY=xxx,SUPABASE_URL=xxx,SUPABASE_SERVICE_KEY=xxx
```

### Deploy Backend to Vercel

```bash
cd backend
vercel
# Set env vars in Vercel dashboard
vercel --prod
```

### Deploy Frontend to Vercel

```bash
cd frontend
vercel
# Set VITE_API_URL=https://your-backend.vercel.app/api
vercel --prod
```

---

## 🔐 Environment Variables

### Frontend
```
VITE_API_URL=https://your-backend.vercel.app/api
```

### Backend
```
FRONTEND_URL=https://your-frontend.vercel.app
AI_SERVICE_URL=https://xxx.run.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=random_string
```

### AI Service
```
OUMI_API_KEY=your_oumi_key
OUMI_API_URL=https://api.oumi.ai/v1
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

---

## 📚 Key Features

- 📤 **Multi-format upload**:  PDF, DOCX, PPTX, TXT, XLSX, CSV, YouTube
- 📝 **AI Notes**: Comprehensive study notes with Oumi AI
- ❓ **Smart Quizzes**: MCQs with explanations
- 🎴 **Flashcards**: Categorized learning cards
- 🎧 **AI Podcasts**: Text-to-speech with live transcripts (2-15 min, auto-optimized)
- 💬 **Document Chat**: Ask questions about your content
- 🔐 **Secure**: JWT authentication + user-specific data

---


## 📄 License

MIT License - see [LICENSE](LICENSE)



**Made with ❤️ using Oumi AI, Supabase, Vercel & Google Cloud**
