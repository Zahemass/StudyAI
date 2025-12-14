import os
import json
from dotenv import load_dotenv
from services.oumi_client import OumiClient

load_dotenv()


class ContentGenerator:
    def __init__(self):
        self.oumi = OumiClient()
        print("✅ ContentGenerator initialized with Oumi AI")

    async def generate_notes(self, text_content: str, filename: str) -> str:
        """Generate comprehensive study notes"""
        print(f"📝 Generating notes for: {filename}")
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert educator who creates clear, comprehensive study notes."
            },
            {
                "role": "user",
                "content": f"""Create comprehensive, well-structured study notes from this document. 

Document: {filename}

Content: 
{text_content[: 8000]}

Generate detailed notes with:
- Clear headings and subheadings
- Key concepts explained simply
- Important definitions
- Examples where helpful
- Summary of main points

Format in clean markdown."""
            }
        ]
        
        notes = await self.oumi.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=3000
        )
        
        print(f"✅ Notes generated:  {len(notes)} characters")
        return notes

    async def generate_quiz(self, text_content: str, num_questions: int = 10) -> list:
        """Generate quiz questions"""
        print(f"❓ Generating {num_questions} quiz questions")
        
        messages = [
            {
                "role": "system",
                "content": "You are a quiz creator.  Return only valid JSON."
            },
            {
                "role": "user",
                "content": f"""Create {num_questions} multiple choice questions from this content. 

Content: 
{text_content[: 6000]}

For each question, provide:
- A clear question
- 4 options (A, B, C, D)
- The correct answer (A, B, C, or D)
- A brief explanation
- Difficulty level (easy, medium, hard)

Return as JSON array with this exact structure:
{{
  "questions":  [
    {{
      "question": "question text",
      "option_a": "option A text",
      "option_b":  "option B text",
      "option_c": "option C text",
      "option_d":  "option D text",
      "correct_answer": "A",
      "explanation": "why this is correct",
      "difficulty": "medium"
    }}
  ]
}}"""
            }
        ]
        
        response = await self.oumi.chat_completion(
            messages=messages,
            temperature=0.8,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response)
        
        if isinstance(result, dict) and 'questions' in result:
            questions = result['questions']
        elif isinstance(result, list):
            questions = result
        else:
            questions = []
        
        print(f"✅ Generated {len(questions)} questions")
        return questions

    async def generate_flashcards(self, text_content: str, num_cards: int = 15) -> list:
        """Generate flashcards"""
        print(f"🎴 Generating {num_cards} flashcards")
        
        messages = [
            {
                "role": "system",
                "content": "You are a flashcard creator. Return only valid JSON."
            },
            {
                "role": "user",
                "content": f"""Create {num_cards} flashcards from this content for effective studying.

Content:
{text_content[:6000]}

Each flashcard should have:
- Front: A clear question or term
- Back: A concise answer or definition
- Category: Topic category

Return as JSON: 
{{
  "flashcards": [
    {{
      "front": "question or term",
      "back": "answer or definition",
      "category": "topic category"
    }}
  ]
}}"""
            }
        ]
        
        response = await self.oumi.chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response)
        
        if isinstance(result, dict) and 'flashcards' in result:
            flashcards = result['flashcards']
        elif isinstance(result, list):
            flashcards = result
        else:
            flashcards = []
        
        print(f"✅ Generated {len(flashcards)} flashcards")
        return flashcards

    async def generate_podcast_script(self, text_content: str, duration_minutes: int = None) -> str:
        """Generate podcast script with AI-determined optimal duration"""
        
        word_count = len(text_content.split())
        char_count = len(text_content)
        
        if duration_minutes is None:
            print("🤖 AI analyzing content to determine optimal podcast duration...")
            
            analysis_messages = [
                {
                    "role": "system",
                    "content": "You are an educational content analyzer.  Respond with only a number."
                },
                {
                    "role": "user",
                    "content": f"""Analyze this educational content and recommend the optimal podcast duration. 

Content Statistics:
- Word Count: {word_count}
- Character Count: {char_count}

Content Preview:
{text_content[:1000]}

Based on complexity and depth, recommend podcast duration:
- 2 minutes: Very brief, single concept
- 5 minutes: Quick summary, 2-3 points
- 10 minutes:  Detailed, multiple concepts
- 15 minutes: Comprehensive deep-dive

Respond with ONLY the number (2, 5, 10, or 15)."""
                }
            ]
            
            response = await self.oumi.chat_completion(
                messages=analysis_messages,
                temperature=0.3,
                max_tokens=10
            )
            
            try:
                duration_minutes = int(response.strip())
                if duration_minutes not in [2, 5, 10, 15]:
                    duration_minutes = 5
            except: 
                duration_minutes = 5
            
            print(f"✅ AI recommended duration: {duration_minutes} minutes")
        
        print(f"🎙️ Generating {duration_minutes}-minute podcast script...")
        
        if duration_minutes == 2:
            style = "very concise, covering only the core concept"
            max_words = 300
        elif duration_minutes == 5:
            style = "concise but informative, covering 2-3 key points"
            max_words = 750
        elif duration_minutes == 10:
            style = "detailed and engaging, exploring multiple concepts"
            max_words = 1500
        else: 
            style = "comprehensive and in-depth"
            max_words = 2250
        
        messages = [
            {
                "role": "system",
                "content": f"You are a friendly podcast host creating a {duration_minutes}-minute educational podcast. Write naturally as if speaking to a friend."
            },
            {
                "role": "user",
                "content": f"""Create an engaging podcast script for this content. 

TARGET DURATION: {duration_minutes} minutes (~{max_words} words)
STYLE: {style}

Source Content:
{text_content[: 8000]}

Create a script that:
1. Opens with a warm introduction
2. Explains concepts conversationally
3. Uses examples and analogies
4. Maintains engagement
5. Ends with key takeaways

Write in spoken style, not formal essay.  Target {max_words} words."""
            }
        ]
        
        script = await self.oumi.chat_completion(
            messages=messages,
            temperature=0.8,
            max_tokens=3000
        )
        
        print(f"✅ Generated {len(script)} character script for {duration_minutes}-minute podcast")
        return script

    async def chat_with_document(self, document_content: str, user_message: str, chat_history: list = []) -> str:
        """Chat about the document"""
        print(f"💬 Processing chat message: {user_message[: 50]}...")
        
        messages = [
            {
                "role": "system",
                "content": f"""You are a helpful study assistant. Answer questions about this document: 

{document_content[: 4000]}

Only answer based on the document content. If the question is outside scope, politely say so."""
            }
        ]
        
        # Add chat history
        for msg in chat_history[-5:]: 
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content":  user_message})
        
        response = await self.oumi. chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return response
        
