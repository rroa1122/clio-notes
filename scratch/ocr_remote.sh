#!/bin/bash
for i in 1 2 3 4
do
    echo "OCR-ing page $i..."
    tesseract /tmp/page-small-$i.png /tmp/ocr-small-$i
done
cat /tmp/ocr-small-1.txt /tmp/ocr-small-2.txt /tmp/ocr-small-3.txt /tmp/ocr-small-4.txt > /tmp/jose-tamayo-pcp-ocr.txt
echo "OCR complete! Total characters: $(wc -m < /tmp/jose-tamayo-pcp-ocr.txt)"
