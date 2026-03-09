import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bvavdhratcsflzsrclpe.supabase.co";
const supabaseKey = "sb_publishable_hUU9O-2Vc3I4eAsW9S3eNA_TinhiG5j";

export const supabase = createClient(supabaseUrl, supabaseKey);
