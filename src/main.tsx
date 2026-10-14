import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

async function enableMocking() {
  const globalMocks = import.meta.env.VITE_ENABLE_MOCKS === 'true'
  const moduleMocks = [
    'VITE_MOCK_AUTH',
    'VITE_MOCK_USERS',
    'VITE_MOCK_DASHBOARD',
    'VITE_MOCK_GROUPS',
    'VITE_MOCK_PROBLEMS',
    'VITE_MOCK_SUBMISSIONS',
    'VITE_MOCK_CONTESTS',
    'VITE_MOCK_MATERIALS',
    'VITE_MOCK_TEAMS',
  ].some((key) => import.meta.env[key] === 'true')

  if (!globalMocks && !moduleMocks) return

  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
