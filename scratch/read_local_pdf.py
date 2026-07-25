import os
import sys

# Try to use pypdf or pdfplumber to read the text of the PDF
try:
    import pypdf
    reader = pypdf.PdfReader("C:/Users/REINIER/Downloads/1782930091482-jose-tamayo-psy.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print("EXTRACTED TEXT:")
    print(text[:2000]) # print first 2000 chars
    with open("scratch/pdf_text_content.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("\nWrote full text to scratch/pdf_text_content.txt")
except ImportError:
    print("pypdf is not installed. Trying to install and run...")
    os.system("pip install pypdf")
    import pypdf
    reader = pypdf.PdfReader("C:/Users/REINIER/Downloads/1782930091482-jose-tamayo-psy.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print("EXTRACTED TEXT:")
    print(text[:2000])
    with open("scratch/pdf_text_content.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("\nWrote full text to scratch/pdf_text_content.txt")
