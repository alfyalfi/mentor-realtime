import { db, membersDB, sessionsDB, attendanceDB, statsDB, groupsDB } from './indexeddb'
import { generateId, downloadBlob, dateStamp } from '../utils/helpers'

export async function importMembersFromExcel(file, group_id) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb     = XLSX.read(buffer)

  // Baca raw rows dulu untuk dapat header asli
  const sheet  = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { raw: false })
  if (!rawRows.length) throw new Error('File kosong atau tidak ada data')

  // Normalisasi semua key: lowercase + trim + hapus spasi
  // Ini agar "Name", "NAMA", "nama lengkap" semua bisa dideteksi
  const ALIAS = {
    name:       ['name','nama','nama lengkap','nama anggota','full name'],
    instrument: ['instrument','instrumen','alat musik','posisi musik'],
    jabatan:    ['jabatan','posisi','role','position'],
    angkatan:   ['angkatan','tahun','batch','year','tahun masuk'],
    status:     ['status','state','keaktifan'],
    notes:      ['notes','catatan','note','keterangan'],
  }

  // Buat mapping dari header Excel → field internal
  const firstRow = rawRows[0]
  const headerMap = {}
  Object.keys(firstRow).forEach(header => {
    const normalized = header.toLowerCase().trim()
    Object.entries(ALIAS).forEach(([field, aliases]) => {
      if (aliases.includes(normalized) || normalized === field) {
        headerMap[header] = field
      }
    })
  })

  // Cek kolom wajib
  const mappedFields = Object.values(headerMap)
  const required = ['name', 'instrument']
  const missing  = required.filter(f => !mappedFields.includes(f))
  if (missing.length) {
    const missingLabels = missing.map(f => f === 'name' ? 'name/nama' : 'instrument/instrumen')
    throw new Error(
      `Kolom wajib tidak ditemukan: ${missingLabels.join(', ')}\n` +
      `Header yang terdeteksi: ${Object.keys(firstRow).join(', ')}`
    )
  }

  // Helper ambil nilai dengan fallback ke semua alias
  function getField(row, field) {
    const header = Object.keys(headerMap).find(h => headerMap[h] === field)
    return header ? String(row[header] || '').trim() : ''
  }

  function normalizeStatus(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_')
    const aliases = {
      active: 'active',
      aktif: 'active',
      inactive: 'inactive',
      nonaktif: 'inactive',
      non_aktif: 'inactive',
      alumni: 'alumni',
      on_leave: 'on_leave',
      cuti: 'on_leave',
      izin: 'on_leave',
    }
    return aliases[normalized] || 'active'
  }

  const now = new Date().toISOString()
  return rawRows
    .filter(row => getField(row, 'name'))  // skip baris kosong
    .map(row => ({
      member_id:  generateId('MBR'),
      group_id,
      name:       getField(row, 'name'),
      instrument: getField(row, 'instrument') || 'Lainnya',
      jabatan:    getField(row, 'jabatan')    || 'Anggota',
      angkatan:   getField(row, 'angkatan'),
      notes:      getField(row, 'notes'),
      status:     normalizeStatus(getField(row, 'status')),
      joined_at:  now.split('T')[0],
      created_at: now,
      updated_at: now,
    }))
}

export async function exportGroupToExcel(group_id, group_name) {
  const XLSX = await import('xlsx')
  const [members, sessions, attendance, stats] = await Promise.all([
    membersDB.getByGroup(group_id),
    sessionsDB.getByGroup(group_id),
    db.attendance.where('group_id').equals(group_id).toArray(),
    db.stats_history.where('group_id').equals(group_id).toArray(),
  ])

  const wb = XLSX.utils.book_new()
  const sheets = { members, sessions, attendance, stats_history: stats }

  Object.entries(sheets).forEach(([name, data]) => {
    if (data.length) {
      // Flatten scores object for stats
      const flat = data.map(r => {
        if (r.scores) return { ...r, ...r.scores, scores: undefined }
        return r
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flat), name)
    }
  })

  XLSX.writeFile(wb, `MENTOR_${group_name}_${dateStamp()}.xlsx`)
}

export async function createBackup(group_id) {
  const [groups, members, sessions, attendance, stats] = await Promise.all([
    groupsDB.getAll().then(gs => gs.filter(g => g.group_id === group_id)),
    membersDB.getByGroup(group_id),
    sessionsDB.getByGroup(group_id),
    db.attendance.where('group_id').equals(group_id).toArray(),
    db.stats_history.where('group_id').equals(group_id).toArray(),
  ])

  const backup = {
    version:     '1.0',
    group_id,
    exported_at: new Date().toISOString(),
    data: { groups, members, sessions, attendance, stats_history: stats }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `MENTOR_backup_${group_id}_${dateStamp()}.json`)
}

export async function restoreBackup(file) {
  const text   = await file.text()
  const backup = JSON.parse(text)
  if (!backup.version || !backup.data) throw new Error('Format backup tidak valid')

  const tableMap = {
    groups:        db.groups,
    members:       db.members,
    sessions:      db.sessions,
    attendance:    db.attendance,
    stats_history: db.stats_history,
  }

  await db.transaction('rw', Object.values(tableMap), async () => {
    for (const [table, rows] of Object.entries(backup.data)) {
      if (rows?.length && tableMap[table]) {
        await tableMap[table].bulkPut(rows)
      }
    }
  })

  return backup.group_id
}
