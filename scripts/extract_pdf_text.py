#!/usr/bin/env python3
import sys
import PyPDF2
import json

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyPDF2"""
    try:
        # Initialize a PDF reader
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # Extract text from all pages
            extracted_text = ""
            total_pages = len(reader.pages)
            
            for page_num in range(total_pages):
                page = reader.pages[page_num]
                page_text = page.extract_text()
                if page_text.strip():  # Only add non-empty pages
                    extracted_text += page_text + "\n\n"
            
            # Clean up the text
            extracted_text = extracted_text.strip()
            
            return {
                "success": True,
                "text": extracted_text,
                "pages": total_pages,
                "length": len(extracted_text)
            }
    
    except Exception as error:
        return {
            "success": False,
            "error": str(error),
            "text": "",
            "pages": 0,
            "length": 0
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python extract_pdf_text.py <pdf_path>",
            "text": "",
            "pages": 0,
            "length": 0
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_text_from_pdf(pdf_path)
    print(json.dumps(result)) 