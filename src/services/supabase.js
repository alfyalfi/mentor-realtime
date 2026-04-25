import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // tangkap OAuth callback otomatis
  },
  realtime: {
    params: { eventsPerSecond: 20 },  // jangan flood
  },
})

// Tabel yang di-sync
export const TABLES = ['groups', 'members', 'sessions', 'attendance', 'stats_history']

// PK masing-masing tabel
export const PK_MAP = {
  groups:        'group_id',
  members:       'member_id',
  sessions:      'session_id',
  attendance:    'attendance_id',
  stats_history: 'stat_id',
}

export const isConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY)
