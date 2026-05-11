import { memo, useId, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ComposedChart
} from 'recharts'
import { SKILL_VARS } from '../../utils/constants'

const TIP = {
  contentStyle: {
    background: 'rgba(255,255,255,0.97)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 10,
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    color: '#0f1117',
  },
  itemStyle: { color: '#4a5568' },
  labelStyle: { color: '#9aa0ad', fontWeight: 600 },
}

function getThemeAccent() {
  if (typeof document === 'undefined') return '#00b4d8'
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'yellow' ? '#f5c542' : '#00b4d8'
}

function mixColor(start, end, ratio) {
  const safeRatio = Math.max(0, Math.min(1, ratio))
  const normalize = value => value.replace('#', '')
  const parse = value => normalize(value).match(/.{1,2}/g).map(part => parseInt(part, 16))
  const [sr, sg, sb] = parse(start)
  const [er, eg, eb] = parse(end)
  const toHex = value => value.toString(16).padStart(2, '0')
  const red = Math.round(sr + (er - sr) * safeRatio)
  const green = Math.round(sg + (eg - sg) * safeRatio)
  const blue = Math.round(sb + (eb - sb) * safeRatio)
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function getScoreColor(score) {
  const value = Math.max(0, Math.min(100, score ?? 0))
  const accent = getThemeAccent()
  const green = '#18b76a'
  const red = '#ff5f5f'
  if (value <= 50) return mixColor(red, green, value / 50)
  return mixColor(green, accent, (value - 50) / 50)
}

export const MemberRadar = memo(function MemberRadar({ latest, previous }) {
  const chartId = useId().replace(/:/g, '')
  if (!latest?.scores) return (
    <div className="flex items-center justify-center h-56 text-m-muted text-sm font-body">
      Belum ada data penilaian
    </div>
  )
  const currentAverage = Math.round(
    Object.values(latest.scores).reduce((total, score) => total + score, 0) / SKILL_VARS.length
  )
  const currentColor = getScoreColor(currentAverage)
  const chartGlow = `${currentColor}55`
  const currentFill = `${currentColor}26`

  const data = SKILL_VARS.map(v => ({
    label: v.label,
    Terkini: latest.scores[v.key] ?? 0,
    tone: getScoreColor(latest.scores[v.key] ?? 0),
    ...(previous ? { 'Sesi lalu': previous.scores[v.key] ?? 0 } : {}),
  }))

  const pointDots = useMemo(() => data.map(item => ({
    value: item.Terkini,
    color: item.tone,
  })), [data])

  return (
    <div
      className="w-full h-56 rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(245,249,255,0.86)_55%,rgba(232,240,248,0.75))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_40px_rgba(15,23,42,0.08)]"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.92), 0 18px 42px ${chartGlow}` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
          <defs>
            <linearGradient id={`${chartId}-surface`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#eef4fb" stopOpacity="0.68" />
            </linearGradient>
            <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentColor} stopOpacity="0.34" />
              <stop offset="65%" stopColor={currentColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={currentColor} stopOpacity="0.05" />
            </linearGradient>
            <filter id={`${chartId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor={currentColor} floodOpacity="0.22" />
            </filter>
            <filter id={`${chartId}-dot`} x="-200%" y="-200%" width="400%" height="400%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={currentColor} floodOpacity="0.25" />
            </filter>
          </defs>
          <PolarGrid gridType="polygon" radialLines={false} stroke="rgba(148,163,184,0.22)" strokeWidth={1}/>
          <PolarAngleAxis dataKey="label" tick={{ fill: '#4a5568', fontSize: 11, fontFamily: 'Inter' }}/>
          <PolarRadiusAxis
            domain={[0,100]}
            tick={{ fill: '#9aa0ad', fontSize: 9 }}
            axisLine={false}
            tickCount={5}
            stroke="rgba(148,163,184,0.18)"
          />
          {previous && (
            <Radar name="Sesi lalu" dataKey="Sesi lalu"
              stroke="rgba(245,166,35,0.48)" fill="rgba(245,166,35,0.08)"
              strokeWidth={1.5} strokeDasharray="4 3"
              isAnimationActive
              animationDuration={520}
              animationEasing="ease-out"/>
          )}
          <Radar
            dataKey="Terkini"
            name="Aura"
            stroke="none"
            fill={currentFill}
            fillOpacity={0.28}
            filter={`url(#${chartId}-glow)`}
            isAnimationActive
            animationDuration={720}
            animationEasing="ease-out"
          />
          <Radar name="Terkini" dataKey="Terkini"
            stroke={currentColor}
            fill={`url(#${chartId}-fill)`}
            strokeWidth={2.6}
            isAnimationActive
            animationDuration={860}
            animationEasing="ease-out"
            dot={({ cx, cy, payload, index }) => {
              const point = pointDots[index]
              return (
                <g key={`${payload.label}-${index}`} filter={`url(#${chartId}-dot)`}>
                  <circle cx={cx} cy={cy} r="6.5" fill={`${point.color}18`} />
                  <circle cx={cx} cy={cy} r="4.3" fill={point.color} stroke="#ffffff" strokeWidth="1.4" />
                </g>
              )
            }}
          />
          <Tooltip {...TIP}/>
          {previous && <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', color: '#9aa0ad' }}/>}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})

export const ScoreCards = memo(function ScoreCards({ scores, prevScores }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {SKILL_VARS.map(v => {
        const val   = scores?.[v.key] ?? 0
        const prev  = prevScores?.[v.key] ?? val
        const delta = val - prev
        const tone = getScoreColor(val)
        return (
          <div
            key={v.key}
            className="rounded-xl p-2 text-center border border-white/80 transition-all duration-300"
            style={{
              background: `linear-gradient(180deg, ${tone}12 0%, rgba(255,255,255,0.96) 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px ${tone}14`,
            }}>
            <div className="text-[9px] font-body text-m-muted mb-1 truncate">{v.label}</div>
            <div className="text-sm font-display font-bold transition-colors duration-300" style={{ color: tone }}>{val}</div>
            {delta !== 0 && (
              <div className={`text-[9px] font-body mt-0.5 ${delta > 0 ? 'text-m-green' : 'text-m-coral'}`}>
                {delta > 0 ? '+' : ''}{delta}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export const CompareMemberRadar = memo(function CompareMemberRadar({ left, right, leftLabel, rightLabel }) {
  const chartId = useId().replace(/:/g, '')
  if (!left?.scores || !right?.scores) return (
    <div className="flex items-center justify-center h-64 text-m-muted text-sm font-body">
      Pilih dua anggota untuk membandingkan penilaian
    </div>
  )

  const leftAvg = Math.round(Object.values(left.scores).reduce((total, score) => total + score, 0) / SKILL_VARS.length)
  const rightAvg = Math.round(Object.values(right.scores).reduce((total, score) => total + score, 0) / SKILL_VARS.length)
  const leftColor = getScoreColor(leftAvg)
  const rightColor = getScoreColor(rightAvg)
  const data = SKILL_VARS.map(skill => ({
    label: skill.label,
    [leftLabel]: left.scores[skill.key] ?? 0,
    [rightLabel]: right.scores[skill.key] ?? 0,
  }))

  return (
    <div
      className="w-full h-64 rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(244,249,255,0.86)_58%,rgba(232,240,248,0.76))]"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.92), 0 18px 42px ${leftColor}22, 0 8px 28px ${rightColor}1c` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
          <defs>
            <linearGradient id={`${chartId}-left`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={leftColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={leftColor} stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={`${chartId}-right`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={rightColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={rightColor} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <PolarGrid gridType="polygon" radialLines={false} stroke="rgba(148,163,184,0.22)" strokeWidth={1}/>
          <PolarAngleAxis dataKey="label" tick={{ fill: '#4a5568', fontSize: 11, fontFamily: 'Inter' }}/>
          <PolarRadiusAxis domain={[0,100]} tick={{ fill: '#9aa0ad', fontSize: 9 }} axisLine={false} tickCount={5} />
          <Radar
            name={leftLabel}
            dataKey={leftLabel}
            stroke={leftColor}
            fill={`url(#${chartId}-left)`}
            strokeWidth={2.8}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
            dot={{ fill: leftColor, r: 4, stroke: '#ffffff', strokeWidth: 1.4 }}
          />
          <Radar
            name={rightLabel}
            dataKey={rightLabel}
            stroke={rightColor}
            fill={`url(#${chartId}-right)`}
            strokeWidth={2.2}
            strokeDasharray="5 4"
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
            dot={{ fill: rightColor, r: 3.5, stroke: '#ffffff', strokeWidth: 1.2 }}
          />
          <Tooltip {...TIP}/>
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', color: '#9aa0ad' }}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})

export const AttendanceTrendChart = memo(function AttendanceTrendChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-m-muted text-sm font-body">
      Belum ada data absensi
    </div>
  )
  return (
    <div
      className="w-full h-64 rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(244,249,255,0.88)_58%,rgba(232,240,248,0.76))]"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.92), 0 18px 38px rgba(0,180,216,0.12)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: -18 }} barCategoryGap="26%">
          <defs>
            <linearGradient id="att-hadir" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#36d7ff" />
              <stop offset="100%" stopColor="#00a7cf" />
            </linearGradient>
            <linearGradient id="att-izin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd95f" />
              <stop offset="100%" stopColor="#f5b521" />
            </linearGradient>
            <linearGradient id="att-sakit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c493ff" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="att-alpha" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff8b8b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
          <XAxis dataKey="label" tick={{ fill: '#7b8798', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="count" tick={{ fill: '#9aa0ad', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false}/>
          <YAxis yAxisId="rate" orientation="right" domain={[0,100]} hide />
          <Tooltip
            {...TIP}
            formatter={(value, name) => {
              if (name === '% Hadir') return [`${value}%`, name]
              return [value, name]
            }}
            labelFormatter={(value, payload) => {
              const row = payload?.[0]?.payload
              return row ? `${row.fullLabel} - ${row.prettyDate}` : value
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter', color: '#9aa0ad', paddingTop: 12 }}/>
          <Bar yAxisId="count" dataKey="Hadir" stackId="attendance" fill="url(#att-hadir)" radius={[6,6,0,0]} />
          <Bar yAxisId="count" dataKey="Izin" stackId="attendance" fill="url(#att-izin)" radius={[6,6,0,0]} />
          <Bar yAxisId="count" dataKey="Sakit" stackId="attendance" fill="url(#att-sakit)" radius={[6,6,0,0]} />
          <Bar yAxisId="count" dataKey="Alpha" stackId="attendance" fill="url(#att-alpha)" radius={[6,6,0,0]} />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="pctHadir"
            name="% Hadir"
            stroke="#0f9ec7"
            strokeWidth={2.4}
            dot={{ fill: '#ffffff', stroke: '#0f9ec7', strokeWidth: 2, r: 4.3 }}
            activeDot={{ r: 6, fill: '#0f9ec7', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})

export const AttendanceRateChart = memo(function AttendanceRateChart({ data }) {
  if (!data?.length) return null
  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false}/>
          <XAxis dataKey="label" tick={{ fill: '#9aa0ad', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
          <YAxis domain={[0,100]} unit="%" tick={{ fill: '#9aa0ad', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
          <Tooltip {...TIP} formatter={v => [`${v}%`, '% Hadir']}/>
          <Line type="monotone" dataKey="pctHadir" stroke="#00b4d8" strokeWidth={2}
            dot={{ fill: '#00b4d8', r: 3 }} activeDot={{ r: 5 }} name="% Hadir"/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

export const MemberRankingChart = memo(function MemberRankingChart({ data, color = '#00b4d8', valueLabel = 'Nilai' }) {
  if (!data?.length) return null
  const h = Math.max(160, data.length * 34 + 40)
  return (
    <div className="w-full" style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false}/>
          <XAxis type="number" domain={[0,100]} tick={{ fill: '#9aa0ad', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
          <YAxis type="category" dataKey="name" width={80}
            tick={{ fill: '#4a5568', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
          <Tooltip {...TIP} formatter={v => [v, valueLabel]}/>
          <Bar dataKey="value" fill={color} radius={[0,4,4,0]}
            label={{ position: 'right', fill: color, fontSize: 11, fontFamily: 'Inter', fontWeight: 600 }}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
