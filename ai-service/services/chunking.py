from typing import List, Dict
import uuid


class TextChunker:
    def __init__(self, max_chunk_size: int = 2000, min_chunk_size: int = 300):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
    
    def chunk(self, text: str, document_id: str) -> List[Dict]:
        """Smart chunking based on content structure"""
        
        print(f"Starting chunking for document: {document_id}")
        print(f"Input text length: {len(text)} characters")
        
        if not text or len(text.strip()) == 0:
            print("Empty text received, returning empty chunks")
            return []
        
        # Clean the text first
        text = self._clean_text(text)
        
        # Split into sections
        sections = self._split_by_sections(text)
        
        print(f"Split into {len(sections)} sections")
        
        chunks = []
        chunk_order = 0
        
        for section in sections:
            section_text = section["text"].strip()
            
            if not section_text or len(section_text) < 50:
                continue
            
            # If section is too large, split further
            if len(section_text) > self.max_chunk_size:
                sub_chunks = self._split_large_text(section_text)
                for sub_chunk in sub_chunks:
                    sub_chunk = sub_chunk.strip()
                    if len(sub_chunk) >= 50:
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "document_id": document_id,
                            "title": self._generate_title(sub_chunk, chunk_order),
                            "text": sub_chunk,
                            "order": chunk_order,
                            "char_count": len(sub_chunk)
                        })
                        chunk_order += 1
            else:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "document_id": document_id,
                    "title": section.get("title", self._generate_title(section_text, chunk_order)),
                    "text": section_text,
                    "order": chunk_order,
                    "char_count": len(section_text)
                })
                chunk_order += 1
        
        # If no chunks created, create one from entire text
        if not chunks and text.strip():
            print("No chunks created from sections, creating single chunk")
            chunks.append({
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "title": "Main Content",
                "text": text.strip()[:self.max_chunk_size],
                "order": 0,
                "char_count": min(len(text), self.max_chunk_size)
            })
        
        print(f"Created {len(chunks)} total chunks")
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean text before chunking"""
        # Remove null characters
        text = text.replace('\x00', '')
        # Normalize whitespace (without regex)
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            # Replace multiple spaces with single space
            words = line.split()
            cleaned_line = ' '.join(words)
            cleaned_lines.append(cleaned_line)
        text = '\n'.join(cleaned_lines)
        return text.strip()
    
    def _split_by_sections(self, text: str) -> List[Dict]:
        """Split text by section headings"""
        
        sections = []
        lines = text.split('\n')
        
        current_section = {"title": "Introduction", "text": ""}
        
        for line in lines:
            line_stripped = line.strip()
            
            # Check if this line looks like a heading
            is_heading = self._is_heading(line_stripped)
            
            if is_heading and len(current_section["text"].strip()) > 100:
                # Save current section and start new one
                sections.append(current_section)
                current_section = {"title": line_stripped[:60], "text": line + "\n"}
            else:
                current_section["text"] += line + "\n"
        
        # Don't forget the last section
        if current_section["text"].strip():
            sections.append(current_section)
        
        # If we only got one section, try splitting by double newlines
        if len(sections) <= 1 and len(text) > self.max_chunk_size:
            sections = self._split_by_paragraphs(text)
        
        return sections
    
    def _is_heading(self, line: str) -> bool:
        """Check if a line looks like a heading"""
        if not line or len(line) < 3 or len(line) > 100:
            return False
        
        # ALL CAPS heading
        if line.isupper() and len(line) >= 3:
            return True
        
        # Numbered heading: "1.", "1.1 ", etc.
        if len(line) > 3:
            # Check for patterns like "1.Title" or "1.1 Title"
            parts = line.split(' ', 1)
            if len(parts) >= 1:
                first_part = parts[0]
                if first_part.replace('.', '').isdigit():
                    return True
        
        # Check for "Chapter" or "Section" keywords
        line_lower = line.lower()
        if line_lower.startswith('chapter ') or line_lower.startswith('section '):
            return True
        
        # Check for "Unit" keyword
        if line_lower.startswith('unit '):
            return True
        
        return False
    
    def _split_by_paragraphs(self, text: str) -> List[Dict]:
        """Split by paragraph breaks (double newlines)"""
        # Split by double newlines
        parts = text.split('\n\n')
        
        sections = []
        current_section = {"title": "Section 1", "text": ""}
        section_num = 1
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            if len(current_section["text"]) + len(part) <= self.max_chunk_size:
                current_section["text"] += part + "\n\n"
            else:
                if current_section["text"].strip():
                    sections.append(current_section)
                section_num += 1
                current_section = {
                    "title": f"Section {section_num}",
                    "text": part + "\n\n"
                }
        
        if current_section["text"].strip():
            sections.append(current_section)
        
        return sections
    
    def _split_large_text(self, text: str) -> List[str]:
        """Split large text into smaller chunks"""
        # First try splitting by double newlines
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            if len(current_chunk) + len(para) + 2 <= self.max_chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                
                # If single paragraph is too large, split by sentences
                if len(para) > self.max_chunk_size:
                    sentence_chunks = self._split_by_sentences(para)
                    chunks.extend(sentence_chunks)
                    current_chunk = ""
                else:
                    current_chunk = para + "\n\n"
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _split_by_sentences(self, text: str) -> List[str]:
        """Split text by sentences (without using regex)"""
        # Simple sentence splitting by common endings
        sentences = []
        current_sentence = ""
        
        i = 0
        while i < len(text):
            char = text[i]
            current_sentence += char
            
            # Check for sentence ending
            if char in '.! ?':
                # Check if it's really end of sentence (followed by space and capital, or end of text)
                if i + 1 >= len(text):
                    # End of text
                    sentences.append(current_sentence.strip())
                    current_sentence = ""
                elif i + 2 < len(text) and text[i + 1] == ' ' and text[i + 2].isupper():
                    # Followed by space and capital letter
                    sentences.append(current_sentence.strip())
                    current_sentence = ""
                    i += 1  # Skip the space
            
            i += 1
        
        # Don't forget remaining text
        if current_sentence.strip():
            sentences.append(current_sentence.strip())
        
        # Now group sentences into chunks
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 1 <= self.max_chunk_size:
                current_chunk += sentence + " "
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + " "
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # If we still have no chunks, just split by character count
        if not chunks:
            chunks = self._split_by_length(text)
        
        return chunks
    
    def _split_by_length(self, text: str) -> List[str]:
        """Last resort: split by character count"""
        chunks = []
        
        while len(text) > self.max_chunk_size:
            # Find a good break point (space) near max_chunk_size
            break_point = self.max_chunk_size
            
            # Look for a space to break at
            while break_point > self.max_chunk_size - 200 and break_point > 0:
                if text[break_point] == ' ':
                    break
                break_point -= 1
            
            if break_point <= 0:
                break_point = self.max_chunk_size
            
            chunks.append(text[:break_point].strip())
            text = text[break_point:].strip()
        
        if text:
            chunks.append(text)
        
        return chunks
    
    def _generate_title(self, text: str, order: int) -> str:
        """Generate a title from text content"""
        # Get first line
        lines = text.split('\n')
        first_line = lines[0].strip() if lines else ""
        
        # Clean up the first line
        # Remove leading numbers/bullets
        cleaned = first_line.lstrip('0123456789.-*# ')
        
        # Get first sentence (up to first period)
        if '.' in cleaned:
            title = cleaned.split('.')[0].strip()
        else:
            title = cleaned
        
        # Limit length
        if len(title) > 60:
            title = title[:57] + "..."
        elif len(title) < 5:
            title = f"Section {order + 1}"
        
        return title