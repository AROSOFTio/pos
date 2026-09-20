import { useState } from 'react'
import { Clock3, KeyRound, UserRound, X } from 'lucide-react'
import { api, nice, type User } from '../api'

export default function StaffQuickMenu({user,roles}:{user:User;roles:string[]}){
 const [open,setOpen]=useState(false),[pinOpen,setPinOpen]=useState(false),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function clock(){
  setBusy(true);setMessage('')
  try{const x=await api('/staff/timeclock/toggle',{method:'POST',body:'{}'});setMessage(x.action==='clock_in'?'Clocked in':'Clocked out')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 async function switchUser(){
  if(!/^\d{4,8}$/.test(pin))return
  setBusy(true);setMessage('')
  try{const x=await api('/auth/pin-switch',{method:'POST',body:JSON.stringify({pin})});localStorage.setItem('pos_token',x.token);window.location.reload()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 return <div className="relative">
  <button onClick={()=>setOpen(v=>!v)} className="hidden items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50 sm:flex"><div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500"><UserRound size={14}/></div><div className="leading-tight text-left"><div className="max-w-32 truncate text-[11px] font-medium">{user.name}</div><div className="max-w-44 truncate text-[9px] text-slate-400">{roles.map(nice).join(' · ')}</div></div></button>
  {open&&<div className="absolute right-0 top-11 z-[110] w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><button onClick={clock} disabled={busy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50"><Clock3 size={14}/>Clock In / Out</button><button onClick={()=>{setOpen(false);setPinOpen(true);setPin('');setMessage('')}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50"><KeyRound size={14}/>Switch Staff by PIN</button>{message&&<div className="px-3 py-2 text-[9.5px] text-[var(--brand-primary)]">{message}</div>}</div>}
  {pinOpen&&<div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/35 p-4"><div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><div className="text-[13px] font-semibold text-slate-900">Switch Staff</div><div className="mt-0.5 text-[9.5px] text-slate-400">Enter the next staff member's quick PIN.</div></div><button onClick={()=>setPinOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><X size={15}/></button></div><input autoFocus inputMode="numeric" maxLength={8} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,8))} onKeyDown={e=>{if(e.key==='Enter')switchUser()}} className="control mt-4 text-center text-xl tracking-[.4em]" placeholder="••••"/>{message&&<div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{message}</div>}<button onClick={switchUser} disabled={busy||!/^\d{4,8}$/.test(pin)} className="mt-3 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Checking…':'Switch User'}</button></div></div>}
 </div>
}
