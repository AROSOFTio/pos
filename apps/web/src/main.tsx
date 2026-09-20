import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import PWAInstallPrompt from './components/PWAInstallPrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode><><App /><PWAInstallPrompt /></></StrictMode>,
)


if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'})
      await registration.update()
    }catch{}
  })
}
