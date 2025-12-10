import os
import asyncio
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class TTSService:
    def __init__(self):
        print("✅ TTSService initialized")
        
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key: 
            raise Exception("OPENAI_API_KEY not found in environment")
        
        self.client = OpenAI(api_key=api_key)
        
        # Setup output directory
        self.output_dir = Path(__file__).parent.parent / "outputs" / "podcasts"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📁 Podcast output directory: {self.output_dir}")

    async def generate_podcast_audio(self, script:  str, document_id: str) -> str:
        """Generate podcast audio from script using OpenAI TTS"""
        print("🎧 Generating podcast audio...")
        print(f"   Script length: {len(script)} characters")
        
        # Estimate duration (rough:  150 words per minute, ~5 chars per word)
        estimated_words = len(script) / 5
        estimated_minutes = estimated_words / 150
        print(f"   Estimated duration:  {estimated_minutes:.1f} minutes")
        
        # Generate output path
        output_path = self.output_dir / f"{document_id}.mp3"
        
        try:
            # Use OpenAI TTS
            await self._generate_with_openai(script, str(output_path), document_id)
            
            print(f"✅ Podcast audio generated:  {output_path}")
            return str(output_path)
            
        except Exception as e: 
            print(f"❌ TTS Error: {e}")
            raise Exception(f"Failed to generate podcast audio: {str(e)}")

    async def _generate_with_openai(self, script: str, output_path: str, document_id:  str):
        """Generate audio using OpenAI TTS API"""
        print("   Using OpenAI TTS (alloy voice)...")
        
        # OpenAI TTS has a limit of ~4096 characters per request
        # So we need to split long scripts into chunks
        max_chunk_size = 4000
        
        if len(script) <= max_chunk_size:
            # Single chunk - direct generation
            await self._generate_single_chunk(script, output_path)
        else:
            # Multiple chunks - split, generate, and merge
            await self._generate_multiple_chunks(script, output_path, document_id)

    async def _generate_single_chunk(self, text: str, output_path: str):
        """Generate audio for a single text chunk"""
        response = self.client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text,
            speed=1.0
        )
        
        # Save to file
        response.stream_to_file(output_path)

    async def _generate_multiple_chunks(self, script: str, output_path: str, document_id: str):
        """Generate audio for multiple chunks and merge them"""
        print(f"   Script is long ({len(script)} chars), splitting into chunks...")
        
        # Split script into sentences
        sentences = self._split_into_sentences(script)
        
        # Group sentences into chunks of ~4000 characters
        chunks = self._group_sentences_into_chunks(sentences, max_size=4000)
        
        print(f"   Generated {len(chunks)} chunks")
        
        # Generate audio for each chunk
        temp_files = []
        for i, chunk in enumerate(chunks):
            print(f"   Generating chunk {i+1}/{len(chunks)}...")
            temp_path = self.output_dir / f"temp_{document_id}_{i}.mp3"
            
            response = self.client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=chunk,
                speed=1.0
            )
            
            response.stream_to_file(str(temp_path))
            temp_files.append(str(temp_path))
        
        # Merge audio files
        print(f"   Merging {len(temp_files)} audio files...")
        await self._merge_audio_files(temp_files, output_path)
        
        # Clean up temp files
        for temp_file in temp_files: 
            try:
                os.remove(temp_file)
            except: 
                pass

    def _split_into_sentences(self, text:  str) -> list:
        """Split text into sentences"""
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _group_sentences_into_chunks(self, sentences: list, max_size: int) -> list:
        """Group sentences into chunks that don't exceed max_size"""
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            # If adding this sentence would exceed max_size, start a new chunk
            if len(current_chunk) + len(sentence) + 1 > max_size:
                if current_chunk: 
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else: 
                current_chunk += " " + sentence if current_chunk else sentence
        
        # Add the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks

    async def _merge_audio_files(self, input_files: list, output_path: str):
        """Merge multiple MP3 files into one using ffmpeg"""
        try:
            from pydub import AudioSegment
            
            # Combine all audio files
            combined = AudioSegment.empty()
            for file_path in input_files:
                audio = AudioSegment.from_mp3(file_path)
                combined += audio
            
            # Export combined audio
            combined.export(output_path, format="mp3")
            print(f"   ✅ Merged {len(input_files)} files into {output_path}")
            
        except ImportError:
            # Fallback:  use ffmpeg directly
            print("   Using ffmpeg for merging...")
            
            # Create a file list for ffmpeg
            list_file = self.output_dir / "merge_list.txt"
            with open(list_file, 'w') as f:
                for file_path in input_files:
                    f.write(f"file '{file_path}'\n")
            
            # Run ffmpeg
            import subprocess
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(list_file),
                '-c', 'copy',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"ffmpeg merge failed: {result.stderr}")
            
            # Clean up list file
            os.remove(list_file)
            print(f"   ✅ Merged with ffmpeg")