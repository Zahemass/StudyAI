import os
from typing import Optional


class LLMHandler:
    def __init__(self):
        
        self.provider = "oumi"

        
        from services.oumi_client import OumiClient

        self.client = OumiClient()
        self.model = os.getenv("OUMI_MODEL", "oumi-default")
        self.api_type = "oumi"

        print(
            f"✅ LLM Handler initialized with provider: {self.provider}, model: {self.model}"
        )

    async def _call_llm(
        self,
        messages: list,
        max_tokens: int = 300,
        temperature: float = 0.7,
    ) -> str:
        """Unified OUMI LLM calling method"""

        try:
            response = await self.client.chat_completion(
                messages=messages,
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response

        except Exception as e:
            print(f"❌ LLM call error (oumi): {e}")
            raise

    async def summarize_for_narration(
        self, text: str, max_words: int = 120
    ) -> str:
        """Summarize text for video narration (30–45 seconds of speech)"""

        # Truncate input if too long
        if len(text) > 4000:
            text = text[:4000] + "..."

        messages = [
            {
                "role": "system",
                "content": "You are an educational content creator making short learning videos.",
            },
            {
                "role": "user",
                "content": f"""Create a clear, engaging narration script from the following educational content.

REQUIREMENTS:
- Write exactly {max_words} words (for a 30–45 second video)
- Use simple, conversational language
- Start with the key concept or an interesting hook
- Explain the main idea clearly
- End with a memorable takeaway
- Do NOT include any stage directions or notes
- Write ONLY the narration text

CONTENT TO SUMMARIZE:
{text}

NARRATION SCRIPT:""",
            },
        ]

        try:
            result = await self._call_llm(
                messages, max_tokens=300, temperature=0.7
            )
            print(f"✅ Narration generated: {len(result.split())} words")
            return result

        except Exception as e:
            print(f"❌ Narration generation failed: {e}")
            words = text.split()[:max_words]
            return " ".join(words)

    async def generate_explanation(self, text: str) -> str:
        """Generate a detailed explanation of a concept"""

        if len(text) > 3000:
            text = text[:3000] + "..."

        messages = [
            {
                "role": "system",
                "content": "You are an expert educator who explains concepts clearly and simply.",
            },
            {
                "role": "user",
                "content": f"""Explain the following concept in simple terms that a college student would understand.
Use analogies and real-world examples where helpful.
Keep it concise but comprehensive.

CONCEPT:
{text}

EXPLANATION:""",
            },
        ]

        try:
            result = await self._call_llm(
                messages, max_tokens=400, temperature=0.7
            )
            print(f"✅ Explanation generated: {len(result)} characters")
            return result

        except Exception as e:
            print(f"❌ Explanation generation failed: {e}")
            return text[:500]

    async def generate_quiz_question(self, text: str) -> dict:
        """Generate a single quiz question from text"""

        if len(text) > 2000:
            text = text[:2000] + "..."

        messages = [
            {
                "role": "system",
                "content": "You are a quiz creator. Return only valid JSON.",
            },
            {
                "role": "user",
                "content": f"""Create ONE multiple choice question from this content.

Content:
{text}

Return as JSON:
{{
  "question": "question text",
  "option_a": "option A",
  "option_b": "option B",
  "option_c": "option C",
  "option_d": "option D",
  "correct_answer": "A",
  "explanation": "why this is correct"
}}""",
            },
        ]

        try:
            import json

            result = await self._call_llm(
                messages, max_tokens=300, temperature=0.8
            )
            return json.loads(result)

        except Exception as e:
            print(f"❌ Quiz question generation failed: {e}")
            return {
                "question": "What is the main concept?",
                "option_a": "Option A",
                "option_b": "Option B",
                "option_c": "Option C",
                "option_d": "Option D",
                "correct_answer": "A",
                "explanation": "Correct answer",
            }
