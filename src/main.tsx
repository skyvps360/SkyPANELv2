import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const env = import.meta.env as Record<string, string | undefined>
const companyName = env.VITE_COMPANY_NAME || env['COMPANY-NAME'] || 'SkyVPS360'
document.title = `${companyName} | Cloud`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
