import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { api } from '../api'

export default function NotificationBell(){
 const [rows,setRows]=useState<any[]>([]),[open,setOpen]=useState(false),[busy,setBusy]=useState(false)
 const ref=useRef<HTMLDivElement|null>(null)
 async function load(refresh=false){
  setBusy(true)
  try{if(refresh)await api('/notifications/refresh',{method:'POST',body:'{}'}).catch(()=>null);const r=await api('/notifications').catch(()=>[]);setRows(Array.isArray(r)?r:[])}finally{setBusy(false)}
 }
 useEffect(()=>{load(true);const t=setInterval(()=>load(false),60000);const click=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',click);return()=>{clearInterval(t);document.removeEventListener('mousedown',click)}},[])
 const unread=rows.filter(x=>!x.read_at).length
 async function mark(x:any){if(!x.read_at){await api('/notifications/'+x.id+'/read',{method:'PUT',body:'{}'});setRows(v=>v.map(r=>r.id===x.id?{...r,read_at:new Date().toISOString()}:r))}}
 return <div ref={ref} className="relative">
   <button onClick={()=>{setOpen(v=>!v);if(!open)load(false)}} className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
    <Bell size={16}/>{unread>0&&<span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[8px] font-bold leading-4 text-white">{Math.min(unread,99)}</span>}
   </button>
   {open&&<div className="absolute right-0 top-11 z-[100] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,.16)]">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><div className="text-[12px] font-semibold text-slate-900">Notifications</div><div className="text-[9px] text-slate-400">{unread} unread</div></div><button onClick={()=>load(true)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50">{busy?<span className="text-[9px]">…</span>:<RefreshCw size={13}/>}</button></div>
    <div className="max-h-[420px] overflow-y-auto">{rows.length?rows.slice(0,30).map(x=><button key={x.id} onClick={()=>mark(x)} className={'block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 '+(!x.read_at?'bg-[var(--brand-soft)]/40':'')}>
      <div className="flex items-start gap-2"><div className={'mt-1 h-2 w-2 shrink-0 rounded-full '+(x.severity==='warning'?'bg-amber-500':x.severity==='critical'?'bg-red-500':'bg-[var(--brand-primary)]')}/><div className="min-w-0"><div className="text-[11px] font-semibold text-slate-700">{x.title}</div>{x.message&&<div className="mt-0.5 text-[9.5px] leading-4 text-slate-500">{x.message}</div>}<div className="mt-1 text-[8.5px] text-slate-300">{new Date(x.created_at).toLocaleString()}</div></div></div>
    </button>):<div className="px-4 py-10 text-center text-[10.5px] text-slate-400"><CheckCheck size={18} className="mx-auto mb-2"/>Nothing needs attention.</div>}</div>
   </div>}
 </div>
}
