import os
import httpx
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()


class OumiClient:
    """Client for Oumi AI API"""
    
    def __init__(self):
        self.api_key = os.getenv("OUMI_API_KEY")
        self.base_url = os.getenv("OUMI_API_URL", "https://api.oumi.ai/v1")
        
        if not self.api_key:
            raise Exception("OUMI_API_KEY not found in environment variables")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        print("✅ Oumi AI Client initialized")
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "oumi-default",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[Dict[str, str]] = None
    ) -> str:
        """Generate chat completion using Oumi AI"""
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature":  temperature,
            "max_tokens": max_tokens
        }
        
        if response_format:
            payload["response_format"] = response_format
        
        async with httpx.AsyncClient(timeout=120. 0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Oumi API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def text_to_speech(
        self,
        text: str,
        voice:  str = "alloy",
        model: str = "tts-1",
        speed: float = 1.0
    ) -> bytes:
        """Generate speech from text using Oumi TTS"""
        
        payload = {
            "model": model,
            "input": text,
            "voice":  voice,
            "speed": speed
        }
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{self.base_url}/audio/speech",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Oumi TTS error: {response.status_code} - {response.text}")
            
            return response.content
