export const ATTENDANCE_STATUS = [
  { key: 'hadir',  label: 'Hadir',  color: 'cyan'   },
  { key: 'izin',   label: 'Izin',   color: 'yellow' },
  { key: 'sakit',  label: 'Sakit',  color: 'purple' },
  { key: 'alpha',  label: 'Alpha',  color: 'coral'  },
]

export const MEMBER_STATUS = [
  { key: 'active',   label: 'Active'   },
  { key: 'inactive', label: 'Inactive' },
  { key: 'alumni',   label: 'Alumni'   },
  { key: 'on_leave', label: 'On Leave' },
]

export const JABATAN = [
  'Ketua',
  'Wakil',
  'Sekertaris I',
  'Sekertaris II',
  'Bendahara I',
  'Bendahara II',
  'Humas',
  'Anggota',
]

export const INSTRUMENTS = [
  'Guitarist', 'Vocalist', 'Bassist', 'Drummer', 'Keyboardist',
]

export const SKILL_VARS = [
  { key: 'loyalitas',   label: 'Loyalitas',   color: '#00e5ff' },
  { key: 'skill',       label: 'Skill',        color: '#ffe600' },
  { key: 'kreativitas', label: 'Kreativitas',  color: '#b56aff' },
  { key: 'attitude',    label: 'Attitude',     color: '#00ffaa' },
  { key: 'synergy',     label: 'Synergy',      color: '#ff4d6d' },
]

export const DEFAULT_SCORES = {
  loyalitas: 50, skill: 50, kreativitas: 50, attitude: 50, synergy: 50
}

export const STATUS_COLOR = {
  hadir:  'text-beat-cyan   bg-beat-cyan/10   border-beat-cyan/30',
  izin:   'text-beat-yellow bg-beat-yellow/10 border-beat-yellow/30',
  sakit:  'text-beat-purple bg-beat-purple/10 border-beat-purple/30',
  alpha:  'text-beat-coral  bg-beat-coral/10  border-beat-coral/30',
}

export const SHEETS_TABLES = ['groups','members','sessions','attendance','stats_history']
