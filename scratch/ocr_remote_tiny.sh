#!/bin/bash
for i in 1 2 3 4
do
    tesseract /tmp/page-tiny-$i.jpg /tmp/ocr-tiny-$i
done
cat /tmp/ocr-tiny-1.txt /tmp/ocr-tiny-2.txt /tmp/ocr-tiny-3.txt /tmp/ocr-tiny-4.txt > /tmp/jose-tamayo-pcp-ocr.txt
cat /tmp/jose-tamayo-pcp-ocr.txt
