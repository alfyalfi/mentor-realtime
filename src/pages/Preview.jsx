import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, ClipboardList, Sparkles, Users } from 'lucide-react'
import { groupsDB, membersDB, sessionsDB, attendanceDB, db } from '../services/indexeddb'
import { EmptyState, Spinner } from '../components/ui'
import { ATTENDANCE_STATUS, SKILL_VARS } from '../utils/constants'
import { formatDate } from '../utils/helpers'

const STATUS_STYLES = {
  hadir: { bg: 'rgba(0,180,216,0.10)', text: '#0077a8', border: 'rgba(0,180,216,0.18)' },
  izin: { bg: 'rgba(245,166,35,0.10)', text: '#b36a00', border: 'rgba(245,166,35,0.18)' },
  sakit: { bg: 'rgba(139,92,246,0.10)', text: '#6d28d9', border: 'rgba(139,92,246,0.18)' },
  alpha: { bg: 'rgba(240,82,82,0.10)', text: '#c81e1e', border: 'rgba(240,82,82,0.18)' },
}

function averageScores(scores) {
  const values = Object.values(scores || {})
  if (!values.length) return 0
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length)
}

function SkillBars({ scores }) {
  return (
    <div className="space-y-2">
      {SKILL_VARS.map(skill => {
        const value = scores?.[skill.key] ?? 0
        return (
          <div key={skill.key} className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-body font-medium text-m-sub">{skill.label}</span>
              <span className="text-[11px] font-display font-bold" style={{ color: skill.color }}>{value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${value}%`, background: `linear-gradient(90deg, ${skill.color}, ${skill.color}cc)` }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Preview() {
  const { group_id } = useParams()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [latestAttendance, setLatestAttendance] = useState(null)
  const [latestStats, setLatestStats] = useState([])

  useEffect(() => {
    if (!group_id) return

    let active = true

    async function loadPreview() {
      setLoading(true)

      const [groupData, memberRows, sessionRows, attendanceRows, statRows] = await Promise.all([
        groupsDB.get(group_id),
        membersDB.getByGroup(group_id),
        sessionsDB.getByGroup(group_id),
        db.attendance.where('group_id').equals(group_id).toArray(),
        db.stats_history.where('group_id').equals(group_id).toArray(),
      ])

      if (!active) return

      const latestSession = sessionRows[0] ?? null
      let attendanceSummary = null

      if (latestSession) {
        const records = attendanceRows.filter(row => row.session_id === latestSession.session_id)
        const counts = {}
        ATTENDANCE_STATUS.forEach(status => {
          counts[status.key] = 0
        })
        records.forEach(record => {
          if (counts[record.status] !== undefined) counts[record.status]++
        })
        attendanceSummary = { session: latestSession, counts, total: records.length }
      }

      const latestStatsByMember = memberRows
        .filter(member => member.status === 'active')
        .map(member => {
          const history = statRows
            .filter(row => row.member_id === member.member_id)
            .sort((left, right) => right.session_date.localeCompare(left.session_date))
          const latest = history[0] ?? null
          return {
            member,
            latest,
            avg: latest ? averageScores(latest.scores) : null,
          }
        })
        .sort((left, right) => (right.avg ?? -1) - (left.avg ?? -1))

      setGroup(groupData ?? null)
      setMembers(memberRows)
      setSessions(sessionRows)
      setLatestAttendance(attendanceSummary)
      setLatestStats(latestStatsByMember)
      setLoading(false)
    }

    loadPreview()
    window.addEventListener('mentordb:updated', loadPreview)
    return () => {
      active = false
      window.removeEventListener('mentordb:updated', loadPreview)
    }
  }, [group_id])

  const statsSummary = useMemo(() => ({
    totalMembers: members.length,
    activeMembers: members.filter(member => member.status === 'active').length,
    totalSessions: sessions.length,
  }), [members, sessions])

  if (loading) return <Spinner/>

  if (!group) {
    return (
      <div className="min-h-screen px-5 py-10">
        <EmptyState icon="PR" title="Preview belum tersedia" subtitle="Group ini belum ditemukan di perangkat ini."/>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-5 pb-10 max-w-md mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border border-m-border bg-white/80 px-3 py-2 text-xs font-body text-m-sub hover:border-m-bordhi hover:text-m-text transition-colors">
          <ArrowLeft size={14}/>
          Kembali
        </Link>
        <div className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-[11px] font-display tracking-[0.14em] uppercase text-[var(--accent)]">
          <Sparkles size={12}/>
          Mobile Preview
        </div>
      </div>

      <section className="card-glass rounded-[28px] overflow-hidden border border-white">
        <div className="px-5 pt-5 pb-6 relative">
          <div
            className="absolute inset-x-0 top-0 h-28 opacity-80"
            style={{ background: 'radial-gradient(circle at top right, var(--accent-soft), transparent 60%)' }}/>
          <div className="relative space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-glow)] bg-white/70 px-3 py-1 text-[10px] font-display tracking-[0.16em] uppercase text-[var(--accent)]">
              <BarChart3 size={12}/>
              Dashboard Read Only
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-m-text leading-tight">{group.group_name}</h1>
              {group.description && <p className="mt-1 text-sm font-body text-m-muted">{group.description}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/80 border border-white px-3 py-3">
                <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">Anggota Aktif</p>
                <p className="mt-1 font-display text-2xl font-bold text-[var(--accent)]">{statsSummary.activeMembers}</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-white px-3 py-3">
                <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">Total Sesi</p>
                <p className="mt-1 font-display text-2xl font-bold text-[var(--accent)]">{statsSummary.totalSessions}</p>
              </div>
              <div className="rounded-2xl bg-white/80 border border-white px-3 py-3">
                <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">Semua Anggota</p>
                <p className="mt-1 font-display text-2xl font-bold text-[var(--accent)]">{statsSummary.totalMembers}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {latestAttendance && (
        <section className="card-glass rounded-[24px] p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-display uppercase tracking-[0.14em] text-[var(--accent)]">Absensi Terakhir</p>
              <h2 className="mt-1 text-base font-body font-semibold text-m-text">{latestAttendance.session.title}</h2>
              <p className="text-xs font-body text-m-muted">{formatDate(latestAttendance.session.session_date)}</p>
            </div>
            <div className="rounded-2xl bg-white/70 border border-white px-3 py-2 text-right">
              <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">Total</p>
              <p className="font-display text-xl font-bold text-[var(--accent)]">{latestAttendance.total}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ATTENDANCE_STATUS.map(status => (
              <div
                key={status.key}
                className="rounded-2xl border px-3 py-3"
                style={{
                  background: STATUS_STYLES[status.key].bg,
                  borderColor: STATUS_STYLES[status.key].border,
                }}>
                <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">{status.label}</p>
                <p className="mt-1 font-display text-2xl font-bold" style={{ color: STATUS_STYLES[status.key].text }}>
                  {latestAttendance.counts[status.key]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="card-glass rounded-[24px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-[var(--accent)]"/>
            <h2 className="font-display text-sm uppercase tracking-[0.14em] text-[var(--accent)]">Preview Sesi</h2>
          </div>
          <div className="space-y-2">
            {sessions.slice(0, 4).map(session => (
              <div key={session.session_id} className="rounded-2xl bg-white/75 border border-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-body font-semibold text-m-text truncate">{session.title}</p>
                    <p className="text-xs font-body text-m-muted">{formatDate(session.session_date)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-body font-medium ${
                    session.status === 'open'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'bg-slate-100 text-m-muted'
                  }`}>
                    {session.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card-glass rounded-[24px] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--accent)]"/>
          <h2 className="font-display text-sm uppercase tracking-[0.14em] text-[var(--accent)]">Preview Penilaian</h2>
        </div>
        {latestStats.length === 0 ? (
          <EmptyState icon="SK" title="Belum ada penilaian" subtitle="Data skill anggota akan muncul di sini saat sudah diinput."/>
        ) : (
          <div className="space-y-3">
            {latestStats.slice(0, 6).map(item => (
              <article key={item.member.member_id} className="rounded-[22px] bg-white/78 border border-white px-4 py-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-body font-semibold text-m-text truncate">{item.member.name}</p>
                    <p className="text-xs font-body text-m-muted">
                      {item.member.instrument}
                      {item.member.jabatan && item.member.jabatan !== 'Anggota' && ` · ${item.member.jabatan}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-body uppercase tracking-wider text-m-muted">Avg</p>
                    <p className="font-display text-2xl font-bold text-[var(--accent)]">{item.avg ?? '-'}</p>
                  </div>
                </div>
                {item.latest?.scores ? (
                  <SkillBars scores={item.latest.scores}/>
                ) : (
                  <p className="text-xs font-body text-m-muted">Belum ada data skor.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
