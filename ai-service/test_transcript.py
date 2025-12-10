import os
import re
import requests
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

load_dotenv()
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

class YouTubeService:

    def __init__(self):
        print("📺 YouTubeService Ready")
        if YOUTUBE_API_KEY:
            print("🔐 YouTube API Key Loaded")
        else:
            print("⚠️ Warning: No YouTube API Key!")

    def extract_video_id(self, url: str) -> str:
        patterns = [
            r"(?:youtu\.be/|youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})",
            r"youtube\.com/embed/([a-zA-Z0-9_-]{11})"
        ]
        for p in patterns:
            match = re.search(p, url)
            if match:
                return match.group(1)
        raise Exception("Invalid YouTube URL")

    def get_metadata(self, video_id: str) -> dict:
        if not YOUTUBE_API_KEY:
            return None

        url = (
            "https://www.googleapis.com/youtube/v3/videos"
            f"?id={video_id}&part=snippet,contentDetails&key={YOUTUBE_API_KEY}"
        )

        data = requests.get(url).json()
        if not data.get("items"):
            print("⚠ Metadata not available")
            return None

        snip = data["items"][0]["snippet"]
        return {
            "title": snip.get("title"),
            "channel": snip.get("channelTitle"),
            "published_at": snip.get("publishedAt"),
        }

    def get_transcript(self, video_id: str):
        """
        Try EN → HI. If unavailable/restricted: return None.
        """
        try:
            return YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        except:
            print("⚠ EN transcript unavailable → trying Hindi…")

        try:
            return YouTubeTranscriptApi.get_transcript(video_id, languages=["hi"])
        except Exception as e:
            print("⚠ Transcript unavailable:", e)
            return None

    def get_video_info(self, url: str) -> dict:
        print(f"🚀 Fetching YouTube info for: {url}")

        video_id = self.extract_video_id(url)
        meta = self.get_metadata(video_id)
        transcript = self.get_transcript(video_id)

        if transcript:
            full_text = " ".join(i["text"] for i in transcript)
            duration = transcript[-1]["start"] + transcript[-1]["duration"]
            return {
                "success": True,
                "video_id": video_id,
                "title": meta.get("title") if meta else f"Video {video_id}",
                "channel": meta.get("channel") if meta else "Unknown",
                "published_at": meta.get("published_at") if meta else None,
                "text": full_text,
                "duration": duration,
                "length": len(full_text),
                "message": "Transcript successfully extracted 🎉"
            }

        return {
            "success": False,
            "video_id": video_id,
            "title": meta.get("title") if meta else f"Video {video_id}",
            "channel": meta.get("channel") if meta else "Unknown",
            "published_at": meta.get("published_at") if meta else None,
            "message": "Transcript blocked or unavailable. Please try another video."
        }
