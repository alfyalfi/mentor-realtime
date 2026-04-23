const CJ_KEY = 'mentor_custom_jabatan'
const CI_KEY = 'mentor_custom_instrument'

export function getCustomJabatan(defaults) {
  try { const v = localStorage.getItem(CJ_KEY); return v ? JSON.parse(v) : defaults } catch { return defaults }
}
export function setCustomJabatan(list) {
  localStorage.setItem(CJ_KEY, JSON.stringify(list))
}
export function getCustomInstrument(defaults) {
  try { const v = localStorage.getItem(CI_KEY); return v ? JSON.parse(v) : defaults } catch { return defaults }
}
export function setCustomInstrument(list) {
  localStorage.setItem(CI_KEY, JSON.stringify(list))
}

export function generateId(prefix) {
  const ts  = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase()
  return `${prefix}_${ts}${rnd}`
}

export function attendanceId(session_id, member_id) {
  return `ATT_${session_id}_${member_id}`
}

export function statId(session_id, member_id) {
  return `STAT_${session_id}_${member_id}`
}

export function dateStamp() {
  return new Date().toISOString().split('T')[0].replace(/-/g,'')
}

export function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function cycleStatus(current, statuses) {
  const idx = statuses.findIndex(s => s.key === current)
  return statuses[(idx + 1) % statuses.length].key
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function avg(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a,b) => a+b, 0) / arr.length)
}
