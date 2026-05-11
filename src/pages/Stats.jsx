import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  ChevronDown,
  BarChart2,
  Users,
  TrendingUp,
  Filter,
  Camera,
  X,
  Check,
  Download,
  Loader2,
  PencilLine,
  Minus,
  Plus,
  Save,
} from 'lucide-react'
import { useGroup } from '../context/AppContext'
import { useMembers, useStats, useSessions } from '../hooks'
import { attendanceDB, statsDB } from '../services/indexeddb'
import {
  MemberRadar,
  CompareMemberRadar,
  ScoreCards,
  AttendanceTrendChart,
  AttendanceRateChart,
  MemberRankingChart,
} from '../components/charts'
import { Btn, Card, Textarea, EmptyState, Spinner, SectionTitle } from '../components/ui'
import { SKILL_VARS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import { exportToPNG } from '../services/exportImage'

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

function ExportModal({ open, onClose, activeTab, groupName, exportRefs }) {
  const [selected, setSelected] = useState({})
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  const options = useMemo(() => {
    if (activeTab === 'absensi') {
      return [
        { key: 'trend', label: 'Chart Tren Absensi', icon: 'PA' },
        { key: 'rate', label: 'Chart % Kehadiran', icon: 'PR' },
        { key: 'ranking', label: 'Ranking Kehadiran Anggota', icon: 'RK' },
      ]
    }
    if (activeTab === 'penilaian') {
      return [{ key: 'members', label: 'Radar & Skor Semua Anggota', icon: 'RS' }]
    }
    if (activeTab === 'ranking') {
      return [{ key: 'skillrank', label: 'Ranking Skill Anggota', icon: 'SK' }]
    }
    return []
  }, [activeTab])

  useEffect(() => {
    if (!open) return
    const initialState = {}
    options.forEach(option => {
      initialState[option.key] = true
    })
    setSelected(initialState)
    setDone(false)
  }, [open, options])

  function toggle(key) {
    setSelected(current => ({ ...current, [key]: !current[key] }))
  }

  async function handleExport() {
    const activeKeys = Object.entries(selected)
      .filter(([, value]) => value)
      .map(([key]) => key)

    if (!activeKeys.length) return

    setExporting(true)
    try {
      const elements = activeKeys
        .map(key => ({ key, el: exportRefs[key]?.current }))
        .filter(item => item.el)

      for (const { key, el } of elements) {
        await exportToPNG(
          el,
          `Mentor_${groupName}_${activeTab}_${key}_${new Date().toISOString().slice(0, 10)}.png`
        )
        if (elements.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      setDone(true)
      setTimeout(() => {
        setDone(false)
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Export failed:', error)
    }
    setExporting(false)
  }

  if (!open) return null

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"/>
      <div
        className="relative w-full max-w-lg card-glass rounded-t-2xl sm:rounded-2xl animate-slide-up border border-[var(--accent)]/20 flex flex-col"
        style={{ maxHeight: 'min(88vh, 100dvh - 2rem)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-m-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={15} className="text-[var(--accent)]" style={{ filter: 'drop-shadow(0 0 6px #00e5ff)' }}/>
            <h2 className="font-display text-xs tracking-widest text-[var(--accent)] uppercase">Export PNG</h2>
          </div>
          <button onClick={onClose} className="text-m-muted hover:text-[var(--accent)] p-1 rounded transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-8">
          <p className="text-xs font-body text-m-sub">
            Pilih konten yang ingin diekspor sebagai gambar PNG bersih:
          </p>

          <div className="space-y-2">
            {options.map(option => (
              <button
                key={option.key}
                onClick={() => toggle(option.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  selected[option.key]
                    ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                    : 'border-m-border bg-white/60 hover:border-m-bordhi'
                }`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                  selected[option.key]
                    ? 'bg-[var(--accent)] border-[var(--accent)]'
                    : 'border-m-border bg-white/60'
                }`}>
                  {selected[option.key] && <Check size={12} className="text-white" strokeWidth={3}/>}
                </div>
                <span className="text-[11px] font-display text-m-muted w-6">{option.icon}</span>
                <span className="text-sm font-body text-m-text">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="px-3 py-2.5 rounded-xl bg-white/60 border border-m-border">
            <p className="text-[11px] font-body text-m-muted leading-relaxed">
              Setiap konten yang dipilih akan diunduh sebagai file <span className="text-[var(--accent)]">.png</span> terpisah.
              Gambar dirender tanpa navbar & bottomnav.
            </p>
          </div>

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

function ExportSection({ exportRef, children, title, subtitle }) {
  return (
    <div
      ref={exportRef}
      data-export-root
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
      {title && (
        <div
          style={{
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(0,0,0,0.07)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
          <div>
            <span
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                color: '#0077a8',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '4px',
              }}>
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

function AttendanceCharts({ group_id, members, sessions, exportRefs }) {
  const [filterInstrument, setFilterInstrument] = useState('all')
  const [filterJabatan, setFilterJabatan] = useState('all')
  const [filterAngkatan, setFilterAngkatan] = useState('all')
  const [selectedWindow, setSelectedWindow] = useState('')
  const [chartData, setChartData] = useState([])
  const [rankData, setRankData] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankMetric, setRankMetric] = useState('hadir')

  const filteredMembers = useMemo(() => members.filter(member => {
    if (member.status !== 'active') return false
    if (filterInstrument !== 'all' && member.instrument !== filterInstrument) return false
    if (filterJabatan !== 'all' && member.jabatan !== filterJabatan) return false
    if (filterAngkatan !== 'all' && member.angkatan !== filterAngkatan) return false
    return true
  }), [members, filterInstrument, filterJabatan, filterAngkatan])

  const memberIds = useMemo(() => new Set(filteredMembers.map(member => member.member_id)), [filteredMembers])

  const sessionWindows = useMemo(() => {
    const sorted = [...sessions].sort((left, right) => left.session_date.localeCompare(right.session_date))
    const grouped = new Map()

    sorted.forEach(session => {
      const key = session.session_date.slice(0, 7)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(session)
    })

    return [...grouped.entries()]
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([key, rows]) => ({
        key,
        label: `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${key}-01`))} (${rows.length} sesi)`,
        summary: `${formatDate(rows[0].session_date)} - ${formatDate(rows[rows.length - 1].session_date)}`,
        rows,
      }))
  }, [sessions])

  useEffect(() => {
    if (!sessionWindows.length) {
      setSelectedWindow('')
      return
    }
    setSelectedWindow(current => (
      sessionWindows.some(window => window.key === current)
        ? current
        : sessionWindows[0].key
    ))
  }, [sessionWindows])

  const visibleSessions = useMemo(() => {
    if (!sessionWindows.length) return []
    const activeWindow = sessionWindows.find(window => window.key === selectedWindow) ?? sessionWindows[0]
    return activeWindow?.rows ?? []
  }, [sessionWindows, selectedWindow])

  const activeWindowMeta = useMemo(() => (
    sessionWindows.find(window => window.key === selectedWindow) ?? sessionWindows[0] ?? null
  ), [sessionWindows, selectedWindow])

  useEffect(() => {
    if (!group_id || visibleSessions.length === 0) {
      setChartData([])
      setRankData([])
      setLoading(false)
      return
    }

    setLoading(true)
    async function compute() {
      const allAttendance = await Promise.all(
        visibleSessions.map(session => attendanceDB.getBySession(session.session_id, group_id))
      )

      const trend = visibleSessions.map((session, index) => {
        const attendance = allAttendance[index].filter(item => memberIds.has(item.member_id))
        const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
        attendance.forEach(item => {
          if (counts[item.status] !== undefined) counts[item.status]++
        })
        const total = attendance.length || 1
        return {
          label: `S${index + 1}`,
          fullLabel: session.title,
          prettyDate: formatDate(session.session_date),
          date: session.session_date,
          Hadir: counts.hadir,
          Izin: counts.izin,
          Sakit: counts.sakit,
          Alpha: counts.alpha,
          pctHadir: Math.round((counts.hadir / total) * 100),
        }
      })
      setChartData(trend)

      const memberStats = {}
      filteredMembers.forEach(member => {
        memberStats[member.member_id] = {
          name: member.name.split(' ')[0],
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        }
      })

      allAttendance.forEach(attendance => {
        attendance.forEach(item => {
          if (!memberStats[item.member_id]) return
          memberStats[item.member_id][item.status]++
          memberStats[item.member_id].total++
        })
      })

      const ranking = Object.values(memberStats).map(member => ({
        name: member.name,
        hadir: member.total > 0 ? Math.round((member.hadir / member.total) * 100) : 0,
        izin: member.total > 0 ? Math.round((member.izin / member.total) * 100) : 0,
        sakit: member.total > 0 ? Math.round((member.sakit / member.total) * 100) : 0,
        alpha: member.total > 0 ? Math.round((member.alpha / member.total) * 100) : 0,
        value: 0,
      }))

      setRankData(ranking)
      setLoading(false)
    }

    compute()
  }, [group_id, visibleSessions, memberIds, filteredMembers])

  const sortedRank = useMemo(() => (
    [...rankData].map(member => ({ ...member, value: member[rankMetric] })).sort((left, right) => right.value - left.value)
  ), [rankData, rankMetric])

  const rankColors = { hadir: '#00e5ff', izin: '#ffe600', sakit: '#b56aff', alpha: '#ff4d6d' }
  const rankLabels = { hadir: '% Hadir', izin: '% Izin', sakit: '% Sakit', alpha: '% Alpha' }
  const instrumentOpts = ['all', ...new Set(members.filter(member => member.status === 'active').map(member => member.instrument).filter(Boolean))]
  const jabatanOpts = ['all', ...new Set(members.filter(member => member.status === 'active').map(member => member.jabatan).filter(Boolean))]
  const angkatanOpts = ['all', ...new Set(members.filter(member => member.status === 'active').map(member => member.angkatan).filter(Boolean)).keys()].filter(Boolean)
  const filterLabel = [
    filterInstrument !== 'all' && filterInstrument,
    filterJabatan !== 'all' && filterJabatan,
    filterAngkatan !== 'all' && `Angkatan ${filterAngkatan}`,
    activeWindowMeta?.label,
  ].filter(Boolean).join(' - ')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-glass rounded-2xl p-3 space-y-2" data-export-hide>
        <div className="flex items-center gap-2 mb-1">
          <Filter size={12} className="text-[var(--accent)]"/>
          <span className="text-[10px] font-body text-[var(--accent)] uppercase tracking-wider">Filter</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Instrumen</p>
            <select
              value={filterInstrument}
              onChange={event => setFilterInstrument(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {instrumentOpts.map(option => <option key={option} value={option}>{option === 'all' ? 'Semua' : option}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Jabatan</p>
            <select
              value={filterJabatan}
              onChange={event => setFilterJabatan(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {jabatanOpts.map(option => <option key={option} value={option}>{option === 'all' ? 'Semua' : option}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Angkatan</p>
            <select
              value={filterAngkatan}
              onChange={event => setFilterAngkatan(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="all">Semua</option>
              {angkatanOpts.map(option => <option key={option} value={option}>Angkatan {option}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Blok Sesi</p>
            <div className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body">
              {activeWindowMeta?.summary ?? 'Belum ada sesi'}
            </div>
          </div>
        </div>
        {(filterInstrument !== 'all' || filterJabatan !== 'all' || filterAngkatan !== 'all') && (
          <p className="text-[10px] font-body text-[var(--accent)] mt-1">
            Menampilkan {filteredMembers.length} anggota
            {filterInstrument !== 'all' && ` - ${filterInstrument}`}
            {filterJabatan !== 'all' && ` - ${filterJabatan}`}
            {filterAngkatan !== 'all' && ` - Angkatan ${filterAngkatan}`}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(index => <SkeletonCard key={index}/>)}</div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <SectionTitle>Tren Absensi Terbaru</SectionTitle>
                <p className="text-xs font-body text-m-muted">Default menampilkan blok latihan terbaru agar pola 4 sesi per bulan lebih jelas.</p>
              </div>
              <select
                data-export-hide
                value={selectedWindow}
                onChange={event => setSelectedWindow(event.target.value)}
                className="min-w-[170px] bg-white/80 border border-m-border rounded-xl px-3 py-2 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
                {sessionWindows.map(window => (
                  <option key={window.key} value={window.key}>{window.label}</option>
                ))}
              </select>
            </div>
            <ExportSection
              exportRef={exportRefs.trend}
              title="Tren Absensi per Sesi"
              subtitle={filterLabel || 'Semua anggota aktif'}>
              <AttendanceTrendChart data={chartData}/>
            </ExportSection>
          </div>

          {chartData.length > 1 && (
            <div>
              <SectionTitle>Persentase Kehadiran</SectionTitle>
              <ExportSection
                exportRef={exportRefs.rate}
                title="Persentase Kehadiran"
                subtitle={filterLabel || 'Semua anggota aktif'}>
                <AttendanceRateChart data={chartData}/>
              </ExportSection>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Ranking Anggota</SectionTitle>
              <div className="flex gap-1" data-export-hide>
                {Object.entries(rankLabels).map(([key]) => (
                  <button
                    key={key}
                    onClick={() => setRankMetric(key)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-body border transition-all ${
                      rankMetric === key ? 'border-transparent text-white font-semibold' : 'border-m-border text-m-muted hover:border-m-bordhi'
                    }`}
                    style={rankMetric === key ? { background: rankColors[key] } : {}}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ExportSection
              exportRef={exportRefs.ranking}
              title={`Ranking ${rankLabels[rankMetric]}`}
              subtitle={filterLabel || 'Semua anggota aktif'}>
              <MemberRankingChart data={sortedRank} color={rankColors[rankMetric]} valueLabel={rankLabels[rankMetric]}/>
            </ExportSection>
          </div>
        </>
      )}
    </div>
  )
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value))
}

function mixColor(start, end, ratio) {
  const safeRatio = Math.max(0, Math.min(1, ratio))
  const parse = value => value.replace('#', '').match(/.{1,2}/g).map(part => parseInt(part, 16))
  const [sr, sg, sb] = parse(start)
  const [er, eg, eb] = parse(end)
  const toHex = value => value.toString(16).padStart(2, '0')
  const red = Math.round(sr + (er - sr) * safeRatio)
  const green = Math.round(sg + (eg - sg) * safeRatio)
  const blue = Math.round(sb + (eb - sb) * safeRatio)
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function getThemeAccentColor() {
  if (typeof document === 'undefined') return '#00b4d8'
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'yellow' ? '#f5c542' : '#00b4d8'
}

function getScoreTone(score) {
  const value = clampScore(score ?? 0)
  const green = '#18b76a'
  const red = '#ff5f5f'
  const accent = getThemeAccentColor()
  if (value <= 50) return mixColor(red, green, value / 50)
  return mixColor(green, accent, (value - 50) / 50)
}

function getQuickEditSession(sessions) {
  if (!sessions.length) return null
  const sorted = [...sessions].sort((left, right) => right.session_date.localeCompare(left.session_date))
  return sorted.find(session => session.status === 'open') || sorted[0]
}

function QuickSkillEditor({ sessions, sessionId, onSessionChange, scores, note, onNoteChange, onAdjust, onCancel, onSave, saving }) {
  const holdTimeoutRef = useRef(null)
  const holdIntervalRef = useRef(null)

  const stopAdjustHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    window.removeEventListener('pointerup', stopAdjustHold)
    window.removeEventListener('pointercancel', stopAdjustHold)
  }, [])

  const startAdjustHold = useCallback((event, skillKey, delta) => {
    event.preventDefault()
    stopAdjustHold()
    onAdjust(skillKey, delta)
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        onAdjust(skillKey, delta)
      }, 70)
    }, 260)
    window.addEventListener('pointerup', stopAdjustHold, { once: true })
    window.addEventListener('pointercancel', stopAdjustHold, { once: true })
  }, [onAdjust, stopAdjustHold])

  useEffect(() => () => stopAdjustHold(), [stopAdjustHold])

  return (
    <div className="mt-3 rounded-2xl border border-[var(--accent-glow)] bg-[var(--accent-soft)]/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-display font-semibold tracking-[0.16em] uppercase text-[var(--accent)]">Quick Edit</p>
          <p className="text-xs font-body text-m-muted">Tambah poin langsung tanpa pindah modal.</p>
        </div>
        <select
          value={sessionId}
          onChange={event => onSessionChange(event.target.value)}
          className="min-w-[160px] bg-white border border-m-border rounded-xl px-3 py-2 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
          {sessions.map(session => (
            <option key={session.session_id} value={session.session_id}>
              {session.title} - {formatDate(session.session_date)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {SKILL_VARS.map(skill => (
          <div key={skill.key} className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5 border border-white">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-body font-semibold text-m-text truncate">{skill.label}</p>
              <p className="text-[10px] font-body text-m-muted">Tap 1 poin, tahan untuk update cepat</p>
            </div>
            <button
              type="button"
              onPointerDown={event => startAdjustHold(event, skill.key, -1)}
              onPointerUp={stopAdjustHold}
              onPointerLeave={stopAdjustHold}
              onPointerCancel={stopAdjustHold}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onAdjust(skill.key, -1)
                }
              }}
              className="w-9 h-9 rounded-xl border border-m-border bg-white text-m-sub hover:border-m-bordhi hover:text-m-text transition-all duration-200 active:scale-95 flex items-center justify-center">
              <Minus size={14}/>
            </button>
            <div className="w-12 text-center">
              <div
                className="text-lg font-display font-bold transition-colors duration-200"
                style={{ color: getScoreTone(scores?.[skill.key] ?? 0) }}>
                {scores?.[skill.key] ?? 0}
              </div>
            </div>
            <button
              type="button"
              onPointerDown={event => startAdjustHold(event, skill.key, 1)}
              onPointerUp={stopAdjustHold}
              onPointerLeave={stopAdjustHold}
              onPointerCancel={stopAdjustHold}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onAdjust(skill.key, 1)
                }
              }}
              className="w-9 h-9 rounded-xl border border-[var(--accent-glow)] bg-white text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-200 active:scale-95 flex items-center justify-center">
              <Plus size={14}/>
            </button>
          </div>
        ))}
      </div>

      <Textarea
        label="Catatan evaluasi"
        placeholder="Komentar singkat trainer..."
        value={note}
        onChange={event => onNoteChange(event.target.value)}
      />

      <div className="flex justify-end gap-2">
        <Btn variant="outline" onClick={onCancel}>Batal</Btn>
        <Btn onClick={onSave} disabled={saving || !scores}>
          {saving ? 'Menyimpan...' : <><Save size={13}/>Simpan Cepat</>}
        </Btn>
      </div>
    </div>
  )
}

function MemberStatCard({ member, group_id, exportRef, sessions }) {
  const { history, latest, loading, initScores, saveStat } = useStats(member.member_id, group_id)
  const prev = history.length >= 2 ? history[history.length - 2] : null
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [draftScores, setDraftScores] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const avg = latest ? Math.round(Object.values(latest.scores).reduce((total, score) => total + score, 0) / 5) : null
  const canEdit = sessions.length > 0

  useEffect(() => {
    if (!editing || !canEdit) return
    const defaultSession = getQuickEditSession(sessions)
    if (!defaultSession) return
    setSessionId(current => current || defaultSession.session_id)
  }, [editing, canEdit, sessions])

  useEffect(() => {
    if (!editing || !sessionId) return
    let active = true

    initScores(sessionId).then(scores => {
      if (!active) return
      setDraftScores({ ...scores })
      setNote('')
    })

    return () => {
      active = false
    }
  }, [editing, sessionId, initScores])

  function handleAdjust(skillKey, delta) {
    setDraftScores(current => ({
      ...(current || {}),
      [skillKey]: clampScore((current?.[skillKey] ?? 0) + delta),
    }))
  }

  async function handleQuickSave() {
    const session = sessions.find(item => item.session_id === sessionId)
    if (!session || !draftScores) return
    setSaving(true)
    await saveStat(session.session_id, session.session_date, draftScores, note)
    setSaving(false)
    setEditing(false)
  }

  function handleCancelEdit() {
    setEditing(false)
    setDraftScores(null)
    setNote('')
  }

  return (
    <Card className="overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60/50 transition-colors" onClick={() => setExpanded(current => !current)}>
        <div className="w-9 h-9 rounded-full bg-white/60 border border-m-border flex items-center justify-center text-sm font-display text-[var(--accent)] flex-shrink-0">
          {member.name[0]}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-body font-medium text-m-text truncate">{member.name}</p>
          <p className="text-xs font-body text-m-muted">
            {member.instrument}
            {member.jabatan && member.jabatan !== 'Anggota' && ` · ${member.jabatan}`}
          </p>
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-display font-semibold tracking-[0.16em] uppercase text-[var(--accent)]">Chart Penilaian</p>
                  <p className="text-xs font-body text-m-muted">Buka editor cepat untuk update skor anggota ini.</p>
                </div>
                <button
                  onClick={() => setEditing(current => !current)}
                  disabled={!canEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-m-border bg-white/80 text-xs font-body font-medium text-m-sub hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <PencilLine size={13}/>
                  Edit chart
                </button>
              </div>

              <ExportSection
                exportRef={exportRef}
                title={`Penilaian - ${member.name}`}
                subtitle={`${member.instrument}${member.jabatan && member.jabatan !== 'Anggota' ? ` · ${member.jabatan}` : ''}`}>
                <MemberRadar latest={latest} previous={prev}/>
                {latest && <ScoreCards scores={latest.scores} prevScores={prev?.scores}/>}
              </ExportSection>

              {editing && canEdit && (
                <QuickSkillEditor
                  sessions={sessions}
                  sessionId={sessionId}
                  onSessionChange={setSessionId}
                  scores={draftScores}
                  note={note}
                  onNoteChange={setNote}
                  onAdjust={handleAdjust}
                  onCancel={handleCancelEdit}
                  onSave={handleQuickSave}
                  saving={saving}
                />
              )}

              {history.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-body text-m-muted mb-2 uppercase tracking-wider">Riwayat</p>
                  <div className="space-y-1.5">
                    {[...history].reverse().slice(0, 5).map(item => (
                      <div key={item.stat_id} className="flex items-center justify-between py-1.5 border-b border-m-border last:border-0">
                        <span className="text-xs font-body text-m-muted">{formatDate(item.session_date)}</span>
                        <div className="flex gap-1">
                          {SKILL_VARS.map(skill => (
                            <span key={skill.key} className="text-[10px] font-body px-1.5 py-0.5 rounded bg-white/60" style={{ color: skill.color }}>
                              {item.scores[skill.key]}
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

function CompareMembersPanel({ members, group_id, sessions }) {
  const [leftId, setLeftId] = useState(members[0]?.member_id ?? '')
  const [rightId, setRightId] = useState(members[1]?.member_id ?? members[0]?.member_id ?? '')
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [compareData, setCompareData] = useState(null)

  useEffect(() => {
    if (!members.length) {
      setLeftId('')
      setRightId('')
      return
    }
    setLeftId(current => members.some(member => member.member_id === current) ? current : members[0].member_id)
    setRightId(current => {
      if (members.some(member => member.member_id === current) && current !== leftId) return current
      return members[1]?.member_id ?? members[0].member_id
    })
  }, [members, leftId])

  useEffect(() => {
    if (!leftId || !rightId || leftId !== rightId) return
    const fallback = members.find(member => member.member_id !== leftId)
    if (fallback) setRightId(fallback.member_id)
  }, [leftId, rightId, members])

  useEffect(() => {
    if (!sessions.length) {
      setSessionId('')
      return
    }
    const sorted = [...sessions].sort((left, right) => right.session_date.localeCompare(left.session_date))
    setSessionId(current => sorted.some(session => session.session_id === current) ? current : sorted[0].session_id)
  }, [sessions])

  useEffect(() => {
    if (!group_id || !leftId || !rightId || !sessionId) {
      setCompareData(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    async function loadCompare() {
      const [leftLatest, rightLatest, leftHistory, rightHistory, leftAttendance, rightAttendance] = await Promise.all([
        statsDB.getLatest(leftId, group_id),
        statsDB.getLatest(rightId, group_id),
        statsDB.getByMember(leftId, group_id),
        statsDB.getByMember(rightId, group_id),
        attendanceDB.getByMember(leftId, group_id),
        attendanceDB.getByMember(rightId, group_id),
      ])

      if (!active) return

      const session = sessions.find(item => item.session_id === sessionId)
      const leftSessionAttendance = leftAttendance.find(item => item.session_id === sessionId) ?? null
      const rightSessionAttendance = rightAttendance.find(item => item.session_id === sessionId) ?? null

      const summarizeAttendance = rows => {
        const total = rows.length || 1
        const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0 }
        rows.forEach(row => {
          if (counts[row.status] !== undefined) counts[row.status] += 1
        })
        return {
          counts,
          pctHadir: Math.round((counts.hadir / total) * 100),
          pctIzin: Math.round((counts.izin / total) * 100),
          pctSakit: Math.round((counts.sakit / total) * 100),
          pctAlpha: Math.round((counts.alpha / total) * 100),
          total: rows.length,
        }
      }

      setCompareData({
        session,
        leftLatest,
        rightLatest,
        leftPrev: leftHistory.length >= 2 ? leftHistory[leftHistory.length - 2] : null,
        rightPrev: rightHistory.length >= 2 ? rightHistory[rightHistory.length - 2] : null,
        leftAttendance: summarizeAttendance(leftAttendance),
        rightAttendance: summarizeAttendance(rightAttendance),
        leftSessionAttendance,
        rightSessionAttendance,
      })
      setLoading(false)
    }

    loadCompare()
    return () => {
      active = false
    }
  }, [group_id, leftId, rightId, sessionId, sessions])

  const leftMember = members.find(member => member.member_id === leftId)
  const rightMember = members.find(member => member.member_id === rightId)
  const attendanceStatusStyles = {
    hadir: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    izin: 'bg-amber-50 text-amber-700 border-amber-200',
    sakit: 'bg-violet-50 text-violet-700 border-violet-200',
    alpha: 'bg-rose-50 text-rose-700 border-rose-200',
    empty: 'bg-slate-50 text-slate-500 border-slate-200',
  }

  const compareRows = SKILL_VARS.map(skill => {
    const leftValue = compareData?.leftLatest?.scores?.[skill.key] ?? 0
    const rightValue = compareData?.rightLatest?.scores?.[skill.key] ?? 0
    return {
      ...skill,
      leftValue,
      rightValue,
      delta: leftValue - rightValue,
    }
  })

  return (
    <div className="card-glass rounded-3xl p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-display font-semibold tracking-[0.16em] uppercase text-[var(--accent)]">Compare Anggota</p>
          <p className="text-sm font-body text-m-muted">Bandingkan radar penilaian dan kehadiran dua anggota dalam satu panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={leftId}
          onChange={event => setLeftId(event.target.value)}
          className="bg-white/80 border border-m-border rounded-xl px-3 py-2 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
          {members.map(member => <option key={member.member_id} value={member.member_id}>{member.name}</option>)}
        </select>
        <select
          value={rightId}
          onChange={event => setRightId(event.target.value)}
          className="bg-white/80 border border-m-border rounded-xl px-3 py-2 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
          {members.map(member => <option key={member.member_id} value={member.member_id}>{member.name}</option>)}
        </select>
        <select
          value={sessionId}
          onChange={event => setSessionId(event.target.value)}
          className="bg-white/80 border border-m-border rounded-xl px-3 py-2 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
          {[...sessions]
            .sort((left, right) => right.session_date.localeCompare(left.session_date))
            .map(session => (
              <option key={session.session_id} value={session.session_id}>
                {session.title} - {formatDate(session.session_date)}
              </option>
            ))}
        </select>
      </div>

      {loading || !compareData ? (
        <Spinner/>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[leftMember, rightMember].map((member, index) => {
              const latest = index === 0 ? compareData.leftLatest : compareData.rightLatest
              const average = latest?.scores
                ? Math.round(Object.values(latest.scores).reduce((total, score) => total + score, 0) / SKILL_VARS.length)
                : 0
              return (
                <div key={member?.member_id ?? index} className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_12px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[var(--accent)]">{index === 0 ? 'Anggota A' : 'Anggota B'}</p>
                  <p className="text-sm font-body font-semibold text-m-text mt-1">{member?.name}</p>
                  <p className="text-xs font-body text-m-muted">{member?.instrument}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-body text-m-muted uppercase">Rata-rata</p>
                      <p className="text-2xl font-display" style={{ color: getScoreTone(average) }}>{average}</p>
                    </div>
                    <p className="text-[10px] font-body text-m-muted text-right">
                      {latest?.session_date ? `Update ${formatDate(latest.session_date)}` : 'Belum ada penilaian'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <CompareMemberRadar
            left={compareData.leftLatest}
            right={compareData.rightLatest}
            leftLabel={leftMember?.name?.split(' ')[0] ?? 'A'}
            rightLabel={rightMember?.name?.split(' ')[0] ?? 'B'}
          />

          <div className="rounded-2xl border border-white/80 bg-white/72 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-body font-semibold text-m-text">Detail Skill</p>
              <p className="text-[10px] font-body text-m-muted">Delta = A dikurangi B</p>
            </div>
            {compareRows.map(row => (
              <div key={row.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl bg-white/75 px-3 py-2 border border-white/80">
                <div>
                  <p className="text-xs font-body font-medium text-m-text">{row.label}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(row.leftValue, row.rightValue)}%`,
                        background: `linear-gradient(90deg, ${getScoreTone(row.leftValue)} 0%, ${getScoreTone(row.rightValue)} 100%)`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-display w-8 text-right" style={{ color: getScoreTone(row.leftValue) }}>{row.leftValue}</span>
                <span className={`text-[11px] font-body w-10 text-center ${row.delta === 0 ? 'text-m-muted' : row.delta > 0 ? 'text-m-green' : 'text-m-coral'}`}>
                  {row.delta > 0 ? '+' : ''}{row.delta}
                </span>
                <span className="text-sm font-display w-8 text-right" style={{ color: getScoreTone(row.rightValue) }}>{row.rightValue}</span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/72 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-body font-semibold text-m-text">Compare Kehadiran</p>
                <p className="text-[11px] font-body text-m-muted">
                  Sesi dipilih: {compareData.session ? `${compareData.session.title} - ${formatDate(compareData.session.session_date)}` : 'Belum ada sesi'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Anggota A',
                  member: leftMember,
                  sessionAttendance: compareData.leftSessionAttendance,
                  overall: compareData.leftAttendance,
                },
                {
                  label: 'Anggota B',
                  member: rightMember,
                  sessionAttendance: compareData.rightSessionAttendance,
                  overall: compareData.rightAttendance,
                },
              ].map(item => {
                const statusKey = item.sessionAttendance?.status ?? 'empty'
                return (
                  <div key={item.label} className="rounded-2xl border border-white/80 bg-white/80 p-3">
                    <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[var(--accent)]">{item.label}</p>
                    <p className="text-sm font-body font-semibold text-m-text mt-1">{item.member?.name}</p>
                    <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full border text-[11px] font-body ${attendanceStatusStyles[statusKey]}`}>
                      {item.sessionAttendance?.status ? item.sessionAttendance.status.toUpperCase() : 'BELUM DIISI'}
                    </span>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-body">
                      <div className="rounded-xl bg-cyan-50 px-2.5 py-2 text-cyan-700">Hadir {item.overall.pctHadir}%</div>
                      <div className="rounded-xl bg-amber-50 px-2.5 py-2 text-amber-700">Izin {item.overall.pctIzin}%</div>
                      <div className="rounded-xl bg-violet-50 px-2.5 py-2 text-violet-700">Sakit {item.overall.pctSakit}%</div>
                      <div className="rounded-xl bg-rose-50 px-2.5 py-2 text-rose-700">Alpha {item.overall.pctAlpha}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatsRanking({ members, group_id, exportRefs }) {
  const [filterSkill, setFilterSkill] = useState('loyalitas')
  const [filterInstrument, setFilterInstrument] = useState('all')
  const [filterJabatan, setFilterJabatan] = useState('all')
  const [filterAngkatan, setFilterAngkatan] = useState('all')
  const [rankData, setRankData] = useState([])
  const [loading, setLoading] = useState(true)

  const filteredMembers = useMemo(() => members.filter(member => {
    if (member.status !== 'active') return false
    if (filterInstrument !== 'all' && member.instrument !== filterInstrument) return false
    if (filterJabatan !== 'all' && member.jabatan !== filterJabatan) return false
    if (filterAngkatan !== 'all' && member.angkatan !== filterAngkatan) return false
    return true
  }), [members, filterInstrument, filterJabatan, filterAngkatan])

  useEffect(() => {
    if (!group_id || filteredMembers.length === 0) {
      setRankData([])
      setLoading(false)
      return
    }
    setLoading(true)

    async function compute() {
      const results = await Promise.all(
        filteredMembers.map(async member => {
          const latest = await statsDB.getLatest(member.member_id, group_id)
          return { name: member.name.split(' ')[0], value: latest?.scores?.[filterSkill] ?? 0 }
        })
      )
      setRankData(results.sort((left, right) => right.value - left.value))
      setLoading(false)
    }

    compute()
  }, [group_id, filteredMembers, filterSkill])

  const skillVar = SKILL_VARS.find(skill => skill.key === filterSkill)
  const skillColor = skillVar?.color ?? '#00e5ff'
  const instrumentOpts = ['all', ...new Set(members.filter(member => member.status === 'active').map(member => member.instrument).filter(Boolean))]
  const jabatanOpts = ['all', ...new Set(members.filter(member => member.status === 'active').map(member => member.jabatan).filter(Boolean))]
  const angkatanOpts = [...new Set(members.filter(member => member.status === 'active').map(member => member.angkatan).filter(Boolean))]
  const filterLabel = [
    filterInstrument !== 'all' && filterInstrument,
    filterJabatan !== 'all' && filterJabatan,
    filterAngkatan !== 'all' && `Angkatan ${filterAngkatan}`,
  ].filter(Boolean).join(' · ')

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
            {SKILL_VARS.map(skill => (
              <button
                key={skill.key}
                onClick={() => setFilterSkill(skill.key)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-body border transition-all ${filterSkill === skill.key ? 'border-transparent text-white font-semibold' : 'border-m-border text-m-muted'}`}
                style={filterSkill === skill.key ? { background: skill.color } : {}}>
                {skill.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Instrumen</p>
            <select
              value={filterInstrument}
              onChange={event => setFilterInstrument(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {instrumentOpts.map(option => <option key={option} value={option}>{option === 'all' ? 'Semua' : option}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Jabatan</p>
            <select
              value={filterJabatan}
              onChange={event => setFilterJabatan(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              {jabatanOpts.map(option => <option key={option} value={option}>{option === 'all' ? 'Semua' : option}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[9px] font-body text-m-muted mb-1 uppercase">Angkatan</p>
            <select
              value={filterAngkatan}
              onChange={event => setFilterAngkatan(event.target.value)}
              className="w-full bg-white/60 border border-m-border rounded-lg px-2 py-1.5 text-xs text-m-text font-body focus:outline-none focus:border-[var(--accent)] transition-colors">
              <option value="all">Semua</option>
              {angkatanOpts.map(option => <option key={option} value={option}>Angkatan {option}</option>)}
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
            ? <EmptyState icon="PS" title="Belum ada data penilaian"/>
            : <MemberRankingChart data={rankData} color={skillColor} valueLabel={skillVar?.label}/>}
        </ExportSection>
      </div>
    </div>
  )
}

export default function Stats() {
  const { activeGroup } = useGroup()
  const gid = activeGroup?.group_id
  const { members, loading: membersLoading } = useMembers(gid)
  const { sessions } = useSessions(gid)

  const [tab, setTab] = useState('absensi')
  const [exportModal, setExportModal] = useState(false)

  const exportRefs = {
    trend: useRef(null),
    rate: useRef(null),
    ranking: useRef(null),
    skillrank: useRef(null),
    members: useRef(null),
  }

  const memberExportRefs = useRef({})
  const getMemberRef = useCallback(memberId => {
    if (!memberExportRefs.current[memberId]) {
      memberExportRefs.current[memberId] = { current: null }
    }
    return memberExportRefs.current[memberId]
  }, [])

  const penilaianExportRefs = useMemo(() => {
    return { members: exportRefs.members }
  }, [exportRefs.members])

  const activeMembers = members.filter(member => member.status === 'active')
  if (!activeGroup) return <EmptyState icon="PS" title="Pilih grup dulu"/>

  const tabs = [
    { key: 'absensi', label: 'Absensi', icon: BarChart2 },
    { key: 'penilaian', label: 'Penilaian', icon: Users },
    { key: 'ranking', label: 'Ranking', icon: TrendingUp },
  ]

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Statistik</SectionTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body card-glass border border-[var(--accent)]/20 text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] transition-all"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.2))' }}>
            <Camera size={13}/>
            Export PNG
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-5 p-1 bg-white/60 rounded-xl border border-m-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body transition-all duration-200 ${
              tab === key ? 'bg-[var(--accent)] text-white font-semibold' : 'text-m-muted hover:text-m-text'
            }`}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {tab === 'absensi' && (
        sessions.length === 0
          ? <EmptyState icon="PL" title="Belum ada sesi" subtitle="Buat sesi latihan terlebih dahulu"/>
          : <AttendanceCharts group_id={gid} members={members} sessions={sessions} exportRefs={exportRefs}/>
      )}

      {tab === 'penilaian' && (
        membersLoading
          ? <div className="space-y-2">{[1, 2, 3].map(index => <SkeletonCard key={index}/>)}</div>
          : activeMembers.length === 0
            ? <EmptyState icon="MU" title="Belum ada anggota aktif"/>
            : (
              <div className="space-y-2">
                <CompareMembersPanel members={activeMembers} group_id={gid} sessions={sessions}/>
                <div ref={exportRefs.members} className="space-y-2">
                {activeMembers.map(member => (
                  <MemberStatCard
                    key={member.member_id}
                    member={member}
                    group_id={gid}
                    exportRef={getMemberRef(member.member_id)}
                    sessions={sessions}
                  />
                ))}
                </div>
              </div>
            )
      )}

      {tab === 'ranking' && (
        <StatsRanking members={members} group_id={gid} exportRefs={exportRefs}/>
      )}

      <ExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        activeTab={tab}
        groupName={activeGroup?.group_name ?? 'Grup'}
        exportRefs={tab === 'penilaian' ? penilaianExportRefs : exportRefs}
      />
    </div>
  )
}
