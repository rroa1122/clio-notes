const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('C:/Users/REINIER/.gemini/antigravity/scratch/amexzone-notes-bot/.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const targetUserId = process.argv[2] || 'c630d8ae-2c39-4760-99f3-88ae4a824f92';
    const { data: integration, error } = await supabase
        .from('provider_integrations')
        .select('session_cookies')
        .eq('user_id', targetUserId)
        .maybeSingle();
        
    if (error) {
        console.error("Error:", error);
    } else if (integration) {
        console.log(`Saved Cookies count for ${targetUserId}:`, integration.session_cookies ? integration.session_cookies.length : 0);
        if (integration.session_cookies) {
            console.log(JSON.stringify(integration.session_cookies, null, 2));
        }
    }
}

main().catch(console.error);
