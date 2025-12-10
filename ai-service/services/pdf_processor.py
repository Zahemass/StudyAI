import pdfplumber
import re
from typing import Dict, List


class PDFProcessor:
    def __init__(self):
        pass
    
    def extract_text(self, file_path: str) -> Dict:
        """Extract text from PDF using pdfplumber"""
        try:
            text_content = []
            metadata = {}
            
            with pdfplumber.open(file_path) as pdf:
                metadata = {
                    "total_pages": len(pdf.pages),
                }
                
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        text_content.append({
                            "page_number": i + 1,
                            "text": self._clean_text(page_text)
                        })
            
            # Combine all text
            full_text = "\n\n".join([p["text"] for p in text_content])
            
            return {
                "full_text": full_text,
                "pages": text_content,
                "metadata": metadata,
                "total_characters": len(full_text),
                "total_words": len(full_text.split())
            }
        except Exception as e:
            raise Exception(f"PDF processing error: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # Remove multiple spaces
        text = re.sub(r' +', ' ', text)
        # Remove multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove page numbers (common patterns)
        text = re.sub(r'\n\d+\n', '\n', text)
        # Strip whitespace
        text = text.strip()
        return text