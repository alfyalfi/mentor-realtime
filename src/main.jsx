import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SyncProvider, GroupProvider } from './context/AppContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SyncProvider>
        <GroupProvider>
          <App/>
        </GroupProvider>
      </SyncProvider>
    </BrowserRouter>
  </React.StrictMode>
)
