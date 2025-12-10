import os
from typing import Optional


class LLMHandler:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        
        if self.provider == "groq":
            from groq import Groq
            self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        else:
            from openai import OpenAI
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        print(f"LLM Handler initialized with provider: {self.provider}, model: {self.model}")
    
    def summarize_for_narration(self, text: str, max_words: int = 120) -> str:
        """Summarize text for video narration (30-45 seconds of speech)"""
        
        # Truncate input if too long
        if len(text) > 4000:
            text = text[:4000] + "..."
        
        prompt = f"""You are an educational content creator making short learning videos.

Create a clear, engaging narration script from the following educational content.

REQUIREMENTS:
- Write exactly {max_words} words (for a 30-45 second video)
- Use simple, conversational language
- Start with the key concept or an interesting hook
- Explain the main idea clearly
- End with a memorable takeaway
- Do NOT include any stage directions or notes
- Write ONLY the narration text

CONTENT TO SUMMARIZE:
{text}

NARRATION SCRIPT:"""
        
        try:
            if self.provider == "groq":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.7
                )
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.7
                )
            
            result = response.choices[0].message.content.strip()
            return result
            
        except Exception as e:
            print(f"LLM summarization error: {e}")
            # Fallback: return truncated original text
            words = text.split()[:max_words]
            return " ".join(words)
    
    def generate_explanation(self, text: str) -> str:
        """Generate a detailed explanation of a concept"""
        
        if len(text) > 3000:
            text = text[:3000] + "..."
        
        prompt = f"""Explain the following concept in simple terms that a college student would understand.
Use analogies and real-world examples where helpful.
Keep it concise but comprehensive.

CONCEPT:
{text}

EXPLANATION:"""
        
        try:
            if self.provider == "groq":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=400,
                    temperature=0.7
                )
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=400,
                    temperature=0.7
                )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"LLM explanation error: {e}")
            return text[:500]