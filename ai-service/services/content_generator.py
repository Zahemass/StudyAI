import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class ContentGenerator:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key: 
            raise Exception("OPENAI_API_KEY not found")
        
        self.client = OpenAI(api_key=api_key)
        print("✅ ContentGenerator initialized with OpenAI")

    async def generate_notes(self, text_content: str, filename: str) -> str:
        """Generate comprehensive study notes"""
        print(f"📝 Generating notes for: {filename}")
        
        prompt = f"""You are an expert educator. Create comprehensive, well-structured study notes from this document.

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

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert educator who creates clear, comprehensive study notes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        return response.choices[0].message.content

    async def generate_quiz(self, text_content: str, num_questions: int = 10) -> list:
        """Generate quiz questions"""
        print(f"❓ Generating {num_questions} quiz questions")
        
        prompt = f"""Create {num_questions} multiple choice questions from this content.

Content:
{text_content[:6000]}

For each question, provide:
- A clear question
- 4 options (A, B, C, D)
- The correct answer (A, B, C, or D)
- A brief explanation
- Difficulty level (easy, medium, hard)

Return as JSON array with this exact structure:
[
  {{
    "question": "question text",
    "option_a": "option A text",
    "option_b":  "option B text",
    "option_c": "option C text",
    "option_d":  "option D text",
    "correct_answer": "A",
    "explanation": "why this is correct",
    "difficulty":  "medium"
  }}
]"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a quiz creator. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures
        if isinstance(result, dict) and 'questions' in result:
            return result['questions']
        elif isinstance(result, list):
            return result
        else: 
            return []

    async def generate_flashcards(self, text_content:  str, num_cards: int = 15) -> list:
        """Generate flashcards"""
        print(f"🎴 Generating {num_cards} flashcards")
        
        prompt = f"""Create {num_cards} flashcards from this content for effective studying.

Content:
{text_content[:6000]}

Each flashcard should have:
- Front: A clear question or term
- Back: A concise answer or definition
- Category: Topic category

Return as JSON array: 
[
  {{
    "front": "question or term",
    "back": "answer or definition",
    "category": "topic category"
  }}
]"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a flashcard creator.Return only valid JSON."},
                {"role":  "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        # Handle different JSON structures
        if isinstance(result, dict) and 'flashcards' in result:
            return result['flashcards']
        elif isinstance(result, list):
            return result
        else: 
            return []

    async def generate_podcast_script(self, text_content: str, duration_minutes: int = None) -> str:
        """Generate podcast script with AI-determined optimal duration"""
        
        # Calculate content metrics
        word_count = len(text_content.split())
        char_count = len(text_content)
        
        # Let AI decide optimal duration based on content
        if duration_minutes is None:
            print("🤖 AI analyzing content to determine optimal podcast duration...")
            
            analysis_prompt = f"""Analyze this educational content and recommend the optimal podcast duration.

Content Statistics:
- Word Count: {word_count}
- Character Count: {char_count}

Content Preview:
{text_content[:1000]}

Based on the content's complexity, depth, and topics covered, recommend the best podcast duration from these options: 
- 2 minutes: Very brief overview, single simple concept
- 5 minutes:  Quick summary, 2-3 main points
- 10 minutes:  Detailed explanation, multiple concepts
- 15 minutes:  Comprehensive deep-dive, complex topics

Respond with ONLY the number (2, 5, 10, or 15)."""

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an educational content analyzer. Respond with only a number."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3,
                max_tokens=10
            )
            
            # Parse AI recommendation
            try:
                duration_minutes = int(response.choices[0].message.content.strip())
                if duration_minutes not in [2, 5, 10, 15]:
                    duration_minutes = 5  # Default fallback
            except:
                duration_minutes = 5  # Default fallback
            
            print(f"✅ AI recommended duration: {duration_minutes} minutes")
        
        print(f"🎙️ Generating {duration_minutes}-minute podcast script...")
        
        # Adjust content depth based on duration
        if duration_minutes == 2:
            style = "very concise, covering only the absolute core concept"
            max_words = 300
        elif duration_minutes == 5:
            style = "concise but informative, covering 2-3 key points"
            max_words = 750
        elif duration_minutes == 10:
            style = "detailed and engaging, exploring multiple concepts with examples"
            max_words = 1500
        else:  # 15 minutes
            style = "comprehensive and in-depth, thoroughly explaining all major concepts"
            max_words = 2250
        
        prompt = f"""You are a professional podcast host creating an educational audio podcast.

TARGET DURATION: {duration_minutes} minutes (~{max_words} words)
STYLE: {style}

Source Content:
{text_content[:8000]}

Create an engaging podcast script that:
1.Opens with a warm, friendly introduction
2.Clearly explains the main concepts in a conversational tone
3.Uses examples and analogies to make concepts relatable
4.Maintains listener engagement throughout
5.Ends with a memorable summary and key takeaways

IMPORTANT: 
- Write in a natural, spoken style (not formal essay style)
- Use short sentences and simple language
- Include natural pauses and transitions
- Target approximately {max_words} words for {duration_minutes} minutes
- Make it sound like a conversation, not a lecture

Write the complete podcast script now: """

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a friendly podcast host creating a {duration_minutes}-minute educational podcast.Write naturally as if speaking to a friend."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=3000
        )
        
        script = response.choices[0].message.content
        print(f"✅ Generated {len(script)} character script for {duration_minutes}-minute podcast")
        
        return script

    async def chat_with_document(self, document_content: str, user_message: str, chat_history: list = []) -> str:
        """Chat about the document"""
        print(f"💬 Processing chat message: {user_message[: 50]}...")
        
        # Build conversation history
        messages = [
            {"role": "system", "content": f"""You are a helpful study assistant.Answer questions about this document: 

{document_content[: 4000]}

Only answer based on the document content.If the question is outside the document scope, politely say so."""}
        ]
        
        # Add chat history
        for msg in chat_history[-5:]:  # Last 5 messages
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        # Add current message
        messages.append({"role": "user", "content":  user_message})
        
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content