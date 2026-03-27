import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nsijuvwgmdnqvbejytyt.supabase.co1";
const supabaseKey = "sb_publishable_begu2_8_hKwdVadii73E4Q_KUWma338";

export const supabase = createClient(supabaseUrl, supabaseKey);
