import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uofngwrwcjhsnknaiikx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZm5nd3J3Y2poc25rbmFpaWt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODc4NzgsImV4cCI6MjA5Nzk2Mzg3OH0.DbosBOcFygloeEjNuKo2hLdeU4YXiCGgs-xNOa3uo1w";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
