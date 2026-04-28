import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronDown, BarChart2, Users, TrendingUp, Filter, Camera, X, Check, Download, Loader2 } from 'lucide-react'
import { useGroup } from '../context/AppContext'
import { useMembers, useStats, useSessions } from '../hooks'
import { attendanceDB, statsDB } from '../services/indexeddb'
import { MemberRadar, ScoreCards, AttendanceTrendChart, AttendanceRateChart, MemberRankingChart } from '../components/charts'
import { Btn, Card, Modal, Slider, Textarea, EmptyState, Spinner, SectionTitle } from '../components/ui'
import { SKILL_VARS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import { exportToPNG } from '../services/exportImage'

// ─────────────────────────────────────────────────────────────
// Skeleton loader
function SkeletonCard() {
  return (
    <div className="card-glass rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-200"/>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-1/2"/>
          <div className="h-2 bg-slate-200 rounded w-1/3"/>
        </div>
        <div className="w-10 h-4 bg-slate-200 rounded"/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Export PNG Modal
function ExportModal({ open, onClose, activeTab, groupName, exportRefs }) {
  const [selected,   setSelected]   = useState({})
  const [exporting,  setExporting]  = useState(false)
  const [done,       setDone]       = useState(false)

  // Build options based on active tab
  const OPTIONS = useMemo(() => {
    if (activeTab === 'absensi') return [
      { key: 'trend',   label: 'Chart Tren Absensi',      icon: '📊' },
      { key: 'rate',    label: 'Chart % Kehadiran',        icon: '📈' },
      { key: 'ranking', label: 'Ranking Kehadiran Anggota',icon: '🏆' },
    ]
    if (activeTab === 'penilaian') return [
      { key: 'members', label: 'Radar & Skor Semua Anggota', icon: '🎯' },
    ]
    if (activeTab === 'ranking') return [
      { key: 'skillrank', label: 'Ranking Skill Anggota', icon: '⭐' },
    ]
    return []
  }, [activeTab])

  // Auto-select all on open
  useEffect(() => {
    if (open) {
      const init = {}
      OPTIONS.forEach(o => { init[o.key] = true })
      setSelected(init)
      setDone(false)
    }
  }, [open, OPTIONS])

  function toggle(key) {
    setSelected(s => ({ ...s, [key]: !s[key] }))
  }

  async function handleExport() {
    const activeKeys = Object.entries(selected).filter(([,v]) => v).map(([k]) => k)
    if (activeKeys.length === 0) return

    setExporting(true)
    try {
      // Collect elements to export
      const elements = []
      activeKeys.forEach(key => {
        const el = exportRefs[key]?.current
        if (el) elements.push({ key, el })
      })

      if (elements.length === 1) {
        // Single element → direct export
        await exportToPNG(
          elements[0].el,
          `Mentor_${groupName}_${activeTab}_${elements[0].key}_${new Date().toISOString().slice(0,10)}.png`
        )
      } else if (elements.length > 1) {
        // Multiple → export each separately
        for (const { key, el } of elements) {
          await exportToPNG(
            el,
            `Mentor_${groupName}_${activeTab}_${key}_${new Date().toISOString().slice(0,10)}.png`
          )
          // Small delay between downloads
          await new Promise(r => setTimeout(r, 300))
        }
      }
      setDone(true)
      setTimeout(() => { setDone(false); onClose() }, 1500)
    } catch (e) {
      console.error('Export failed:', e)
    }
    setExporting(false)
  }

  if (!open) return null

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"/>
      <div className="relative w-full max-w-lg card-glass rounded-t-2xl sm:rounded-2xl animate-slide-up border border-[var(--accent)]/20 flex flex-col"
        style={{ maxHeight: 'min(88vh, 100dvh - 2rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-m-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-[var(--accent)]" style={{ filter: 'drop-shadow(0 0 6px #00e5ff)' }}/>
            <h2 className="font-display text-xs tracking-widest text-[var(--accent)] uppercase">Export PNG</h2>
          </div>
          <button onClick={onClose} className="text-m-muted hover:text-[var(--accent)] p-1 rounded transition-colors">
            <X size={16}/>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-8">
          <p className="text-xs font-body text-m-sub">
            Pilih konten yang ingin diekspor sebagai gambar PNG bersih:
          </p>

          {/* Checklist options */}
          <div className="space-y-2">
            {OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => toggle(opt.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  selected[opt.key]
                    ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                    : 'border-m-border bg-white/60 hover:border-m-bordhi'
                }`}>
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                  selected[opt.key]
                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                    : 'border-m-border bg-white/60'
                }`}>
                  {selected[opt.key] && <Check size={12} className="text-white" strokeWidth={3}/>}
                </div>
                <span className="text-base">{opt.icon}</span>
                <span className="text-sm font-body text-m-text">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Info box */}
          <div className="px-3 py-2.5 rounded-xl bg-white/60 border border-m-border">
            <p className="text-[11px] font-body text-m-muted leading-relaxed">
              Setiap konten yang dipilih akan diunduh sebagai file <span className="text-[var(--accent)]">.png</span> terpisah.
              Gambar dirender tanpa navbar & bottomnav.
            </p>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!anySelected || exporting}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-sm font-semibold transition-all ${
              done
                ? 'bg-m-green text-white'
                : anySelected && !exporting
                  ? 'bg-[var(--accent)] text-white hover:shadow-card-md active:scale-95'
                  : 'bg-white/60 text-m-muted cursor-not-allowed'
            }`}>
            {done ? (
              <><Check size={16}/>Tersimpan!</>
            ) : exporting ? (
              <><Loader2 size={16} className="animate-spin"/>Mengekspor...</>
            ) : (
              <><Download size={16}/>Ekspor {Object.values(selected).filter(Boolean).length} Konten</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Export wrapper — wraps a section with ref + clean padding
function ExportSection({ exportRef, children, title, subtitle }) {
  return (
    <div ref={exportRef} data-export-root
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
      {title && (
        <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', fontWeight: 700,
              color: '#0077a8', letterSpacing: '0.15em', textTransform: 'uppercase',
              display: 'block', marginBottom: '4px' }}>
              MENTOR
            </span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f1117', margin: 0, lineHeight: 1.3 }}>{title}</p>
            {subtitle && <p style={{ fontSize: '11px', color: '#9aa0ad', margin: '2px 0 0 0' }}>{subtitle}</p>}
          </div>
          <span style={{ fontSize: '11px', color: '#9aa0ad', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: Absensi per Grup
function AttendanceCharts({ group_id, members, sessions, exportRefs }) {
  const [filterInstrument, setFilterInstrument] = useState('all')
  const [filterJabatan,    setFilterJabatan]    = useState('all')
  const [filterAngkatan,   setFilterAngkatan]   = useState('all')
  const [filterPeriod,     setFilterPeriod]     = useState('all')
  const [chartData,        setChartData]        = useState([])
  const [rankData,         setRankData]         = useState([])
  const [loading,          setLoading]          = useState(true)
  const [rankMetric,       setRankMetric]       = useState('hadir')

  const filteredMembers = useMemo(() => members.filter(m => {
    if (m.status !== 'active') return false
    if (filterInstrument !== 'all' && m.instrument !== filterInstrument) return false
    if (filterJabatan    !== 'all' && m.jabatan    !== filterJabatan)    return false
    if (filterAngkatan   !== 'all' && m.angkatan   !== filterAngkatan)   return false
    return true
  }), [members, filterInstrument, filterJabatan, filterAngkatan])

  const memberIds = useMemo(() => new Set(filteredMembers.map(m => m.member_id)), [filteredMembers])

  const filteredSessions = useMemo(() => {
    const sorted = [...sessions].sort((a,b) => a.session_date.localeCompare(b.session_date))
    if (filterPeriod === 'last5')  return sorted.slice(-5)
    if (filterPeriod === 'last10') return sorted.slice(-10)
    return sorted
  }, [sessions, filterPeriod])

  useEffect(() => {
    if (!group_id || filteredSessions.length === 0) { setLoading(false); return }
    setLoading(true)
    async function compute() {
      const allAtt = await Promise.all(
        filteredSessions.map(s => attendanceDB.getBySession(s.session_id, group_id))
      )
      const trend = filteredSessions.map((s, i) => {
        const atts = allAtt[i].filter(a => memberIds.has(a.member_id))
        const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
        atts.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
        const total = atts.length || 1
        return {
          label:    s.title.length > 12 ? s.title.slice(0, 10) + '…' : s.title,
          date:     s.session_date,
          Hadir:    counts.hadir,
          Izin:     counts.izin,
          Sakit:    counts.sakit,
          Alpha:    counts.alpha,
          pctHadir: Math.round((counts.hadir / total) * 100),
        }
      })
      setChartData(trend)

      const memberStats = {}
      filteredMembers.forEach(m => {
        memberStats[m.member_id] = { name: m.name.split(' ')[0], hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 }
      })
      allAtt.forEach(atts => {
        atts.forEach(a => {
          if (!memberStats[a.member_id]) return
          memberStats[a.member_id][a.status]++
          memberStats[a.member_id].total++
        })
      })
      const rankArr = Object.values(memberStats).map(m => ({
        name:  m.name,
        hadir: m.total > 0 ? Math.round((m.hadir / m.total) * 100) : 0,
        izin:  m.total > 0 ? Math.round((m.izin  / m.total) * 100) : 0,
        sakit: m.total > 0 ? Math.round((m.sakit / m.total) * 100) : 0,
        alpha: m.total > 0 ? Math.round((m.alpha / m.total) * 100) : 0,
        value: 0,
      }))
      setRankData(rankArr)
      setLoading(false)
    }
    compute()
  }, [group_id, filteredSessions, memberIds, filteredMembers])

  const sortedRank = useMemo(() => (
    [...rankData].map(m => ({ ...m, value: m[rankMetric] })).sort((a,b) => b.value - a.value)
  ), [rankData, rankMetric])

  const rankColors = { hadir: '#00e5ff', izin: '#ffe600', sakit: '#b56aff', alpha: '#ff4d6d' }
  const rankLabels = { hadir: '% Hadir', izin: '% Izin', sakit: '% Sakit', alpha: '% Alpha' }
  const instrumentOpts = ['all', ...new Set(members.filter(m=>m.status==='active').map(m=>m.instrument).filter(Boolean))]
  const jabatanOpts    = ['all', ...new Set(members.filter(m=>m.status==='active').map(m=>m.jabatan).filter(Boolean))]
  const angkatanOpts   = ['all', ...new Set(members.filter(m=>m.status==='active').map(m=>m.angkatan).filter(Boolean)).keys()].filter(Boolean)

  const filterLabel = [
    filterInstrument !== 'all' && filterInstrument,
    filterJabatan    !== 'all' && filterJabatan,
    filterAngkatan   !== 'all' && `Angkatan ${filterAngkatan}`,
    filterPeriod === 'last5' && '5 Sesi' ,
    filterPeriod === 'last10' && '10 Sesi',
  ].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Filter bar — hidden in export */}
      <div className="card-glass rounded-2xl p-3 space-y-2" data-export-hide>
        <div className="flex items-center gap-2 mb-1">
          <Filter size={12} className="text-[var(--accent)]"/>
          <span className="text-[10px] font-body text-[var(--accent)] uppercase tracking-wider">Filter</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Instrumen</p>
            <select value={filterInstrument} onChange={e => setFilterInstrument(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {instrumentOpts.map(o => <option key={o} value={o}>{o === 'all' ? 'Semua' : o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Jabatan</p>
            <select value={filterJabatan} onChange={e => setFilterJabatan(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {jabatanOpts.map(o => <option key={o} value={o}>{o === 'all' ? 'Semua' : o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Angkatan</p>
            <select value={filterAngkatan} onChange={e => setFilterAngkatan(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="all">Semua</option>
              {angkatanOpts.map(o => <option key={o} value={o}>Angkatan {o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Periode</p>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="all">Semua</option>
              <option value="last5">5 Sesi Terakhir</option>
              <option value="last10">10 Sesi Terakhir</option>
            </select>
          </div>
        </div>
        {(filterInstrument !== 'all' || filterJabatan !== 'all' || filterAngkatan !== 'all') && (
          <p className="text-[10px] font-body text-[var(--accent)] mt-1">
            Menampilkan {filteredMembers.length} anggota
            {filterInstrument !== 'all' && ` · ${filterInstrument}`}
            {filterJabatan !== 'all' && ` · ${filterJabatan}`}
            {filterAngkatan !== 'all' && ` · Angkatan ${filterAngkatan}`}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <SkeletonCard key={i}/>)}</div>
      ) : (
        <>
          {/* Tren Absensi — exportable */}
          <div>
            <SectionTitle>Tren Absensi per Sesi</SectionTitle>
            <ExportSection
              exportRef={exportRefs.trend}
              title="Tren Absensi per Sesi"
              subtitle={filterLabel || 'Semua anggota · Semua sesi'}>
              <AttendanceTrendChart data={chartData}/>
            </ExportSection>
          </div>

          {/* Rate chart — exportable */}
          {chartData.length > 1 && (
            <div>
              <SectionTitle>Persentase Kehadiran</SectionTitle>
              <ExportSection
                exportRef={exportRefs.rate}
                title="Persentase Kehadiran"
                subtitle={filterLabel || 'Semua anggota · Semua sesi'}>
                <AttendanceRateChart data={chartData}/>
              </ExportSection>
            </div>
          )}

          {/* Ranking — exportable */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Ranking Anggota</SectionTitle>
              <div className="flex gap-1" data-export-hide>
                {Object.entries(rankLabels).map(([k, label]) => (
                  <button key={k} onClick={() => setRankMetric(k)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-body border transition-all ${
                      rankMetric === k ? 'border-transparent text-white font-semibold' : 'border-m-border text-m-muted hover:border-m-bordhi'
                    }`}
                    style={rankMetric === k ? { background: rankColors[k] } : {}}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ExportSection
              exportRef={exportRefs.ranking}
              title={`Ranking ${rankLabels[rankMetric]}`}
              subtitle={filterLabel || 'Semua anggota aktif'}>
              <p style={{ fontSize: '11px', color: '#8888aa', marginBottom: '12px', fontFamily: 'DM Sans' }}>
                {rankMetric === 'hadir' ? '🏆 Anggota paling rajin hadir' :
                 rankMetric === 'alpha' ? '⚠️ Anggota paling sering alpha' :
                 rankMetric === 'izin'  ? '📋 Anggota paling sering izin' :
                 '🤒 Anggota paling sering sakit'}
              </p>
              <MemberRankingChart data={sortedRank} color={rankColors[rankMetric]} valueLabel={rankLabels[rankMetric]}/>
            </ExportSection>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: Penilaian
function StatModal({ member, sessions, group_id, onClose }) {
  const { initScores, saveStat } = useStats(member.member_id, group_id)
  const [sessionId, setSessionId] = useState(sessions[0]?.session_id || '')
  const [scores,    setScores]    = useState(null)
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const session = sessions.find(s => s.session_id === sessionId)

  useEffect(() => {
    if (!sessionId) return
    initScores(sessionId).then(s => { setScores({ ...s }); setNote('') })
  }, [sessionId, initScores])

  async function handleSave() {
    if (!session || !scores) return
    setSaving(true)
    await saveStat(session.session_id, session.session_date, scores, note)
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-m-sub font-body">Sesi</label>
        <select value={sessionId} onChange={e => setSessionId(e.target.value)}
          className="w-full bg-white/60 border border-m-border rounded-lg px-3 py-2.5 text-sm text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
          {sessions.map(s => <option key={s.session_id} value={s.session_id}>{s.title} — {formatDate(s.session_date)}</option>)}
        </select>
      </div>
      {scores && (
        <div className="space-y-4 py-1">
          {SKILL_VARS.map(v => (
            <Slider key={v.key} label={v.label} color={v.color}
              value={scores[v.key]} onChange={val => setScores(s => ({ ...s, [v.key]: val }))}/>
          ))}
        </div>
      )}
      <Textarea label="Catatan evaluasi" placeholder="Komentar singkat trainer..." value={note} onChange={e => setNote(e.target.value)}/>
      <div className="flex gap-2 justify-end">
        <Btn variant="outline" onClick={onClose}>Batal</Btn>
        <Btn onClick={handleSave} disabled={saving || !scores}>{saving ? 'Menyimpan...' : 'Simpan Penilaian'}</Btn>
      </div>
    </div>
  )
}

function MemberStatCard({ member, group_id, exportRef }) {
  const { history, latest, loading } = useStats(member.member_id, group_id)
  const prev = history.length >= 2 ? history[history.length - 2] : null
  const [expanded, setExpanded] = useState(false)
  const avg = latest ? Math.round(Object.values(latest.scores).reduce((a,b) => a+b, 0) / 5) : null

  return (
    <Card className="overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60/50 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="w-9 h-9 rounded-full bg-white/60 border border-m-border flex items-center justify-center text-sm font-display text-[var(--accent)] flex-shrink-0">
          {member.name[0]}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-body font-medium text-m-text truncate">{member.name}</p>
          <p className="text-xs font-body text-m-muted">{member.instrument}{member.jabatan && member.jabatan !== 'Anggota' && ` · ${member.jabatan}`}</p>
        </div>
        <div className="flex items-center gap-3">
          {avg !== null && (
            <div className="text-right">
              <div className="text-base font-display text-[var(--accent)]">{avg}</div>
              <div className="text-[10px] font-body text-m-muted">avg</div>
            </div>
          )}
          <ChevronDown size={16} className={`text-m-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}/>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-m-border px-4 pb-4 pt-3 space-y-3 animate-fade-in">
          {loading ? <Spinner/> : (
            <>
              {/* Wrap radar+scores in exportable section */}
              <ExportSection
                exportRef={exportRef}
                title={`Penilaian — ${member.name}`}
                subtitle={`${member.instrument}${member.jabatan && member.jabatan !== 'Anggota' ? ' · ' + member.jabatan : ''}`}>
                <MemberRadar latest={latest} previous={prev}/>
                {latest && <ScoreCards scores={latest.scores} prevScores={prev?.scores}/>}
              </ExportSection>
              {history.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-body text-m-muted mb-2 uppercase tracking-wider">Riwayat</p>
                  <div className="space-y-1.5">
                    {[...history].reverse().slice(0, 5).map(h => (
                      <div key={h.stat_id} className="flex items-center justify-between py-1.5 border-b border-m-border last:border-0">
                        <span className="text-xs font-body text-m-muted">{formatDate(h.session_date)}</span>
                        <div className="flex gap-1">
                          {SKILL_VARS.map(v => (
                            <span key={v.key} className="text-[10px] font-body px-1.5 py-0.5 rounded bg-white/60" style={{ color: v.color }}>
                              {h.scores[v.key]}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: Ranking Skill
function StatsRanking({ members, group_id, exportRefs }) {
  const [filterSkill,      setFilterSkill]      = useState('loyalitas')
  const [filterInstrument, setFilterInstrument] = useState('all')
  const [filterJabatan,    setFilterJabatan]    = useState('all')
  const [filterAngkatan,   setFilterAngkatan]   = useState('all')
  const [rankData,         setRankData]         = useState([])
  const [loading,          setLoading]          = useState(true)

  const filteredMembers = useMemo(() => members.filter(m => {
    if (m.status !== 'active') return false
    if (filterInstrument !== 'all' && m.instrument !== filterInstrument) return false
    if (filterJabatan    !== 'all' && m.jabatan    !== filterJabatan)    return false
    if (filterAngkatan   !== 'all' && m.angkatan   !== filterAngkatan)   return false
    return true
  }), [members, filterInstrument, filterJabatan, filterAngkatan])

  useEffect(() => {
    if (!group_id || filteredMembers.length === 0) { setRankData([]); setLoading(false); return }
    setLoading(true)
    async function compute() {
      const results = await Promise.all(
        filteredMembers.map(async m => {
          const latest = await statsDB.getLatest(m.member_id, group_id)
          return { name: m.name.split(' ')[0], value: latest?.scores?.[filterSkill] ?? 0 }
        })
      )
      setRankData(results.sort((a,b) => b.value - a.value))
      setLoading(false)
    }
    compute()
  }, [group_id, filteredMembers, filterSkill])

  const skillVar   = SKILL_VARS.find(v => v.key === filterSkill)
  const skillColor = skillVar?.color ?? '#00e5ff'
  const instrumentOpts = ['all', ...new Set(members.filter(m=>m.status==='active').map(m=>m.instrument).filter(Boolean))]
  const jabatanOpts    = ['all', ...new Set(members.filter(m=>m.status==='active').map(m=>m.jabatan).filter(Boolean))]
  const angkatanOpts   = [...new Set(members.filter(m=>m.status==='active').map(m=>m.angkatan).filter(Boolean))]
  const filterLabel = [filterInstrument !== 'all' && filterInstrument, filterJabatan !== 'all' && filterJabatan, filterAngkatan !== 'all' && `Angkatan ${filterAngkatan}`].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-glass rounded-2xl p-3 space-y-2" data-export-hide>
        <div className="flex items-center gap-2 mb-1">
          <Filter size={12} className="text-[var(--accent)]"/>
          <span className="text-[10px] font-body text-[var(--accent)] uppercase tracking-wider">Filter Ranking</span>
        </div>
        <div>
          <p className="text-[9px] font-body text-m-muted mb-1.5 uppercase">Skill</p>
          <div className="flex gap-1.5 flex-wrap">
            {SKILL_VARS.map(v => (
              <button key={v.key} onClick={() => setFilterSkill(v.key)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-body border transition-all ${filterSkill === v.key ? 'border-transparent text-white font-semibold' : 'border-m-border text-m-muted'}`}
                style={filterSkill === v.key ? { background: v.color } : {}}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Instrumen</p>
            <select value={filterInstrument} onChange={e => setFilterInstrument(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {instrumentOpts.map(o => <option key={o} value={o}>{o === 'all' ? 'Semua' : o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Jabatan</p>
            <select value={filterJabatan} onChange={e => setFilterJabatan(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {jabatanOpts.map(o => <option key={o} value={o}>{o === 'all' ? 'Semua' : o}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Angkatan</p>
            <select value={filterAngkatan} onChange={e => setFilterAngkatan(e.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="all">Semua</option>
              {angkatanOpts.map(o => <option key={o} value={o}>Angkatan {o}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>
          Ranking {skillVar?.label}
          {filterLabel && ` · ${filterLabel}`}
        </SectionTitle>
        <ExportSection
          exportRef={exportRefs.skillrank}
          title={`Ranking ${skillVar?.label}`}
          subtitle={filterLabel || 'Semua anggota aktif'}>
          {loading ? <Spinner/> : rankData.length === 0
            ? <EmptyState icon="📊" title="Belum ada data penilaian"/>
            : <MemberRankingChart data={rankData} color={skillColor} valueLabel={skillVar?.label}/>
          }
        </ExportSection>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Stats Page
export default function Stats() {
  const { activeGroup } = useGroup()
  const gid = activeGroup?.group_id
  const { members, loading: mLoading } = useMembers(gid)
  const { sessions } = useSessions(gid)

  const [tab,         setTab]         = useState('absensi')
  const [evalModal,   setEvalModal]   = useState(null)
  const [exportModal, setExportModal] = useState(false)

  // Export refs — one per exportable section
  const exportRefs = {
    // absensi tab
    trend:     useRef(null),
    rate:      useRef(null),
    ranking:   useRef(null),
    // ranking tab
    skillrank: useRef(null),
  }

  // Per-member refs for penilaian tab
  const memberExportRefs = useRef({})
  const getMemberRef = useCallback((memberId) => {
    if (!memberExportRefs.current[memberId]) {
      memberExportRefs.current[memberId] = { current: null }
    }
    return memberExportRefs.current[memberId]
  }, [])

  // For penilaian tab, build export refs from expanded members
  const penilaianExportRefs = useMemo(() => {
    const refs = {}
    members.filter(m => m.status === 'active').forEach(m => {
      refs[m.member_id] = getMemberRef(m.member_id)
    })
    return refs
  }, [members, getMemberRef])

  const activeMembers = members.filter(m => m.status === 'active')
  if (!activeGroup) return <EmptyState icon="📊" title="Pilih grup dulu"/>

  const TABS = [
    { key: 'absensi',   label: 'Absensi',   icon: BarChart2  },
    { key: 'penilaian', label: 'Penilaian', icon: Users      },
    { key: 'ranking',   label: 'Ranking',   icon: TrendingUp },
  ]

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Statistik</SectionTitle>
        <div className="flex items-center gap-2">
          {/* Export PNG button */}
          <button onClick={() => setExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body card-glass border border-[var(--accent)]/20 text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] transition-all"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.2))' }}>
            <Camera size={13}/>
            Export PNG
          </button>
          {tab === 'penilaian' && (
            <Btn size="sm" onClick={() => setEvalModal(true)} disabled={!sessions.length}>
              + Nilai
            </Btn>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 p-1 bg-white/60 rounded-xl border border-m-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body transition-all duration-200 ${
              tab === key ? 'bg-[var(--accent)] text-white font-semibold' : 'text-m-muted hover:text-m-text'
            }`}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'absensi' && (
        sessions.length === 0
          ? <EmptyState icon="📋" title="Belum ada sesi" subtitle="Buat sesi latihan terlebih dahulu"/>
          : <AttendanceCharts group_id={gid} members={members} sessions={sessions} exportRefs={exportRefs}/>
      )}

      {tab === 'penilaian' && (
        mLoading
          ? <div className="space-y-2">{[1,2,3].map(i => <SkeletonCard key={i}/>)}</div>
          : activeMembers.length === 0
            ? <EmptyState icon="🎵" title="Belum ada anggota aktif"/>
            : (
              <div className="space-y-2">
                {activeMembers.map(m => (
                  <MemberStatCard
                    key={m.member_id}
                    member={m}
                    group_id={gid}
                    exportRef={getMemberRef(m.member_id)}
                  />
                ))}
              </div>
            )
      )}

      {tab === 'ranking' && (
        <StatsRanking members={members} group_id={gid} exportRefs={exportRefs}/>
      )}

      {/* Export PNG Modal */}
      <ExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        activeTab={tab}
        groupName={activeGroup?.group_name ?? 'Grup'}
        exportRefs={tab === 'penilaian'
          ? penilaianExportRefs
          : exportRefs
        }
      />

      {/* Eval Modal */}
      <Modal open={!!evalModal} onClose={() => setEvalModal(null)} title="Input Penilaian">
        {evalModal === true ? (
          <div className="space-y-2">
            <p className="text-xs font-body text-m-muted mb-3">Pilih anggota:</p>
            {activeMembers.map(m => (
              <button key={m.member_id} onClick={() => setEvalModal(m)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/60 rounded-xl hover:bg-slate-200 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-white border border-m-border flex items-center justify-center text-sm font-display text-[var(--accent)]">
                  {m.name[0]}
                </div>
                <div>
                  <p className="text-sm font-body text-m-text">{m.name}</p>
                  <p className="text-xs font-body text-m-muted">{m.instrument}</p>
                </div>
              </button>
            ))}
          </div>
        ) : evalModal && (
          <StatModal member={evalModal} sessions={sessions} group_id={gid} onClose={() => setEvalModal(null)}/>
        )}
      </Modal>
    </div>
  )
}
