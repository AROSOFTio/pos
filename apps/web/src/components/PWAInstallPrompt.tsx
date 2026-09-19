import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

type DeferredPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}

export default function PWAInstallPrompt(){
 const [prompt,setPrompt]=useState<DeferredPrompt|null>(null),[show,setShow]=useState(false),[ios,setIos]=useState(false)

 useEffect(()=>{
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true
  if(standalone)return
  const dismissed=Number(localStorage.getItem('mauzopos_install_dismissed')||0)
  const recent=Date.now()-dismissed<7*24*60*60*1000
  const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent)
  setIos(isIos)
  const handler=(e:Event)=>{e.preventDefault();setPrompt(e as DeferredPrompt);if(!recent)window.setTimeout(()=>setShow(true),1800)}
  window.addEventListener('beforeinstallprompt',handler)
  if(isIos&&!recent)window.setTimeout(()=>setShow(true),2200)
  const installed=()=>{setShow(false);setPrompt(null);localStorage.removeItem('mauzopos_install_dismissed')}
  window.addEventListener('appinstalled',installed)
  return()=>{window.removeEventListener('beforeinstallprompt',handler);window.removeEventListener('appinstalled',installed)}
 },[])

 if(!show)return null
 async function install(){
  if(prompt){await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted'){setShow(false);setPrompt(null)}}
 }
 function dismiss(){localStorage.setItem('mauzopos_install_dismissed',String(Date.now()));setShow(false)}
 return <div className="fixed bottom-20 right-3 z-[120] w-[min(330px,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-[0_18px_55px_rgba(15,23,42,.18)] backdrop-blur lg:bottom-5 lg:right-5">
   <button onClick={dismiss} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14}/></button>
   <div className="flex items-start gap-3 pr-7">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft,#ECF8EF)] text-[var(--brand-primary,#22A53A)]"><Download size={17}/></div>
    <div className="min-w-0"><div className="text-[12px] font-semibold text-slate-900">Install MauzoPOS</div><div className="mt-0.5 text-[10px] leading-4 text-slate-500">{ios?'On iPhone/iPad: Share → Add to Home Screen.':'Open faster like a normal app on this device.'}</div></div>
   </div>
   {!ios&&prompt&&<button onClick={install} className="mt-3 w-full rounded-lg bg-[var(--brand-primary,#22A53A)] py-2.5 text-[11px] font-semibold text-white">Install App</button>}
   {ios&&<button onClick={dismiss} className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-[11px] font-medium text-slate-600">Got it</button>}
 </div>
}
