import os
import json
import re
import uuid
from typing import List, Dict


class QAGenerator:
    def __init__(self):
        
        self.provider = "oumi"

       
        from services.oumi_client import OumiClient

        self.client = OumiClient()
        self.model = os.getenv("OUMI_MODEL", "oumi-default")

        print(f"✅ QA Generator initialized with provider: {self.provider}, model: {self.model}")

    async def _call_llm(
        self,
        messages: List[Dict],
        max_tokens: int = 1500,
        temperature: float = 0.7,
    ) -> str:
        """Internal Oumi LLM call"""

        try:
            response = await self.client.chat_completion(
                messages=messages,
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response

        except Exception as e:
            print(f"❌ Oumi LLM call error: {e}")
            raise

    async def generate(
        self,
        text: str,
        chunk_id: str,
        num_questions: int = 3,
    ) -> List[Dict]:
        """Generate multiple choice questions from text"""

        if len(text) > 3000:
            text = text[:3000] + "..."

        messages = [
            {
                "role": "system",
                "content": "You are a quiz generator. Return ONLY valid JSON arrays.",
            },
            {
                "role": "user",
                "content": f"""Based on the following educational content, generate {num_questions} multiple choice questions to test understanding.

IMPORTANT:
- Return ONLY a valid JSON array
- No markdown
- No explanations outside JSON

Each question must have:
- "question"
- "options" (exactly 4)
- "correct_answer" (index 0-3)
- "explanation"

CONTENT:
{text}

Return JSON array:""",
            },
        ]

        try:
            response_text = await self._call_llm(
                messages, max_tokens=1500, temperature=0.7
            )

            questions = self._parse_json_response(response_text)

            validated_questions = []
            for q in questions:
                if self._validate_question(q):
                    q["id"] = str(uuid.uuid4())
                    q["chunk_id"] = chunk_id
                    validated_questions.append(q)

            print(f"✅ Generated {len(validated_questions)} questions")
            return validated_questions

        except Exception as e:
            print(f"❌ QA generation error: {e}")
            return self._get_default_questions(chunk_id)

    def _parse_json_response(self, response_text: str) -> List[Dict]:
        """Extract JSON array from model output"""

        json_match = re.search(r"\[[\s\S]*\]", response_text)

        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        try:
            result = json.loads(response_text)
            if isinstance(result, list):
                return result
            if isinstance(result, dict) and "questions" in result:
                return result["questions"]
        except json.JSONDecodeError:
            pass

        return []

    def _validate_question(self, question: Dict) -> bool:
        """Validate question structure"""

        required_fields = ["question", "options", "correct_answer"]

        for field in required_fields:
            if field not in question:
                return False

        if not isinstance(question["options"], list):
            return False

        if len(question["options"]) != 4:
            return False

        if not isinstance(question["correct_answer"], int):
            return False

        if question["correct_answer"] < 0 or question["correct_answer"] > 3:
            return False

        return True

    def _get_default_questions(self, chunk_id: str) -> List[Dict]:
        """Fallback questions"""

        return [
            {
                "id": str(uuid.uuid4()),
                "chunk_id": chunk_id,
                "question": "Did you understand the main ideas in this section?",
                "options": [
                    "Yes, clearly",
                    "Mostly",
                    "Partially",
                    "Not at all",
                ],
                "correct_answer": 0,
                "explanation": "This is a self-assessment question.",
            }
        ]
