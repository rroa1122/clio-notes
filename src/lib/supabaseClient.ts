
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://klsbxpwvhwklnynsexkj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc2J4cHd2aHdrbG55bnNleGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjQ2NzMsImV4cCI6MjA4MzI0MDY3M30.wLwlmG3m_84Kan7a1icYGu1DsmkR5jFtiM1q_hOkCVc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
