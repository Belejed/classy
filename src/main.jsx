import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

import { purgeLegacyStorage, unregisterServiceWorkersAndCaches } from './utils/appUpdater'

// 1. Instantly purge any legacy offline localStorage data from older versions
try {
  purgeLegacyStorage();
} catch {}

// 2. Unregister any legacy Service Worker & clear old CacheStorage
try {
  unregisterServiceWorkersAndCaches();
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
