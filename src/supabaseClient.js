import { createClient } from '@supabase/supabase-js';

// Fix the environment variable names and add better error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add detailed logging for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase credentials are missing! Check your .env file.');
}

// Create a dummy client as fallback
const dummyClient = {
  auth: {
    signUp: () => Promise.reject(new Error('Supabase client failed to initialize')),
    signInWithPassword: () => Promise.reject(new Error('Supabase client failed to initialize')),
    getSession: () => Promise.reject(new Error('Supabase client failed to initialize')),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.reject(new Error('Supabase client failed to initialize')),
      }),
    }),
    insert: () => Promise.reject(new Error('Supabase client failed to initialize')),
  }),
};

// Initialize the client outside of try/catch
let supabase;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test the connection - only destructure error since we're not using data
  supabase.auth.getSession().then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful');
    }
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabase = dummyClient;
}

export { supabase };
