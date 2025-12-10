import os
import re
import requests
import yt_dlp
import whisper
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


class YouTubeService: 
    def __init__(self):
        print("✅ YouTubeService initialized")
        if YOUTUBE_API_KEY:
            print("🔐 YouTube API Key found")
        
        # Load Whisper model (base is good balance of speed/accuracy)
        print("🎤 Loading Whisper model...")
        self.whisper_model = whisper.load_model("base")
        print("✅ Whisper model loaded")

    def extract_video_id(self, url: str) -> str:
        """Extract video ID from YouTube URL"""
        patterns = [
            r'[? &]v=([a-zA-Z0-9_-]{11})',
            r'youtu\.be/([a-zA-Z0-9_-]{11})',
            r'embed/([a-zA-Z0-9_-]{11})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                print(f"🎯 Video ID:  {video_id}")
                return video_id
        
        return None

    def download_audio(self, video_id: str) -> str:
        """Download audio from YouTube video"""
        print("📥 Downloading audio from YouTube...")
        
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # Create temp directory
        temp_dir = tempfile.mkdtemp()
        output_path = os.path.join(temp_dir, f"{video_id}.mp3")
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key':  'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(temp_dir, f"{video_id}.%(ext)s"),
            'quiet': True,
            'no_warnings': True,
        }
        
        try: 
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            print(f"✅ Audio downloaded:  {output_path}")
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to download audio: {str(e)}")

    def transcribe_with_whisper(self, audio_path: str) -> dict:
        """Transcribe audio using Whisper"""
        print("🎤 Transcribing with Whisper AI...")
        print("   This may take 1-3 minutes depending on video length...")
        
        try:
            # Transcribe
            result = self.whisper_model.transcribe(audio_path, language="en")
            
            text = result["text"].strip()
            segments = result.get("segments", [])
            
            # Get duration from segments
            duration = 0
            if segments:
                last_segment = segments[-1]
                duration = last_segment.get("end", 0)
            
            print(f"✅ Transcription complete:  {len(text)} characters")
            
            return {
                "text":  text,
                "duration": duration,
                "segments": segments
            }
            
        except Exception as e:
            raise Exception(f"Whisper transcription failed: {str(e)}")
        
        finally:
            # Clean up audio file
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
                    # Remove temp directory
                    temp_dir = os.path.dirname(audio_path)
                    if os.path.exists(temp_dir):
                        import shutil
                        shutil.rmtree(temp_dir)
            except:
                pass

    def try_get_captions(self, video_id:  str) -> dict | None:
        """Try to get captions (fast method)"""
        print("📝 Trying to get captions...")
        
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            
            # Try direct fetch
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
            
            if transcript:
                full_text = ' '.join([item['text'] for item in transcript])
                duration = transcript[-1]['start'] + transcript[-1]['duration']
                
                print(f"✅ Captions found: {len(full_text)} characters")
                
                return {
                    "text": full_text,
                    "duration": duration,
                    "segments": transcript
                }
        except Exception as e:
            print(f"   ⚠ Captions not available: {str(e)[:50]}")
        
        return None

    def get_transcript(self, video_id: str) -> dict:
        """Get transcript - try captions first, fallback to Whisper"""
        
        # METHOD 1: Try captions first (fast)
        captions = self.try_get_captions(video_id)
        if captions:
            print("✅ Using captions")
            return captions
        
        # METHOD 2: Use Whisper (slower but always works)
        print("📹 No captions available - using Whisper AI transcription")
        
        try:
            # Download audio
            audio_path = self.download_audio(video_id)
            
            # Transcribe with Whisper
            transcript = self.transcribe_with_whisper(audio_path)
            
            return transcript
            
        except Exception as e:
            raise Exception(f"Failed to get transcript: {str(e)}")

    def get_video_details(self, video_id: str) -> dict:
        """Fetch video metadata"""
        print("🔍 Fetching video details...")
        
        if not YOUTUBE_API_KEY: 
            return {"title": f"YouTube Video {video_id}", "channel": "Unknown", "duration": 0}
        
        api_url = (
            f"https://www.googleapis.com/youtube/v3/videos"
            f"?id={video_id}&part=snippet,contentDetails&key={YOUTUBE_API_KEY}"
        )
        
        try:
            response = requests.get(api_url, timeout=10)
            data = response.json()
            
            if data.get("items"):
                item = data["items"][0]
                snippet = item.get("snippet", {})
                content_details = item.get("contentDetails", {})
                
                # Parse duration
                duration_str = content_details.get("duration", "PT0S")
                duration = self.parse_duration(duration_str)
                
                return {
                    "title": snippet.get("title", "Unknown"),
                    "channel": snippet.get("channelTitle", "Unknown"),
                    "published_at": snippet.get("publishedAt"),
                    "duration": duration
                }
        except Exception as e: 
            print(f"⚠ Failed to get details: {str(e)}")
        
        return {"title": f"YouTube Video {video_id}", "channel":  "Unknown", "duration": 0}

    def parse_duration(self, duration_str:  str) -> int:
        """Parse ISO 8601 duration to seconds"""
        pattern = r'PT(? :(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
        match = re.match(pattern, duration_str)
        
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds

    def get_video_info(self, url: str) -> dict:
        """Get complete video information"""
        print("🚀 Processing YouTube video...")
        
        video_id = self.extract_video_id(url)
        if not video_id: 
            raise Exception("Invalid YouTube URL")
        
        # Get video details
        video_details = self.get_video_details(video_id)
        
        # Get transcript (captions or Whisper)
        transcript_data = self.get_transcript(video_id)
        
        # Update duration
        if transcript_data["duration"] == 0:
            transcript_data["duration"] = video_details.get("duration", 0)
        
        print("🎉 Success!")
        
        return {
            "success": True,
            "video_id": video_id,
            "url":  url,
            "title": video_details["title"],
            "channel": video_details["channel"],
            "published_at": video_details.get("published_at"),
            "text": transcript_data["text"],
            "duration": transcript_data["duration"],
            "length": len(transcript_data["text"])
        }