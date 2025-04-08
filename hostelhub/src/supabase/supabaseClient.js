import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fnpcrtijcpzpfficeuvw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucGNydGlqY3B6cGZmaWNldXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwOTEwNzQsImV4cCI6MjA1NzY2NzA3NH0.4LyrW9XQ5LcHeRKuZvELXei6_fAn5y1irrle6wUWKB0";
export const supabase = createClient(supabaseUrl, supabaseKey);