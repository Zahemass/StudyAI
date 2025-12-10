import os
import json
import re
import uuid
from typing import List, Dict


class QAGenerator:
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
    
    def generate(self, text: str, chunk_id: str, num_questions: int = 3) -> List[Dict]:
        """Generate multiple choice questions from text"""
        
        # Truncate text if too long
        if len(text) > 3000:
            text = text[:3000] + "..."
        
        prompt = f"""Based on the following educational content, generate {num_questions} multiple choice questions to test understanding.

IMPORTANT: Return ONLY valid JSON array, no other text.

Each question must have:
- "question": The question text
- "options": Array of exactly 4 options
- "correct_answer": Index of correct option (0-3)
- "explanation": Brief explanation why the answer is correct

CONTENT:
{text}

Return JSON array:"""

        try:
            if self.provider == "groq":
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a quiz generator. Return only valid JSON arrays."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500,
                    temperature=0.7
                )
            else:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are a quiz generator. Return only valid JSON arrays."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500,
                    temperature=0.7
                )
            
            response_text = response.choices[0].message.content.strip()
            
            # Parse JSON from response
            questions = self._parse_json_response(response_text)
            
            # Validate and add IDs
            validated_questions = []
            for q in questions:
                if self._validate_question(q):
                    q["id"] = str(uuid.uuid4())
                    q["chunk_id"] = chunk_id
                    validated_questions.append(q)
            
            print(f"Generated {len(validated_questions)} questions")
            return validated_questions
            
        except Exception as e:
            print(f"QA generation error: {e}")
            # Return default question if generation fails
            return self._get_default_questions(chunk_id)
    
    def _parse_json_response(self, response_text: str) -> List[Dict]:
        """Parse JSON from LLM response"""
        
        # Try to find JSON array in response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        # Try parsing entire response as JSON
        try:
            result = json.loads(response_text)
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and "questions" in result:
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
        
        if not isinstance(question["options"], list) or len(question["options"]) < 2:
            return False
        
        if not isinstance(question["correct_answer"], int):
            return False
        
        if question["correct_answer"] < 0 or question["correct_answer"] >= len(question["options"]):
            return False
        
        return True
    
    def _get_default_questions(self, chunk_id: str) -> List[Dict]:
        """Return default questions if generation fails"""
        return [
            {
                "id": str(uuid.uuid4()),
                "chunk_id": chunk_id,
                "question": "Did you understand the main concepts in this section?",
                "options": [
                    "Yes, completely",
                    "Mostly, but some parts were unclear",
                    "Partially understood",
                    "Need to review again"
                ],
                "correct_answer": 0,
                "explanation": "This is a self-assessment question to help you track your understanding."
            }
        ]