import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://toisvwdmscmnogzcpeyj.supabase.co';
const supabaseAnonKey = 'sb_publishable_E7E4184wtBhtTXD0hobNnQ_OALEmO9G';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const email = 'prueba2fa@clionotes.com';
    const password = 'Prueba123456!';

    console.log(`Creating user ${email}...`);
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error("Error creating user:", error);
    } else {
        console.log("User created successfully:", data.user?.id);
        console.log("Session established:", Boolean(data.session));
    }
}

main();
