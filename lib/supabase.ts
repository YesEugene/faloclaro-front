import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    fetch: (url, options = {}) => {
      // Ensure Accept header is always set for REST API requests
      const headers = new Headers(options.headers);
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
      }
      if (!headers.has('apikey')) {
        headers.set('apikey', supabaseAnonKey);
      }
      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
})
