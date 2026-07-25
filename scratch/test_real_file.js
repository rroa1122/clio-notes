import fs from 'fs';
import path from 'path';

async function testRealFile() {
    const filePath = 'C:/Users/REINIER/Downloads/1782930091482-jose-tamayo-psy.pdf';
    console.log(`Reading file from ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
        console.error("File does not exist!");
        return;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`File size: ${fileBuffer.length} bytes`);
    
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('file', blob, path.basename(filePath));
    formData.append('filename', path.basename(filePath));
    
    const url = 'https://n8n.clinicflow.dev/webhook/pacienteinfo';
    console.log(`Sending POST to ${url}...`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Response text: ${text.slice(0, 1000)}`);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testRealFile();
