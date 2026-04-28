import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar, BottomNav } from './components/layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PWAUpdateToast } from './components/PWAUpdateToast'
import { Spinner } from './components/ui'

const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Sessions = lazy(() => import('./pages/Sessions'))
const AttendancePage = lazy(() =>
  import('./pages/Sessions').then(module => ({ default: module.AttendancePage }))
)
const Members = lazy(() => import('./pages/Members'))
const Stats = lazy(() => import('./pages/Stats'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-m-bg">
        <Navbar/>
        <main>
          <Suspense fallback={<Spinner/>}>
            <Routes>
              <Route path="/"                       element={<Home/>}/>
              <Route path="/dashboard"              element={<Dashboard/>}/>
              <Route path="/sessions"               element={<Sessions/>}/>
              <Route path="/sessions/:session_id"   element={<AttendancePage/>}/>
              <Route path="/members"                element={<Members/>}/>
              <Route path="/stats"                  element={<Stats/>}/>
              <Route path="/settings"               element={<Settings/>}/>
            </Routes>
          </Suspense>
        </main>
        <BottomNav/>
        <PWAUpdateToast/>
      </div>
    </ErrorBoundary>
  )
}
