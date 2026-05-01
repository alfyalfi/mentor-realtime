/**
 * AppContext.jsx  —  Group + Sync Context
 *
 * SyncProvider sekarang:
 *   - Subscribe Supabase Realtime
 *   - Expose `lastUpdate` → halaman pakai useEffect([lastUpdate]) untuk refresh
 *   - Flush queue saat online
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { groupsDB, syncQueueDB } from '../services/indexeddb'
import { initSync, runSync, subscribeRealtime } from '../services/sync'
import { isConfigured } from '../services/supabase'

// ─────────────────────────────────────────────────────────────
// Theme helper
// ─────────────────────────────────────────────────────────────
function getGroupTheme(group) {
  if (!group) return 'cyan'
  const name = (group.group_name || '').toLowerCase()
  const yellowKeys = ['pixie', 'yellow', 'gold', 'sunny', 'warm', 'amber']
  if (yellowKeys.some(k => name.includes(k))) return 'yellow'
  return 'cyan'
}

function applyTheme(theme) {
  if (theme === 'yellow') {
    document.documentElement.setAttribute('data-theme', 'yellow')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

// ─────────────────────────────────────────────────────────────
// Group Context
// ─────────────────────────────────────────────────────────────
const GroupCtx = createContext(null)

export function GroupProvider({ children }) {
  const [groups,      setGroups]           = useState([])
  const [activeGroup, setActiveGroupState] = useState(null)
  const [loading,     setLoading]          = useState(true)
  const [theme,       setTheme]            = useState('cyan')

  const loadGroups = useCallback(async () => {
    const gs = await groupsDB.getAll()
    setGroups(gs)
    const lastId = localStorage.getItem('beat_active_group')
    const found  = gs.find(g => g.group_id === lastId) ?? gs[0] ?? null
    setActiveGroupState(found)
    const t = getGroupTheme(found)
    setTheme(t)
    applyTheme(t)
    setLoading(false)
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  // Refresh groups saat ada perubahan dari Realtime
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.table === 'groups') loadGroups()
    }
    window.addEventListener('mentordb:updated', handler)
    return () => window.removeEventListener('mentordb:updated', handler)
  }, [loadGroups])

  const setActiveGroup = useCallback((g) => {
    setActiveGroupState(g)
    const t = getGroupTheme(g)
    setTheme(t)
    applyTheme(t)
    if (g) localStorage.setItem('beat_active_group', g.group_id)
  }, [])

  const refreshGroups = useCallback(async () => {
    const gs = await groupsDB.getAll()
    setGroups(gs)
    if (activeGroup) {
      const updated = gs.find(g => g.group_id === activeGroup.group_id)
      if (updated) setActiveGroupState(updated)
    }
  }, [activeGroup])

  return (
    <GroupCtx.Provider value={{ groups, activeGroup, setActiveGroup, loading, refreshGroups, theme }}>
      {children}
    </GroupCtx.Provider>
  )
}

export const useGroup = () => useContext(GroupCtx)

// ─────────────────────────────────────────────────────────────
// Sync Context
// ─────────────────────────────────────────────────────────────
const SyncCtx = createContext(null)

export function SyncProvider({ children }) {
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  // lastUpdate: timestamp diincrement tiap ada perubahan Realtime
  // Halaman subscribe ke nilai ini untuk auto-refresh
  const [lastUpdate, setLastUpdate] = useState(0)
  const unsubRef = useRef(null)

  // ── Init sync listeners (sekali) ───────────────────────────
  useEffect(() => {
    initSync()
    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // ── Subscribe Realtime tanpa login (public anon) ───────────
  useEffect(() => {
    if (!isConfigured()) {
      unsubRef.current?.()
      return
    }

    unsubRef.current = subscribeRealtime((table, eventType) => {
      console.log(`[realtime] ${table} ${eventType}`)
      // Bump lastUpdate → halaman yang listen akan re-fetch dari IndexedDB
      setLastUpdate(prev => prev + 1)
    })

    return () => unsubRef.current?.()
  }, [])

  // ── Poll pending count ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const c = await syncQueueDB.countPending()
      setPendingCount(c)
    }, 5_000)
    return () => clearInterval(interval)
  }, [])

  // ── Manual sync now ─────────────────────────────────────────
  const syncNow = useCallback(async () => {
    setIsSyncing(true)
    await runSync()
    setIsSyncing(false)
    const c = await syncQueueDB.countPending()
    setPendingCount(c)
    if (c === 0) setLastSyncedAt(new Date())
  }, [])

  return (
    <SyncCtx.Provider value={{
      isOnline,
      pendingCount,
      isSyncing,
      syncNow,
      lastSyncedAt,
      lastUpdate,   // ← baru: halaman subscribe ini untuk auto-refresh
    }}>
      {children}
    </SyncCtx.Provider>
  )
}

export const useSync = () => useContext(SyncCtx)
