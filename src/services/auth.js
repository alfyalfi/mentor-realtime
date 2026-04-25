/**
 * auth.js  —  Supabase Auth + Google OAuth
 *
 * Menggantikan Google Identity Services (GIS) lama.
 * Supabase menangani token, refresh, dan session secara otomatis.
 */
import { supabase } from './supabase'

// ── Sign in dengan Google ─────────────────────────────────────
export async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Kembali ke halaman yang sama setelah OAuth callback
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      scopes: 'email profile',
    },
  })
  if (error) throw new Error(error.message)
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// ── Ambil session saat ini (sync) ─────────────────────────────
export function getSession() {
  // Supabase simpan session di localStorage otomatis
  // Gunakan getSession() untuk cek awal
  return supabase.auth.getSession()
}

// ── Ambil user saat ini ───────────────────────────────────────
export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

// ── Dengar perubahan auth state ───────────────────────────────
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return data.subscription.unsubscribe  // return unsubscribe fn
}

export const isConfigured = () => !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
