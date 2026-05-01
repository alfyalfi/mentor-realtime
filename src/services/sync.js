/**
 * sync.js  —  Supabase Realtime + Offline Queue
 *
 * Alur:
 *   1. Setiap mutasi ditulis ke IndexedDB dulu (offline-first)
 *   2. Jika online  → langsung upsert/delete ke Supabase
 *   3. Jika offline → masuk sync_queue, flush saat online lagi
 *   4. Supabase Realtime broadcast perubahan ke semua device → update IndexedDB lokal
 */
import { db, syncQueueDB } from './indexeddb'
import { supabase, TABLES, PK_MAP, isConfigured } from './supabase'
import { generateId } from '../utils/helpers'

const DB_MAP = {
  groups:        db.groups,
  members:       db.members,
  sessions:      db.sessions,
  attendance:    db.attendance,
  stats_history: db.stats_history,
}

let syncing         = false
let listenersAdded  = false
let realtimeChannel = null

function normalizeStatsHistoryRow(row) {
  if (!row || typeof row !== 'object') return row
  if (!row.scores || typeof row.scores !== 'object') return row
  return {
    ...row,
    loyalitas: row.scores.loyalitas ?? row.loyalitas ?? null,
    skill: row.scores.skill ?? row.skill ?? null,
    kreativitas: row.scores.kreativitas ?? row.kreativitas ?? null,
    attitude: row.scores.attitude ?? row.attitude ?? null,
    synergy: row.scores.synergy ?? row.synergy ?? null,
    scores: undefined,
  }
}

function normalizePayloadForSupabase(table, payload) {
  if (table !== 'stats_history') return payload
  if (Array.isArray(payload)) return payload.map(normalizeStatsHistoryRow)
  return normalizeStatsHistoryRow(payload)
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: kirim satu operasi ke Supabase
// ─────────────────────────────────────────────────────────────
async function syncToSupabase(op, table, payload) {
  if (!isConfigured()) throw new Error('Supabase belum dikonfigurasi')
  const normalizedPayload = normalizePayloadForSupabase(table, payload)

  if (op === 'upsert') {
    const { error } = await supabase.from(table).upsert(normalizedPayload, {
      onConflict: PK_MAP[table],   // update jika PK sama
    })
    if (error) throw new Error(error.message)
  }

  if (op === 'delete') {
    const pk  = PK_MAP[table]
    const val = payload[pk]
    const { error } = await supabase.from(table).delete().eq(pk, val)
    if (error) throw new Error(error.message)
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Enqueue mutasi (dipanggil dari seluruh aplikasi)
// ─────────────────────────────────────────────────────────────
export async function enqueue(op, table, payload) {
  const record_id = payload[PK_MAP[table]]

  // Optimistic: coba kirim langsung dulu
  if (navigator.onLine && isConfigured()) {
    try {
      await syncToSupabase(op, table, payload)
      return  // sukses → tidak perlu queue
    } catch (e) {
      console.warn('[sync] direct push failed, queuing:', e.message)
    }
  }

  // Offline / gagal → simpan ke queue
  const queued = {
    queue_id:   generateId('Q'),
    op,
    table,
    record_id,
    group_id:   payload.group_id ?? null,
    payload,
    status:     'pending',
    retries:    0,
    created_at: new Date().toISOString(),
    synced_at:  null,
    last_error: null,
  }

  const existing = await syncQueueDB.findPendingForRecord(table, record_id)
  if (existing) {
    await syncQueueDB.update(existing.queue_id, {
      ...queued,
      queue_id: existing.queue_id,
      created_at: existing.created_at,
    })
    return
  }

  await syncQueueDB.add(queued)
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Flush queue → kirim semua pending ke Supabase
// ─────────────────────────────────────────────────────────────
export async function runSync() {
  if (syncing || !navigator.onLine || !isConfigured()) return
  syncing = true
  try {
    const pending = await syncQueueDB.getPending()
    for (const item of pending) {
      await syncQueueDB.update(item.queue_id, { status: 'syncing' })
      try {
        await syncToSupabase(item.op, item.table, item.payload)
        await syncQueueDB.update(item.queue_id, {
          status:    'done',
          synced_at: new Date().toISOString(),
        })
      } catch (e) {
        const retries = (item.retries ?? 0) + 1
        await syncQueueDB.update(item.queue_id, {
          status:  retries >= 3 ? 'failed' : 'pending',
          retries,
          last_error: e.message,
        })
      }
    }
  } finally {
    syncing = false
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Subscribe Realtime — perubahan dari device lain masuk
// onUpdate(table, eventType) → dipanggil tiap ada perubahan
// ─────────────────────────────────────────────────────────────
export function subscribeRealtime(onUpdate) {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
  }

  realtimeChannel = supabase
    .channel('mentor-db-realtime', {
      config: { broadcast: { self: false } },  // jangan terima event dari diri sendiri
    })
    // Dengarkan semua tabel sekaligus
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'groups' },
      (p) => handleRemoteChange(p, onUpdate)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'members' },
      (p) => handleRemoteChange(p, onUpdate)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions' },
      (p) => handleRemoteChange(p, onUpdate)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance' },
      (p) => handleRemoteChange(p, onUpdate)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stats_history' },
      (p) => handleRemoteChange(p, onUpdate)
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[realtime] ✅ Terhubung ke Supabase Realtime')
      }
      if (status === 'CHANNEL_ERROR') {
        console.warn('[realtime] ❌ Channel error, retry otomatis...')
      }
    })

  return () => realtimeChannel?.unsubscribe()
}

async function handleRemoteChange(payload, onUpdate) {
  const { eventType, table, new: newRecord, old: oldRecord } = payload
  const store = DB_MAP[table]
  if (!store) return

  try {
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      await store.put(newRecord)
    } else if (eventType === 'DELETE') {
      const pk = PK_MAP[table]
      if (oldRecord?.[pk]) await store.delete(oldRecord[pk])
    }

    // Sinyal ke React bahwa ada data baru
    window.dispatchEvent(new CustomEvent('mentordb:updated', {
      detail: { table, eventType }
    }))

    onUpdate?.(table, eventType)
  } catch (e) {
    console.warn('[realtime] gagal update IndexedDB lokal:', e.message)
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Pull semua data dari Supabase → IndexedDB
// (dipakai saat buka di device baru atau force-sync)
// ─────────────────────────────────────────────────────────────
export async function pullFromSupabase(onProgress) {
  if (!isConfigured()) throw new Error('Supabase belum dikonfigurasi')
  if (!navigator.onLine) throw new Error('Tidak ada koneksi internet')

  let done = 0
  const total = TABLES.length
  const failures = []

  for (const table of TABLES) {
    onProgress?.({ table, done, total })
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw new Error(error.message)
      if (data?.length) {
        await DB_MAP[table].bulkPut(data)
        window.dispatchEvent(new CustomEvent('mentordb:updated', {
          detail: { table, eventType: 'PULL' }
        }))
      }
    } catch (e) {
      console.warn(`[sync] pull ${table} gagal:`, e.message)
      failures.push(`${table}: ${e.message}`)
    }
    done++
  }
  onProgress?.({ table: 'selesai', done: total, total })
  if (failures.length) {
    throw new Error(`Sebagian data gagal diambil: ${failures.join('; ')}`)
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Push semua IndexedDB → Supabase (force push)
// ─────────────────────────────────────────────────────────────
export async function pushAllToSupabase(onProgress) {
  if (!isConfigured()) throw new Error('Supabase belum dikonfigurasi')
  if (!navigator.onLine) throw new Error('Tidak ada koneksi internet')

  const sources = [
    { name: 'groups',        getData: () => db.groups.toArray() },
    { name: 'members',       getData: () => db.members.toArray() },
    { name: 'sessions',      getData: () => db.sessions.toArray() },
    { name: 'attendance',    getData: () => db.attendance.toArray() },
    { name: 'stats_history', getData: () => db.stats_history.toArray() },
  ]

  let done = 0
  const total = sources.length
  const failures = []

  for (const { name, getData } of sources) {
    onProgress?.({ table: name, done, total })
    const rows = await getData()
    if (rows.length) {
      const normalizedRows = normalizePayloadForSupabase(name, rows)
      const { error } = await supabase.from(name).upsert(normalizedRows, {
        onConflict: PK_MAP[name],
      })
      if (error) {
        console.warn(`[sync] push ${name} error:`, error.message)
        failures.push(`${name}: ${error.message}`)
      }
    }
    done++
  }
  onProgress?.({ table: 'selesai', done: total, total })
  if (failures.length) {
    throw new Error(`Sebagian data gagal dikirim: ${failures.join('; ')}`)
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: Inisialisasi listener global (panggil sekali di root)
// ─────────────────────────────────────────────────────────────
export function initSync() {
  if (listenersAdded) return
  listenersAdded = true

  window.addEventListener('online', () => {
    console.log('[sync] 🟢 Online — flushing queue...')
    runSync()
  })

  window.addEventListener('offline', () => {
    console.log('[sync] 🔴 Offline — queue mode aktif')
  })

  // Sync saat tab kembali aktif
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      runSync()
    }
  })

  if (navigator.onLine) runSync()
}
