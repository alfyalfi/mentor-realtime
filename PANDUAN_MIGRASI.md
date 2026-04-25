# Panduan Migrasi: Google Sheets → Supabase Realtime + Netlify

## Gambaran Besar

| | Sebelum | Sesudah |
|---|---|---|
| **Backend** | Google Sheets REST | Supabase (Postgres) |
| **Realtime** | ❌ Poll setiap 15 detik | ✅ WebSocket (instant) |
| **Auth** | Google Identity Services | Supabase Auth + Google OAuth |
| **Deploy** | GitHub Pages | Netlify |
| **Offline** | ✅ IndexedDB + Queue | ✅ Tetap sama |
| **Env vars** | Di-hardcode via build | Netlify Dashboard (aman) |

Arsitektur yang baru:

```
[Device A input] → IndexedDB (lokal) → Supabase Postgres
                                              ↓ Realtime WebSocket
                              [Device B, C, ...] → IndexedDB lokal mereka
```

---

## Langkah 1 — Buat Akun & Project Supabase

1. Buka https://supabase.com → **Start your project**
2. Sign in dengan GitHub
3. Klik **New Project**
   - Organization: pilih yang ada
   - Name: `mentor-app`
   - Database Password: buat yang kuat, **simpan baik-baik**
   - Region: pilih `Southeast Asia (Singapore)` ← paling dekat dari Indonesia
4. Tunggu ±2 menit sampai project siap

### Ambil Credentials

Di dashboard Supabase → **Settings** → **API**:

- **Project URL** → ini adalah `VITE_SUPABASE_URL`  
  Contoh: `https://abcdefghijkl.supabase.co`

- **anon (public) key** → ini adalah `VITE_SUPABASE_ANON_KEY`  
  Contoh: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

> **Catatan:** `anon key` aman di-expose ke frontend karena dilindungi Row Level Security (RLS).

---

## Langkah 2 — Buat Tabel di Supabase

1. Di dashboard Supabase → **SQL Editor** → **New query**
2. Copy seluruh isi file `supabase/schema.sql` yang sudah disiapkan
3. Klik **Run** (atau tekan `Ctrl+Enter`)

Ini akan membuat 5 tabel, index, RLS policy, dan mengaktifkan Realtime sekaligus.

---

## Langkah 3 — Setup Google OAuth di Supabase

1. Di Supabase → **Authentication** → **Providers** → **Google**
2. Toggle **Enable** → aktifkan
3. Kamu perlu Client ID & Client Secret dari Google Cloud Console:

### Cara dapat Client ID Google

1. Buka https://console.cloud.google.com
2. Buat project baru atau pakai yang lama
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Authorized redirect URIs — tambahkan:
   ```
   https://[PROJECT_REF].supabase.co/auth/v1/callback
   ```
   Ganti `[PROJECT_REF]` dengan ID project Supabase kamu (terlihat di URL dashboard).
6. Klik **Create** → copy Client ID dan Client Secret
7. Masukkan ke Supabase → Authentication → Google → simpan

---

## Langkah 4 — Perbarui File Project

Salin file-file berikut dari folder yang sudah disiapkan ke project kamu:

```
src/services/supabase.js     ← BARU (client Supabase)
src/services/auth.js         ← GANTI (pakai Supabase Auth)
src/services/sync.js         ← GANTI (Realtime + offline queue)
src/context/AuthContext.jsx  ← GANTI (Supabase session)
src/context/AppContext.jsx   ← GANTI (subscribe Realtime)
vite.config.js               ← GANTI (base path '/', cache rules)
netlify.toml                 ← BARU (config Netlify)
.env.example                 ← GANTI (vars baru)
.github/workflows/deploy.yml ← GANTI (deploy ke Netlify)
```

### Install package Supabase

```bash
npm install @supabase/supabase-js
```

### Hapus yang tidak perlu lagi

```bash
# File lama yang sudah tidak dipakai
# (opsional, bisa dibiarkan, tapi lebih bersih jika dihapus)
# src/services/sheets.js  → sudah digantikan supabase.js
```

### Buat file `.env` lokal

```bash
cp .env.example .env
```

Isi dengan nilai dari Supabase dashboard:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Langkah 5 — Sesuaikan Halaman yang Perlu Auto-Refresh

Dengan Realtime, perubahan dari device lain perlu me-refresh UI secara otomatis.
Caranya: gunakan `lastUpdate` dari `useSync()`.

### Contoh di `Sessions.jsx` (dan semua halaman data)

```jsx
import { useSync } from '../context/AppContext'

export default function Sessions() {
  const { activeGroup } = useGroup()
  const { lastUpdate }  = useSync()   // ← tambahkan ini
  const [sessions, setSessions] = useState([])

  // Tambahkan lastUpdate ke dependency array
  useEffect(() => {
    if (!activeGroup) return
    sessionsDB.getByGroup(activeGroup.group_id).then(setSessions)
  }, [activeGroup, lastUpdate])   // ← lastUpdate memicu re-fetch

  // ... sisa kode tetap sama
}
```

Lakukan hal yang sama di `Members.jsx`, `Dashboard.jsx`, `Stats.jsx`, dan `AttendancePage`.

Atau bisa juga listen event langsung:

```jsx
useEffect(() => {
  const handler = (e) => {
    if (e.detail?.table === 'sessions') loadSessions()
  }
  window.addEventListener('mentordb:updated', handler)
  return () => window.removeEventListener('mentordb:updated', handler)
}, [])
```

---

## Langkah 6 — Deploy ke Netlify

### Cara A: Via Git (Direkomendasikan)

1. Pastikan kode terbaru sudah di-push ke GitHub
2. Buka https://app.netlify.com → **Add new site** → **Import an existing project**
3. Hubungkan GitHub → pilih repo `mentor` kamu
4. Build settings akan otomatis terbaca dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Klik **Deploy site**

### Tambahkan Environment Variables di Netlify

Di Netlify → **Site settings** → **Environment variables** → **Add variable**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

Setelah menambahkan env vars → **Trigger deploy** → **Deploy site**.

### Cara B: Via GitHub Actions (Sudah disiapkan)

Tambahkan secrets ke GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Nilai |
|--------|-------|
| `VITE_SUPABASE_URL` | URL Supabase kamu |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| `NETLIFY_AUTH_TOKEN` | Dari Netlify → User settings → Personal access tokens |
| `NETLIFY_SITE_ID` | Dari Netlify → Site settings → Site ID |

Push ke `main` → otomatis deploy.

---

## Langkah 7 — Konfigurasi OAuth Redirect URL

Setelah Netlify memberi domain (misal `mentor-app.netlify.app`), perbarui:

### Di Supabase
**Authentication** → **URL Configuration**:
- Site URL: `https://mentor-app.netlify.app`
- Redirect URLs — tambahkan: `https://mentor-app.netlify.app/**`

### Di Google Cloud Console
**Credentials** → OAuth client ID kamu → **Authorized redirect URIs**:
```
https://[PROJECT_REF].supabase.co/auth/v1/callback
```
(sudah diisi di Langkah 3 — tidak perlu diubah)

---

## Langkah 8 — Migrasi Data Lama (Opsional)

Jika ada data di Google Sheets yang ingin dipindahkan:

1. Buka app → Settings
2. Login dengan akun Google (satu kali terakhir dengan sistem lama)
3. Jalankan "Export JSON" atau gunakan fitur export yang ada
4. Masuk ke app baru → Settings → Import JSON

Atau, jika data ada di IndexedDB browser:

1. Login ke app baru di browser yang sama
2. Panggil fungsi `pushAllToSupabase()` dari Settings:

```jsx
// Di Settings.jsx — tambahkan tombol ini
import { pushAllToSupabase } from '../services/sync'

<button onClick={async () => {
  await pushAllToSupabase(({ table, done, total }) => {
    console.log(`Migrasi ${table}: ${done}/${total}`)
  })
  alert('Migrasi selesai!')
}}>
  Push Data ke Supabase
</button>
```

---

## Cara Kerja Realtime (Teknis)

```
User A (HP) → input data
     ↓
IndexedDB lokal (instant, offline-ready)
     ↓ (jika online)
supabase.from('sessions').upsert(data)
     ↓
Supabase Postgres menyimpan
     ↓ Broadcast via WebSocket
User B (Laptop) menerima postgres_changes event
     ↓
handleRemoteChange() → IndexedDB.put(newRecord)
     ↓
window.dispatchEvent('mentordb:updated')
     ↓
useEffect([lastUpdate]) refetch → UI terupdate
```

**Saat offline (User A tidak ada internet):**
```
Input data → IndexedDB + sync_queue
(UI tetap berjalan normal)
     ↓ (saat online kembali)
window.addEventListener('online') → runSync()
     ↓
Flush queue → Supabase → Broadcast ke device lain
```

---

## Troubleshooting

### Login tidak redirect balik ke app
- Cek Supabase → Authentication → URL Configuration → Site URL sudah diisi URL Netlify
- Cek Redirect URLs sudah ada `https://domain.netlify.app/**`

### Realtime tidak berjalan
- Buka Supabase → Database → Replication → pastikan semua tabel tercentang di `supabase_realtime`
- Cek di browser console ada log: `[realtime] ✅ Terhubung ke Supabase Realtime`

### Data tidak muncul setelah login
- Cek RLS policy sudah benar di Supabase → Authentication → Policies
- Coba jalankan query di SQL Editor: `select * from groups;` — jika error RLS, berarti policy perlu diperbaiki

### Error "Supabase belum dikonfigurasi"
- Pastikan `.env` sudah diisi dan server dev di-restart (`npm run dev`)
- Untuk Netlify: pastikan env vars sudah ditambahkan dan site sudah di-redeploy

---

## Checklist Migrasi

- [ ] Buat project Supabase
- [ ] Jalankan `schema.sql` di SQL Editor
- [ ] Setup Google OAuth di Supabase + Google Cloud Console
- [ ] `npm install @supabase/supabase-js`
- [ ] Salin semua file baru ke project
- [ ] Isi `.env` lokal
- [ ] Test login di `localhost` (`npm run dev`)
- [ ] Tambahkan `lastUpdate` ke halaman-halaman data
- [ ] Deploy ke Netlify
- [ ] Set env vars di Netlify dashboard
- [ ] Update redirect URL di Supabase + Google
- [ ] Test di dua device sekaligus — perubahan di satu device langsung muncul di lain
