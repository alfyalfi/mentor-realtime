import { useState, useRef, memo, useMemo } from 'react'
import { Plus, Pencil, Trash2, Search, Upload } from 'lucide-react'
import { useGroup } from '../context/AppContext'
import { useMembers } from '../hooks'
import { membersDB } from '../services/indexeddb'
import { enqueue } from '../services/sync'
import { importMembersFromExcel } from '../services/importExport'
import { Btn, Card, Modal, Input, Select, Textarea, EmptyState, SkeletonList, SectionTitle, Badge } from '../components/ui'
import { INSTRUMENTS, MEMBER_STATUS, JABATAN } from '../utils/constants'
import { getCustomJabatan, getCustomInstrument } from '../utils/helpers'

const STATUS_COLOR = { active: 'cyan', inactive: 'gray', alumni: 'purple', on_leave: 'yellow' }
const JABATAN_COLOR = { 'Ketua': 'yellow', 'Wakil': 'yellow', 'Humas': 'cyan' }

function MemberForm({ initial, onSave, onCancel }) {
  const jabatanList = useMemo(() => getCustomJabatan(JABATAN), [])
  const instrumentList = useMemo(() => getCustomInstrument(INSTRUMENTS), [])
  const [form, setForm] = useState(initial || {
    name: '', instrument: instrumentList[0] || 'Guitarist', jabatan: 'Anggota', angkatan: '',
    status: 'active', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <Input label="Nama lengkap" placeholder="Andi Pratama" value={form.name} onChange={e => set('name', e.target.value)}/>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Instrumen" value={form.instrument} onChange={e => set('instrument', e.target.value)}>
          {instrumentList.map(i => <option key={i}>{i}</option>)}
        </Select>
        <Select label="Jabatan" value={form.jabatan || 'Anggota'} onChange={e => set('jabatan', e.target.value)}>
          {jabatanList.map(j => <option key={j}>{j}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
          {MEMBER_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
        <Input label="Angkatan" placeholder="2023" value={form.angkatan} onChange={e => set('angkatan', e.target.value)}/>
      </div>
      <Textarea label="Catatan" placeholder="Info tambahan..." value={form.notes} onChange={e => set('notes', e.target.value)}/>
      <div className="flex gap-2 justify-end pt-1">
        <Btn variant="outline" onClick={onCancel}>Batal</Btn>
        <Btn onClick={() => onSave(form)} disabled={!form.name.trim()}>Simpan</Btn>
      </div>
    </div>
  )
}

const MemberRow = memo(function MemberRow({ m, onEdit, onDelete }) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-display font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))' }}>
          {m.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-body font-semibold text-m-text truncate">{m.name}</p>
            <Badge label={MEMBER_STATUS.find(s => s.key === m.status)?.label} color={STATUS_COLOR[m.status]}/>
            {m.jabatan && m.jabatan !== 'Anggota' && (
              <Badge label={m.jabatan} color={JABATAN_COLOR[m.jabatan] || 'gray'}/>
            )}
          </div>
          <p className="text-xs font-body text-m-muted mt-0.5">
            {m.instrument}
            {m.jabatan && <span className="text-m-muted"> · {m.jabatan}</span>}
            {m.angkatan && <span> · {m.angkatan}</span>}
          </p>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => onEdit(m)} className="p-2 text-m-muted hover:text-[var(--accent)] rounded-lg hover:bg-slate-100 transition-colors">
            <Pencil size={13}/>
          </button>
          <button onClick={() => onDelete(m)} className="p-2 text-m-muted hover:text-m-coral rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </Card>
  )
})

export default function Members() {
  const { activeGroup } = useGroup()
  const { members, loading, saveMember, deleteMember, reload } = useMembers(activeGroup?.group_id)
  const [modal,     setModal]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all')
  const [delTarget, setDelTarget] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const xlsxRef = useRef()

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = m.name.toLowerCase().includes(q) || (m.instrument||'').toLowerCase().includes(q) || (m.jabatan||'').toLowerCase().includes(q)
    return matchSearch && (filter === 'all' || m.status === filter)
  })

  async function handleSave(data) {
    await saveMember({ ...(modal !== 'add' ? modal : {}), ...data })
    setModal(null)
  }

  async function handleDelete() {
    if (!delTarget) return
    await deleteMember(delTarget.member_id)
    setDelTarget(null)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file || !activeGroup) return
    setImporting(true); setImportMsg(null)
    try {
      const imported = await importMembersFromExcel(file, activeGroup.group_id)
      for (const m of imported) { await membersDB.put(m); await enqueue('upsert', 'members', m) }
      await reload()
      setImportMsg({ type: 'success', text: `${imported.length} anggota berhasil diimport!` })
    } catch (err) {
      setImportMsg({ type: 'error', text: err.message })
    }
    setImporting(false)
    xlsxRef.current.value = ''
    setTimeout(() => setImportMsg(null), 4000)
  }

  if (!activeGroup) return <EmptyState icon="👥" title="Pilih grup dulu"/>

  return (
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Anggota</SectionTitle>
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => xlsxRef.current?.click()} disabled={importing}>
            <Upload size={13}/>{importing ? 'Import...' : 'Import'}
          </Btn>
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport}/>
          <Btn size="sm" onClick={() => setModal('add')}><Plus size={13}/>Tambah</Btn>
        </div>
      </div>

      {importMsg && (
        <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-body border animate-slide-up ${
          importMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-m-coral border-red-200'
        }`}>{importMsg.text}</div>
      )}

      <div className="mb-3 px-3 py-2 rounded-xl bg-white/60 border border-m-border text-[11px] font-body text-m-muted">
        Template Excel: kolom <span className="text-[var(--accent)] font-mono font-medium">name</span>, <span className="text-[var(--accent)] font-mono font-medium">instrument</span>, <span className="text-[var(--accent)] font-mono font-medium">jabatan</span>, <span className="text-[var(--accent)] font-mono font-medium">angkatan</span>, <span className="text-[var(--accent)] font-mono font-medium">status</span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-m-muted"/>
          <input
            className="w-full bg-white border border-m-border rounded-xl pl-9 pr-4 py-2.5 text-sm font-body text-m-text placeholder-m-muted focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
            placeholder="Cari nama, instrumen, jabatan..."
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ k: 'all', l: 'Semua' }, ...MEMBER_STATUS.map(s => ({ k: s.key, l: s.label }))].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-body whitespace-nowrap border transition-all ${
                filter === f.k
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-semibold'
                  : 'border-m-border text-m-muted bg-white/60 hover:border-m-bordhi hover:text-m-sub'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <SkeletonList count={4}/> : filtered.length === 0
        ? <EmptyState icon="🎸" title="Tidak ada anggota" subtitle="Tambah anggota atau ubah filter"/>
        : (
          <div className="space-y-2">
            {filtered.map(m => (
              <MemberRow key={m.member_id} m={m} onEdit={setModal} onDelete={setDelTarget}/>
            ))}
          </div>
        )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Tambah Anggota' : `Edit — ${modal?.name}`}>
        {modal && <MemberForm initial={modal !== 'add' ? modal : undefined} onSave={handleSave} onCancel={() => setModal(null)}/>}
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Hapus Anggota">
        <p className="font-body text-sm text-m-sub mb-4">
          Hapus <span className="text-m-text font-semibold">{delTarget?.name}</span>? Data absensi tidak ikut terhapus.
        </p>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={() => setDelTarget(null)}>Batal</Btn>
          <Btn variant="danger" onClick={handleDelete}><Trash2 size={13}/>Hapus</Btn>
        </div>
      </Modal>
    </div>
  )
}
