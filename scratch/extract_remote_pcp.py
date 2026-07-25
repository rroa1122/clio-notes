import pypdf

reader = pypdf.PdfReader('/tmp/jose-tamayo-pcp.pdf')
text = '\n'.join([p.extract_text() for p in reader.pages])
with open('/tmp/jose-tamayo-pcp.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print(f"Extracted {len(text)} characters")
