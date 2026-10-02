import { useState } from 'react'
import { api } from '../api'
import { MauzoMark } from '../Brand'

export default function StaffCodeGate({business,logo}:{business:string;logo:string}){
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function enter(){
  if(code.length<4)return
  setBusy(true);setError('')
  try{
   const x=await api('/auth/pin-switch',{method:'POST',body:JSON.stringify({pin:code})})
   localStorage.setItem('pos_token',x.token)
   localStorage.removeItem('mauzo_terminal_locked')
   sessionStorage.setItem('mauzo_staff_session','1')
   window.location.reload()
  }catch(e:any){setError(e.message||'Code not recognised.')}finally{setBusy(false)}
 }
 return <div className="fixed inset-0 z-[300] grid place-items-center bg-[#EEF2F5] p-4">
  <div className="w-full max-w-[390px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
   <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-slate-50 p-1">{logo?<img src={logo} className="max-h-full max-w-full object-contain"/>:<MauzoMark className="h-9 w-9"/>}</div>
    <div><div className="text-[15px] font-semibold text-slate-900">{business}</div><div className="text-[10px] text-slate-400">Staff terminal · MauzoPOS</div></div>
   </div>
   <div className="mt-5 text-center"><div className="text-[20px] font-semibold text-slate-950">Enter Staff Code</div><p className="mt-1 text-[11px] leading-5 text-slate-500">Enter your private code to identify yourself and open your permitted workspace.</p></div>
   <input autoFocus inputMode="numeric" maxLength={8} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,8))} onKeyDown={e=>{if(e.key==='Enter')enter()}} className="control mt-5 text-center text-2xl tracking-[.45em]" placeholder="••••"/>
   {error&&<div className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-center text-[11px] font-medium text-red-700">{error}</div>}
   <button onClick={enter} disabled={busy||code.length<4} className="mt-4 h-11 w-full rounded-xl bg-[var(--brand-primary)] text-[13px] font-semibold text-white disabled:opacity-40">{busy?'Checking…':'Continue'}</button>
   <div className="mt-3 text-center text-[9.5px] text-slate-400">Orders and activity are recorded under the staff member identified by this code.</div>
  </div>
 </div>
}
