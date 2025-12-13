study-video-app/
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── PdfUpload.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── QASection.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Learn.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── .env
│   └── package.json
│
├── backend/                  
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── upload.js
│   │   │   ├── documents.js
│   │   │   └── videos.js
│   │   ├── controllers/
│   │   │   ├── uploadController.js
│   │   │   └── videoController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── services/
│   │   │   ├── aiService.js
│   │   │   └── supabaseService.js
│   │   ├── config/
│   │   │   └── supabase.js
│   │   └── server.js
│   ├── uploads/
│   │   ├── pdfs/
│   │   └── videos/
│   ├── .env
│   └── package.json
│
├── ai-service/               
│   ├── services/
│   │   ├── pdf_processor.py
│   │   ├── chunking.py
│   │   ├── llm_handler.py
│   │   ├── tts_generator.py
│   │   ├── video_creator.py
│   │   └── qa_generator.py
│   ├── temp/
│   │   ├── audio/
│   │   └── videos/
│   ├── app.py
│   ├── requirements.txt
│   └── .env
│
└── .gitignore




ai-service/
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload


┌─────────────────────────────────────────────────────────────────┐
│                        REACT APP                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Summary │ │  Quiz   │ │  Chat   │ │Flashcard│ │ Podcast │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼───────────┼───────────┼───────────┼───────────┼─────────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS BACKEND (Vercel)                      │
│              API Gateway + Authentication + Storage              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    KESTRA (Workflow Orchestration)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PDF Upload → Text Extract → AI Process → Store Results   │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                PYTHON AI SERVICES (with Oumi/LLaMA)              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Summarizer │ │Quiz Gen    │ │RAG Chat    │ │TTS Podcast │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │PostgreSQL│ │ Storage  │ │ pgvector │ │  Auth    │           │
│  │(metadata)│ │ (PDFs)   │ │(embeddings)│           │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘