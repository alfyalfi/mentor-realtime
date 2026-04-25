/**
 * AuthContext.jsx  —  Supabase Auth
 *
 * - Login via Google OAuth (redirect flow) → session dikelola Supabase
 * - onAuthStateChange otomatis detect login/logout/token refresh
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { loginWithGoogle, logout as doLogout, isConfigured } from '../services/auth'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)   // true saat cek session awal
  const [error,   setError]   = useState(null)

  // ── Cek session saat pertama mount ─────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Dengarkan perubahan auth (login, logout, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Login ───────────────────────────────────────────────────
  const login = useCallback(async () => {
    if (!isConfigured()) {
      setError('Supabase belum dikonfigurasi — cek .env')
      return
    }
    setError(null)
    try {
      await loginWithGoogle()
      // Setelah redirect kembali, onAuthStateChange akan update user
    } catch (e) {
      setError(e.message || 'Login gagal')
    }
  }, [])

  // ── Logout ──────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      await doLogout()
    } catch (e) {
      console.warn('Logout error:', e.message)
    }
    setUser(null)
  }, [])

  const loggedIn = !!user

  return (
    <AuthCtx.Provider value={{
      user,
      loggedIn,
      loading,
      error,
      login,
      logout: handleLogout,
      isConfigured: isConfigured(),
      // Info user yang mudah diakses
      userEmail: user?.email ?? null,
      userName:  user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? null,
      userAvatar: user?.user_metadata?.avatar_url ?? null,
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
