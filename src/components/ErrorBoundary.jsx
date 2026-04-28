import { Component } from 'react'
import { RefreshCw } from 'lucide-react'
import { Btn } from './ui'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[app] runtime error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen px-4 py-10 flex items-center justify-center bg-m-bg">
        <div className="card-glass rounded-2xl p-6 max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-m-coral font-display font-bold">
            !
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-m-text">Aplikasi perlu dimuat ulang</h1>
            <p className="mt-1 text-sm text-m-muted font-body leading-relaxed">
              Ada error runtime yang berhasil ditangkap, jadi layar tidak dibiarkan blank.
            </p>
          </div>
          <Btn className="mx-auto" onClick={this.handleReload}>
            <RefreshCw size={14}/>Muat ulang
          </Btn>
        </div>
      </div>
    )
  }
}
