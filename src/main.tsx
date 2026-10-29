import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createIndexedDbRepository } from './infrastructure/indexeddb-repository'
import { registerServiceWorker } from './infrastructure/service-worker'
import './ui/styles.css'

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repository={createIndexedDbRepository()} />
  </StrictMode>,
)
