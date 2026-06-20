import fs from 'fs';
import path from 'path';

async function run() {
    const logFile = path.resolve('capture.log');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    try {
        log("Starting capture...");
        const wavPath = path.resolve('dummy_test.wav');

        // Create valid 1-second silence WAV
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + 32000, 4); // Length
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20); // PCM
        header.writeUInt16LE(1, 22); // Mono
        header.writeUInt32LE(16000, 24); // Sample Rate
        header.writeUInt32LE(32000, 28); // Byte Rate
        header.writeUInt16LE(2, 32); // Block Align
        header.writeUInt16LE(16, 34); // Bits per Sample
        header.write('data', 36);
        header.writeUInt32LE(32000, 40); // Data Size

        const data = Buffer.alloc(32000, 0); // Silence
        const wavBuffer = Buffer.concat([header, data]);
        fs.writeFileSync(wavPath, wavBuffer);
        log(`Created dummy WAV at ${wavPath} (${wavBuffer.length} bytes)`);

        const formData = new FormData();
        // Create a Blob from the buffer
        const fileBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        formData.append('audio', fileBlob, 'test_audio.wav');
        formData.append('patientName', 'Real Payload Test');
        formData.append('patientDob', '1985-05-15');
        formData.append('userId', 'test-user-node');
        formData.append('context', 'Verify output format');

        const url = 'https://n8n.clinicflow.dev/webhook/medical-note';
        log(`Posting to ${url}...`);

        const res = await fetch(url, {
            method: 'POST',
            body: formData
        });

        log(`Response Status: ${res.status}`);
        const text = await res.text();
        log(`Response Length: ${text.length}`);

        try {
            const json = JSON.parse(text);
            log("--- RAW WEBHOOK RESPONSE START ---");
            log(JSON.stringify(json, null, 2));
            log("--- RAW WEBHOOK RESPONSE END ---");
        } catch (e) {
            log("Response is not JSON:");
            log(text);
        }

    } catch (err: any) {
        log(`CRITICAL ERROR: ${err}`);
        if (err?.stack) log(err.stack);
    }
}

run();
