import { useRegisterSW } from 'virtual:pwa-register/react'
import { CheckCircle, RefreshCw, X } from 'lucide-react'

export function PWAUpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return
      setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })

  if (!offlineReady && !needRefresh) return null

  function close() {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className="fixed left-4 right-4 bottom-20 z-50 max-w-md mx-auto animate-slide-up">
      <div className="card-glass rounded-2xl border border-[var(--accent-glow)] p-4 shadow-card-lift">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-[var(--accent)]">
            {needRefresh ? <RefreshCw size={18}/> : <CheckCircle size={18}/>}
          </div>
          <div className="flex-1">
            <p className="text-sm font-body font-semibold text-m-text">
              {needRefresh ? 'Update aplikasi tersedia' : 'Aplikasi siap offline'}
            </p>
            <p className="mt-0.5 text-xs font-body text-m-muted leading-relaxed">
              {needRefresh
                ? 'Muat ulang untuk memakai versi terbaru Mentor.'
                : 'Mentor sudah tersimpan dan bisa dibuka kembali saat koneksi buruk.'}
            </p>
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-body font-semibold hover:opacity-90 active:scale-95 transition-all">
                <RefreshCw size={12}/>Muat update
              </button>
            )}
          </div>
          <button onClick={close} className="p-1 text-m-muted hover:text-m-text transition-colors">
            <X size={15}/>
          </button>
        </div>
      </div>
    </div>
  )
}
