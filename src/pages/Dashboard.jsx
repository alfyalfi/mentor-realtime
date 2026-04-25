import { useEffect, useState, memo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { useGroup } from '../context/AppContext'
import { membersDB, sessionsDB, attendanceDB } from '../services/indexeddb'
import { Card, SectionTitle, EmptyState, SkeletonCard } from '../components/ui'
import { formatDate } from '../utils/helpers'
import { ATTENDANCE_STATUS } from '../utils/constants'

const STATUS_COLORS = {
  hadir: { bg: 'rgba(0,180,216,0.08)',  text: '#0077a8', border: 'rgba(0,180,216,0.2)'  },
  izin:  { bg: 'rgba(245,166,35,0.08)', text: '#b36a00', border: 'rgba(245,166,35,0.2)' },
  sakit: { bg: 'rgba(139,92,246,0.08)', text: '#6d28d9', border: 'rgba(139,92,246,0.2)' },
  alpha: { bg: 'rgba(240,82,82,0.08)',  text: '#c81e1e', border: 'rgba(240,82,82,0.2)'  },
}

export default function Dashboard() {
  const { activeGroup } = useGroup()
  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeGroup) { setLoading(false); return }
    setLoading(true)
    const gid = activeGroup.group_id
    Promise.all([membersDB.getByGroup(gid), sessionsDB.getByGroup(gid)])
      .then(async ([members, sessions]) => {
        const lastSession = sessions[0]
        let attendanceSummary = null
        if (lastSession) {
          const att = await attendanceDB.getBySession(lastSession.session_id, gid)
          const counts = {}
          ATTENDANCE_STATUS.forEach(s => { counts[s.key] = 0 })
          att.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
          attendanceSummary = { session: lastSession, counts, total: att.length }
        }
        setStats({
          totalMembers:  members.length,
          activeMembers: members.filter(m => m.status === 'active').length,
          totalSessions: sessions.length,
          lastAttendance: attendanceSummary,
        })
        setRecent(sessions.slice(0, 4))
        setLoading(false)
      })
  }, [activeGroup])

  // ← Auto-refresh dashboard saat ada perubahan Realtime dari device lain
  useEffect(() => {
    function handleUpdate() {
      if (!activeGroup) return
      const gid = activeGroup.group_id
      Promise.all([membersDB.getByGroup(gid), sessionsDB.getByGroup(gid)])
        .then(async ([members, sessions]) => {
          const lastSession = sessions[0]
          let attendanceSummary = null
          if (lastSession) {
            const att = await attendanceDB.getBySession(lastSession.session_id, gid)
            const counts = {}
            ATTENDANCE_STATUS.forEach(s => { counts[s.key] = 0 })
            att.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
            attendanceSummary = { session: lastSession, counts, total: att.length }
          }
          setStats({
            totalMembers:  members.length,
            activeMembers: members.filter(m => m.status === 'active').length,
            totalSessions: sessions.length,
            lastAttendance: attendanceSummary,
          })
          setRecent(sessions.slice(0, 4))
        })
    }
    window.addEventListener('mentordb:updated', handleUpdate)
    return () => window.removeEventListener('mentordb:updated', handleUpdate)
  }, [activeGroup])

  if (!activeGroup) return (
    <div className="px-4 pt-16 pb-24 max-w-2xl mx-auto text-center animate-fade-in">
      <p className="text-4xl mb-4 opacity-30">🎵</p>
      <p className="text-m-sub font-body text-sm">Pilih grup di menu <span className="text-[var(--accent)] font-medium">Grup</span></p>
    </div>
  )

  return (
    <div className="px-4 pt-4 pb-28 max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* Hero card */}
      <div className="card-glass rounded-2xl p-5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)' }}/>
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest mb-1 neon-text">Grup Aktif</p>
        <h1 className="font-display font-bold text-xl text-m-text leading-tight">{activeGroup.group_name}</h1>
        {activeGroup.description && (
          <p className="text-m-muted text-xs font-body mt-1">{activeGroup.description}</p>
        )}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl"/>)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Anggota Aktif', val: stats.activeMembers  },
              { label: 'Total Sesi',    val: stats.totalSessions  },
              { label: 'Alumni',        val: stats.totalMembers - stats.activeMembers },
            ].map(s => (
              <div key={s.label} className="bg-white/60 rounded-xl p-3 text-center border border-m-border">
                <div className="text-2xl font-display font-bold text-[var(--accent)]">{s.val}</div>
                <div className="text-[10px] font-body text-m-muted mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last attendance */}
      {stats?.lastAttendance && (
        <div>
          <SectionTitle>Sesi Terakhir</SectionTitle>
          <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-body text-sm text-m-text font-semibold">{stats.lastAttendance.session.title}</p>
                <p className="font-body text-xs text-m-muted">{formatDate(stats.lastAttendance.session.session_date)}</p>
              </div>
              <Link to={`/sessions/${stats.lastAttendance.session.session_id}`}
                className="text-xs neon-text font-body flex items-center gap-0.5 font-medium">
                Detail <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hadir', val: stats.lastAttendance.counts.hadir, key: 'hadir' },
                { label: 'Izin',  val: stats.lastAttendance.counts.izin,  key: 'izin'  },
                { label: 'Sakit', val: stats.lastAttendance.counts.sakit, key: 'sakit' },
                { label: 'Alpha', val: stats.lastAttendance.counts.alpha, key: 'alpha' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-2 text-center border"
                  style={{ background: STATUS_COLORS[s.key].bg, borderColor: STATUS_COLORS[s.key].border }}>
                  <div className="text-lg font-display font-bold" style={{ color: STATUS_COLORS[s.key].text }}>{s.val}</div>
                  <div className="text-[10px] font-body text-m-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <SectionTitle>Aksi Cepat</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { to: '/sessions', icon: ClipboardList, label: 'Sesi Baru' },
            { to: '/members',  icon: Users,         label: 'Anggota'   },
            { to: '/stats',    icon: TrendingUp,    label: 'Stats'     },
          ].map(a => (
            <Link key={a.to} to={a.to}
              className="card-glass rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-card-lift transition-all active:scale-95">
              <a.icon size={20} style={{ color: 'var(--accent)' }}/>
              <span className="text-xs font-body font-medium text-m-sub">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      {recent.length > 0 && (
        <div>
          <SectionTitle>Riwayat Sesi</SectionTitle>
          <div className="space-y-2">
            {recent.map(s => (
              <Link key={s.session_id} to={`/sessions/${s.session_id}`}
                className="flex items-center justify-between card-glass rounded-2xl px-4 py-3 hover:shadow-card-md transition-all">
                <div className="min-w-0">
                  <p className="text-sm font-body text-m-text font-medium truncate">{s.title}</p>
                  <p className="text-xs font-body text-m-muted">{formatDate(s.session_date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] border rounded-lg px-2 py-0.5 font-body font-medium ${
                    s.status === 'open'
                      ? 'text-[var(--accent)] border-[var(--accent-glow)] bg-[var(--accent-soft)]'
                      : 'text-m-muted border-m-border bg-slate-50'
                  }`}>
                    {s.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                  <ChevronRight size={13} className="text-m-muted"/>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
