import os
import asyncio
import re
from pathlib import Path
from dotenv import load_dotenv
from services.oumi_client import OumiClient

load_dotenv()


class TTSService:
    def __init__(self):
        print("✅ TTSService initialized with Oumi AI")
        
        self.oumi = OumiClient()
        
        # Setup output directory
        self.output_dir = Path(__file__).parent.parent / "outputs" / "podcasts"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📁 Podcast output directory: {self.output_dir}")

    async def generate_podcast_audio(self, script: str, document_id: str) -> str:
        """Generate podcast audio from script using Oumi TTS"""
        print("🎧 Generating podcast audio...")
        print(f"   Script length: {len(script)} characters")
        
        estimated_words = len(script) / 5
        estimated_minutes = estimated_words / 150
        print(f"   Estimated duration: {estimated_minutes:.1f} minutes")
        
        output_path = self.output_dir / f"{document_id}.mp3"
        
        try:
            await self._generate_with_oumi(script, str(output_path), document_id)
            
            print(f"✅ Podcast audio generated:  {output_path}")
            return str(output_path)
            
        except Exception as e:
            print(f"❌ TTS Error: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Failed to generate podcast audio: {str(e)}")

    async def _generate_with_oumi(self, script: str, output_path: str, document_id:  str):
        """Generate audio using Oumi TTS API"""
        print("   Using Oumi TTS...")
        
        max_chunk_size = 4000
        
        if len(script) <= max_chunk_size:
            await self._generate_single_chunk(script, output_path)
        else:
            await self._generate_multiple_chunks(script, output_path, document_id)

    async def _generate_single_chunk(self, text: str, output_path: str):
        """Generate audio for a single text chunk"""
        audio_bytes = await self.oumi.text_to_speech(
            text=text,
            voice="alloy",
            model="tts-1",
            speed=1.0
        )
        
        with open(output_path, 'wb') as f:
            f.write(audio_bytes)

    async def _generate_multiple_chunks(self, script: str, output_path: str, document_id: str):
        """Generate audio for multiple chunks and merge"""
        print(f"   Script is long ({len(script)} chars), splitting...")
        
        sentences = self._split_into_sentences(script)
        chunks = self._group_sentences_into_chunks(sentences, max_size=4000)
        
        print(f"   Generated {len(chunks)} chunks")
        
        temp_files = []
        for i, chunk in enumerate(chunks):
            print(f"   Generating chunk {i+1}/{len(chunks)}...")
            temp_path = self.output_dir / f"temp_{document_id}_{i}.mp3"
            
            audio_bytes = await self.oumi.text_to_speech(
                text=chunk,
                voice="alloy",
                speed=1.0
            )
            
            with open(temp_path, 'wb') as f:
                f.write(audio_bytes)
            
            temp_files.append(str(temp_path))
        
        print(f"   Merging {len(temp_files)} audio files...")
        await self._merge_audio_files(temp_files, output_path)
        
        for temp_file in temp_files:
            try:
                os.remove(temp_file)
            except: 
                pass

    def _split_into_sentences(self, text:  str) -> list:
        """Split text into sentences"""
        sentences = re.split(r'(? <=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _group_sentences_into_chunks(self, sentences: list, max_size: int) -> list:
        """Group sentences into chunks"""
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 > max_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
            else: 
                current_chunk += " " + sentence if current_chunk else sentence
        
        if current_chunk:
            chunks.append(current_chunk. strip())
        
        return chunks

    async def _merge_audio_files(self, input_files: list, output_path: str):
        """Merge multiple MP3 files"""
        try:
            from pydub import AudioSegment
            
            combined = AudioSegment.empty()
            for file_path in input_files:
                audio = AudioSegment.from_mp3(file_path)
                combined += audio
            
            combined.export(output_path, format="mp3")
            print(f"   ✅ Merged {len(input_files)} files")
            
        except ImportError:
            print("   Using ffmpeg for merging...")
            import subprocess
            
            list_file = self.output_dir / "merge_list.txt"
            with open(list_file, 'w') as f:
                for file_path in input_files: 
                    f.write(f"file '{file_path}'\n")
            
            cmd = [
                'ffmpeg', '-f', 'concat', '-safe', '0',
                '-i', str(list_file), '-c', 'copy', str(output_path), '-y'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"ffmpeg merge failed: {result.stderr}")
            
            os.remove(list_file)
            print(f"   ✅ Merged with ffmpeg")
