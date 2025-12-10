from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

from services.document_processor import DocumentProcessor  # ⭐ New
from services.content_generator import ContentGenerator
from services.tts_generator import TTSService
from services.youtube_service import YouTubeService

load_dotenv()

app = FastAPI(title="StudyAI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_processor = DocumentProcessor()  # ⭐ New universal processor
content_generator = ContentGenerator()
tts_service = TTSService()
youtube_service = YouTubeService()

print("✅ StudyAI Service initialized")


# ============================================
# REQUEST MODELS
# ============================================

class ExtractTextRequest(BaseModel):
    file_path: str


class YouTubeRequest(BaseModel):
    url: str


class GenerateNotesRequest(BaseModel):
    document_id: str
    text_content: str
    filename: str


class GenerateQuizRequest(BaseModel):
    document_id: str
    text_content: str
    num_questions: int = 10


class GenerateFlashcardsRequest(BaseModel):
    document_id: str
    text_content: str
    num_cards:  int = 15


class ChatRequest(BaseModel):
    document_id: str
    document_content: str
    user_message: str
    chat_history: List[dict] = []


class GeneratePodcastRequest(BaseModel):
    document_id: str
    text_content: str
    duration_minutes: int = 5


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "StudyAI"}


@app.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "success": True,
        "formats":  document_processor.get_supported_formats()
    }


@app.post("/extract-text")
async def extract_text(request: ExtractTextRequest):
    """Extract text from ANY supported document format"""
    try:
        print(f"📄 Extracting text from: {request.file_path}")
        text = document_processor.extract_text(request.file_path)
        print(f"✅ Extracted {len(text)} characters")
        return {
            "success": True,
            "text": text,
            "length": len(text)
        }
    except Exception as e:  
        print(f"❌ Text extraction error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-youtube")
async def extract_youtube(request: YouTubeRequest):
    """Extract transcript & details from YouTube video"""
    try: 
        print(f"📹 Extracting transcript from: {request.url}")
        video_info = youtube_service.get_video_info(request.url)
        return {
            "success": True,
            "video_id": video_info["video_id"],
            "title": video_info["title"],
            "channel": video_info["channel"],
            "duration": video_info["duration"],
            "text": video_info["text"],
            "length": len(video_info["text"]),
        }
    except Exception as e: 
        print(f"❌ YouTube extraction error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/generate-notes")
async def generate_notes(request: GenerateNotesRequest):
    """Generate comprehensive notes from document"""
    try:  
        print(f"📝 Generating notes for: {request.filename}")
        
        notes = await content_generator.generate_notes(
            request.text_content,
            request.filename
        )
        
        print(f"✅ Notes generated:  {len(notes)} characters")
        
        return {
            "success":  True,
            "document_id": request.document_id,
            "notes": notes
        }
    except Exception as e:
        print(f"❌ Notes generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-quiz")
async def generate_quiz(request: GenerateQuizRequest):
    """Generate MCQ quiz questions"""
    try:
        print(f"❓ Generating {request.num_questions} quiz questions")
        
        questions = await content_generator.generate_quiz(
            request.text_content,
            request.num_questions
        )
        
        print(f"✅ Generated {len(questions)} questions")
        
        return {
            "success": True,
            "document_id": request.document_id,
            "questions": questions
        }
    except Exception as e:
        print(f"❌ Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-flashcards")
async def generate_flashcards(request: GenerateFlashcardsRequest):
    """Generate flashcards for key concepts"""
    try:
        print(f"🎴 Generating {request.num_cards} flashcards")
        
        flashcards = await content_generator.generate_flashcards(
            request.text_content,
            request.num_cards
        )
        
        print(f"✅ Generated {len(flashcards)} flashcards")
        
        return {
            "success": True,
            "document_id":  request.document_id,
            "flashcards": flashcards
        }
    except Exception as e:
        print(f"❌ Flashcard generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_with_document(request: ChatRequest):
    """Chat about the document - answers only from document content"""
    try:
        print(f"💬 Chat:  {request.user_message[: 50]}...")
        
        response = await content_generator.chat_with_document(
            request.document_content,
            request.user_message,
            request.chat_history
        )
        
        return {
            "success": True,
            "response": response
        }
    except Exception as e:  
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GeneratePodcastRequest(BaseModel):
    document_id: str
    text_content: str
    duration_minutes: Optional[int] = None  # ⭐ Now optional - AI decides if not provided


@app.post("/generate-podcast")
async def generate_podcast(request: GeneratePodcastRequest):
    """Generate podcast audio - AI determines optimal duration if not specified"""
    try:
        duration = request.duration_minutes or "AI-determined"
        print(f"🎧 Generating podcast (Duration: {duration})")
        
        # Generate podcast script (AI decides duration if None)
        script = await content_generator.generate_podcast_script(
            request.text_content,
            request.duration_minutes  # Can be None - AI will decide
        )
        
        print(f"📝 Script generated: {len(script)} characters")
        
        # Convert to audio
        audio_path = await tts_service.generate_podcast_audio(
            script,
            request.document_id
        )
        
        return {
            "success": True,
            "document_id": request.document_id,
            "audio_path":  audio_path,
            "script": script
        }
    except Exception as e:
        print(f"❌ Podcast generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    """Generate podcast audio (2-15 minutes)"""
    try:
        print(f"🎧 Generating {request.duration_minutes} minute podcast")
        
        # Generate podcast script
        script = await content_generator.generate_podcast_script(
            request.text_content,
            request.duration_minutes
        )
        
        print(f"📝 Script generated: {len(script)} characters")
        
        # Convert to audio
        audio_path = await tts_service.generate_podcast_audio(
            script,
            request.document_id
        )
        
        return {
            "success": True,
            "document_id": request.document_id,
            "audio_path":  audio_path,
            "script": script
        }
    except Exception as e:
        print(f"❌ Podcast generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":  
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)