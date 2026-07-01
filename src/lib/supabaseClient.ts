
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://toisvwdmscmnogzcpeyj.supabase.co';
const supabaseAnonKey = 'sb_publishable_E7E4184wtBhtTXD0hobNnQ_OALEmO9G';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
