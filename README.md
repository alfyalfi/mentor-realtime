# Mentor - Band Attendance & Skill Tracker

Mentor adalah aplikasi PWA untuk mengelola grup band, absensi latihan, dan perkembangan skill anggota. Aplikasi berjalan offline-first dengan IndexedDB, lalu dapat sinkron antar device lewat Supabase Auth, Database, dan Realtime.

## Tech Stack

- React 18 + Vite
- TailwindCSS
- Vite PWA Plugin
- Dexie / IndexedDB
- Supabase Auth, Database, dan Realtime
- Recharts
- XLSX import/export
- html2canvas export PNG

## Fitur Utama

- Multi-grup dengan tema aksen per grup
- Quick attendance mode dengan default Hadir
- Anti-duplikat absensi lewat ID deterministik per sesi dan anggota
- Penilaian skill anggota dengan radar chart dan ranking
- Statistik absensi, tren kehadiran, dan export PNG
- Offline-first: data tersimpan lokal di IndexedDB
- Sync queue otomatis saat offline lalu flush saat online
- Supabase Realtime untuk update lintas device
- Import anggota dari Excel, export Excel, backup/restore JSON
- PWA installable dengan service worker dan notifikasi update

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Environment

Salin `.env.example` menjadi `.env`, lalu isi:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Aplikasi tetap bisa boot tanpa env untuk mode offline lokal. Fitur login, pull, push, dan realtime cloud aktif setelah Supabase dikonfigurasi.

## Build Produksi

```bash
npm run build
npm run preview
```

Output produksi ada di `dist/` dan siap dipublish ke Netlify sesuai `netlify.toml`.

## Struktur Project

```text
src/
  components/
    charts/       Chart Recharts
    layout/       Navbar dan BottomNav
    ui/           Komponen UI reusable
  context/        Auth, group, dan sync provider
  hooks/          Hook data members, sessions, attendance, stats
  pages/          Route utama aplikasi
  services/       IndexedDB, Supabase sync, import/export, auth
  utils/          Constants dan helper
supabase/
  schema.sql      Schema database Supabase
```

## Import Template Excel

Kolom yang didukung:

| name | instrument | jabatan | angkatan | status | notes |
| --- | --- | --- | --- | --- | --- |
| Andi Pratama | Guitarist | Anggota | 2023 | active |  |

Alias bahasa Indonesia seperti `nama`, `instrumen`, `posisi`, `tahun`, `catatan`, dan status `aktif/nonaktif/cuti/alumni` juga didukung.
