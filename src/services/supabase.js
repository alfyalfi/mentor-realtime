import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const CONFIGURED = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

function createDisabledClient() {
  const disabledError = () => ({ error: new Error('Supabase belum dikonfigurasi') })
  const noopSubscription = { unsubscribe() {} }
  const noopChannel = {
    on() { return this },
    subscribe() { return this },
    unsubscribe() {},
  }

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: noopSubscription } }),
      signInWithOAuth: async () => disabledError(),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: async () => disabledError(),
      upsert: async () => disabledError(),
      delete: () => ({ eq: async () => disabledError() }),
    }),
    channel: () => noopChannel,
  }
}

export const supabase = CONFIGURED ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // tangkap OAuth callback otomatis
  },
  realtime: {
    params: { eventsPerSecond: 20 },  // jangan flood
  },
}) : createDisabledClient()

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

export const isConfigured = () => CONFIGURED
