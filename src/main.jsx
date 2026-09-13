import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

import { purgeLegacyStorage, unregisterServiceWorkersAndCaches } from './utils/appUpdater'

// 1. Instantly purge any legacy offline localStorage data from older versions
purgeLegacyStorage();

// 2. Unregister any legacy Service Worker & clear old CacheStorage
unregisterServiceWorkersAndCaches();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
