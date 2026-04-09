import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- ESTA LÍNEA ES LA MAGIA

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)