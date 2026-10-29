const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan credenciales de Supabase en .env (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
}

const ws = require('ws');
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
        transport: ws
    }
});

module.exports = {
    supabase,
    supabaseUrl,
    supabaseKey
};
