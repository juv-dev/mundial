import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { LocaleProvider } from './i18n/locale.tsx'
import { ParticipantProvider } from './hooks/useParticipant'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocaleProvider>
      <ParticipantProvider>
        <App />
      </ParticipantProvider>
    </LocaleProvider>
  </React.StrictMode>,
)
