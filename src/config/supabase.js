import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Tipos TypeScript para as tabelas (para melhor desenvolvimento)
export const TABLES = {
  USER_PROFILES: 'user_profiles',
  CLIENTS: 'clients',
  LOANS: 'loans',
  PAYMENTS: 'payments'
}

export const STORAGE_BUCKETS = {
  CLIENT_DOCUMENTS: 'client-documents'
}