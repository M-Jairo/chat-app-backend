import { createClient } from "@supabase/supabase-js";
const SPurl = process.env.DB_URL;
const SPkey = process.env.DB_KEY;
export const supabase = SPurl && SPkey && createClient(SPurl, SPkey);
