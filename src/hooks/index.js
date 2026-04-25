import { useState, useEffect, useCallback } from 'react'
import { membersDB, sessionsDB, attendanceDB, statsDB, db } from '../services/indexeddb'
import { enqueue } from '../services/sync'
import { generateId, attendanceId, statId } from '../utils/helpers'
import { DEFAULT_SCORES } from '../utils/constants'

// ── Helper: auto-reload hook saat ada perubahan Realtime ───
// Dipanggil sekali di setiap hook, dengan fungsi load() dan
// nama tabel yang relevan untuk hook tersebut.
function useRealtimeReload(load, tables) {
  useEffect(() => {
    function handleUpdate(e) {
      // Hanya reload kalau tabel yang berubah relevan dengan hook ini
      if (!tables || tables.includes(e.detail?.table)) {
        load()
      }
    }
    window.addEventListener('mentordb:updated', handleUpdate)
    return () => window.removeEventListener('mentordb:updated', handleUpdate)
  }, [load, tables])
}

// ── useMembers ─────────────────────────────────────────────
export function useMembers(group_id) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!group_id) { setMembers([]); setLoading(false); return }
    setLoading(true)
    const ms = await membersDB.getByGroup(group_id)
    ms.sort((a,b) => a.name.localeCompare(b.name))
    setMembers(ms)
    setLoading(false)
  }, [group_id])

  useEffect(() => { load() }, [load])
  useRealtimeReload(load, ['members'])  // ← reload otomatis saat ada perubahan anggota

  const saveMember = useCallback(async (data) => {
    const now = new Date().toISOString()
    const m = {
      ...data,
      member_id:  data.member_id || generateId('MBR'),
      group_id,
      created_at: data.created_at || now,
      updated_at: now,
    }
    await membersDB.put(m)
    await enqueue('upsert', 'members', m)
    await load()
    return m
  }, [group_id, load])

  const deleteMember = useCallback(async (member_id) => {
    await membersDB.delete(member_id)
    await enqueue('delete', 'members', { member_id, group_id })
    await load()
  }, [group_id, load])

  return { members, loading, saveMember, deleteMember, reload: load }
}

// ── useSessions ────────────────────────────────────────────
export function useSessions(group_id) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    if (!group_id) { setSessions([]); setLoading(false); return }
    setLoading(true)
    const ss = await sessionsDB.getByGroup(group_id)
    setSessions(ss)
    setLoading(false)
  }, [group_id])

  useEffect(() => { load() }, [load])
  useRealtimeReload(load, ['sessions'])  // ← reload otomatis saat ada perubahan sesi

  const saveSession = useCallback(async (data) => {
    const now = new Date().toISOString()
    const s = {
      ...data,
      session_id:  data.session_id || generateId('SES'),
      group_id,
      created_at:  data.created_at || now,
      status:      data.status || 'open',
    }
    await sessionsDB.put(s)
    await enqueue('upsert', 'sessions', s)
    await load()
    return s
  }, [group_id, load])

  const closeSession = useCallback(async (session_id) => {
    const s = await sessionsDB.get(session_id)
    if (!s) return
    const updated = { ...s, status: 'closed' }
    await sessionsDB.put(updated)
    await enqueue('upsert', 'sessions', updated)
    await load()
  }, [load])

  const deleteSession = useCallback(async (session_id) => {
    // Hapus attendance records terkait sesi ini
    const attRows = await attendanceDB.getBySession(session_id, group_id)
    for (const a of attRows) {
      await attendanceDB.delete(a.attendance_id)
      await enqueue('delete', 'attendance', { attendance_id: a.attendance_id, group_id })
    }
    // Hapus stats_history terkait sesi ini
    const statRows = await db.stats_history
      .where('session_id').equals(session_id)
      .filter(s => s.group_id === group_id)
      .toArray()
    for (const s of statRows) {
      await statsDB.delete(s.stat_id)
      await enqueue('delete', 'stats_history', { stat_id: s.stat_id, group_id })
    }
    await sessionsDB.delete(session_id)
    await enqueue('delete', 'sessions', { session_id, group_id })
    await load()
  }, [group_id, load])

  return { sessions, loading, saveSession, closeSession, deleteSession, reload: load }
}

// ── useAttendance ──────────────────────────────────────────
export function useAttendance(session_id, group_id) {
  const [records, setRecords] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session_id || !group_id) return
    setLoading(true)
    const rows = await attendanceDB.getBySession(session_id, group_id)
    const map  = {}
    rows.forEach(r => { map[r.member_id] = r })
    setRecords(map)
    setLoading(false)
  }, [session_id, group_id])

  useEffect(() => { load() }, [load])
  useRealtimeReload(load, ['attendance'])  // ← reload otomatis saat ada perubahan absensi

  // Initialize draft for all active members (all default = hadir)
  const initDraft = useCallback(async (members) => {
    const existing = await attendanceDB.getBySession(session_id, group_id)
    const existMap = {}
    existing.forEach(r => { existMap[r.member_id] = r })

    const draft = {}
    members.forEach(m => {
      draft[m.member_id] = existMap[m.member_id] || {
        attendance_id: attendanceId(session_id, m.member_id),
        group_id,
        session_id,
        member_id: m.member_id,
        status:    'hadir',
        note:      '',
      }
    })
    return draft
  }, [session_id, group_id])

  const saveAttendance = useCallback(async (draftMap) => {
    const now     = new Date().toISOString()
    const records = Object.values(draftMap).map(r => ({
      ...r,
      attendance_id: attendanceId(r.session_id, r.member_id),
      recorded_at:   now,
    }))
    await attendanceDB.bulkPut(records)
    for (const r of records) await enqueue('upsert', 'attendance', r)
    await load()
    return records
  }, [load])

  return { records, loading, initDraft, saveAttendance, reload: load }
}

// ── useStats ───────────────────────────────────────────────
export function useStats(member_id, group_id) {
  const [history, setHistory] = useState([])
  const [latest,  setLatest]  = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!member_id || !group_id) return
    setLoading(true)
    const [hist, lat] = await Promise.all([
      statsDB.getByMember(member_id, group_id),
      statsDB.getLatest(member_id, group_id),
    ])
    setHistory(hist)
    setLatest(lat)
    setLoading(false)
  }, [member_id, group_id])

  useEffect(() => { load() }, [load])
  useRealtimeReload(load, ['stats_history'])  // ← reload otomatis saat ada perubahan stats

  const initScores = useCallback(async (session_id) => {
    const existing = await statsDB.getBySession(session_id, member_id)
    if (existing) return existing.scores
    const lat = await statsDB.getLatest(member_id, group_id)
    return lat?.scores ?? { ...DEFAULT_SCORES }
  }, [member_id, group_id])

  const saveStat = useCallback(async (session_id, session_date, scores, note = '') => {
    const now = new Date().toISOString()
    const rec = {
      stat_id:        statId(session_id, member_id),
      group_id,
      session_id,
      member_id,
      session_date,
      scores,
      evaluator_note: note,
      recorded_at:    now,
    }
    await statsDB.put(rec)
    await enqueue('upsert', 'stats_history', rec)
    await load()
    return rec
  }, [member_id, group_id, load])

  return { history, latest, loading, initScores, saveStat, reload: load }
}
