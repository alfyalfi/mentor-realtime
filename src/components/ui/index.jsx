import { X } from 'lucide-react'

// ── Button ────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center gap-1.5 font-body font-medium rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  const variants = {
    primary: 'bg-[var(--accent)] text-white shadow-sm hover:opacity-90 active:scale-95',
    yellow:  'bg-m-yellow text-white shadow-sm hover:opacity-90 active:scale-95',
    ghost:   'bg-white/70 border border-m-border text-m-sub hover:bg-white hover:border-m-bordhi active:scale-95',
    danger:  'bg-red-50 text-m-coral border border-red-200 hover:bg-red-100 active:scale-95',
    outline: 'border border-m-border text-m-sub bg-white/50 hover:bg-white hover:border-m-bordhi active:scale-95',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant] ?? variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ label, color = 'gray' }) {
  const colors = {
    cyan:   'text-m-cyandark bg-m-cyanglow border-[rgba(0,180,216,0.25)]',
    yellow: 'text-m-yelldark bg-m-yellglow border-[rgba(245,166,35,0.25)]',
    purple: 'text-purple-700  bg-purple-50   border-purple-200',
    coral:  'text-red-600     bg-red-50      border-red-200',
    green:  'text-emerald-700 bg-emerald-50  border-emerald-200',
    gray:   'text-m-sub       bg-slate-100   border-m-border',
    accent: 'text-[var(--accent-text)] bg-[var(--accent-soft)] border-[var(--accent-glow)]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border font-body font-medium ${colors[color] ?? colors.gray}`}>
      {label}
    </span>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"/>
      <div className={`relative w-full ${width} bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up shadow-card-lift border border-white flex flex-col`}
        style={{ maxHeight: 'min(88vh, 100dvh - 2rem)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-m-border flex-shrink-0 bg-white/95 backdrop-blur-sm rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="font-display text-xs font-semibold tracking-widest uppercase neon-text">{title}</h2>
          <button onClick={onClose} className="text-m-muted hover:text-m-text p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="p-5 overflow-y-auto overscroll-contain flex-1 pb-8">{children}</div>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className = '', glow = false }) {
  return (
    <div className={`card-glass rounded-2xl ${glow ? 'neon-border' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-semibold text-m-sub font-body uppercase tracking-wider">{label}</label>}
      <input
        className={`w-full bg-white border border-m-border rounded-xl px-3.5 py-2.5 text-sm text-m-text font-body placeholder-m-muted focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all ${error ? 'border-m-coral' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-m-coral">{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-semibold text-m-sub font-body uppercase tracking-wider">{label}</label>}
      <select
        className={`w-full bg-white border border-m-border rounded-xl px-3.5 py-2.5 text-sm text-m-text font-body focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────
export function Textarea({ label, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[10px] font-semibold text-m-sub font-body uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full bg-white border border-m-border rounded-xl px-3.5 py-2.5 text-sm text-m-text font-body placeholder-m-muted focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all resize-none ${className}`}
        rows={3}
        {...props}
      />
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────
export function Slider({ label, value, onChange, color = 'var(--accent)' }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-body font-medium text-m-sub uppercase tracking-wider">{label}</span>
        <span className="text-sm font-display font-bold" style={{ color }}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="text-4xl opacity-40">{icon}</div>
      <p className="text-m-text font-body font-semibold text-sm">{title}</p>
      {subtitle && <p className="text-m-muted font-body text-xs max-w-xs leading-relaxed">{subtitle}</p>}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card-glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-9 h-9 rounded-full flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-2/3"/>
          <div className="skeleton h-2.5 w-1/3"/>
        </div>
        <div className="skeleton w-12 h-5 rounded-lg"/>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i}/>)}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-m-border border-t-[var(--accent)] rounded-full animate-spin"/>
    </div>
  )
}

// ── Section Title ─────────────────────────────────────────────
export function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`section-title ${className}`}>{children}</h2>
  )
}
