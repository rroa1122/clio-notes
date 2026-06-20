import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://klsbxpwvhwklnynsexkj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc2J4cHd2aHdrbG55bnNleGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjQ2NzMsImV4cCI6MjA4MzI0MDY3M30.wLwlmG3m_84Kan7a1icYGu1DsmkR5jFtiM1q_hOkCVc';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    // 1. Get the latest note
    const { data: notes, error: fetchError } = await supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(1);

    if (fetchError || !notes || !notes.length) return console.error("Could not fetch note", fetchError);

    const note = notes[0];
    const token = crypto.randomUUID();

    console.log("Found note ID:", note.id);

    // 2. Set as pending
    await supabase.from('notes').update({
        signature_token: token,
        signature_status: 'pending',
        supervisor_email: 'test@clinicflow.dev'
    }).eq('id', note.id);

    console.log("Note set to pending signature with token:", token);

    // 3. Fake a signature data URL (small 1x1 red pixel)
    const fakeSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    // 4. Call the RPC to sign it
    const { data: signData, error: signError } = await supabase.rpc('sign_note_with_token', {
        p_token: token,
        p_signature: fakeSignature
    });

    if (signError) return console.error("RPC Error:", signError);
    console.log("SUCCESSFULLY SIGNED NOTE ID:", note.id);
}
main();
