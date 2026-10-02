import { useEffect, useState } from 'react'
import { Flame, Printer } from 'lucide-react'
import { api, nice, openPdf } from '../api'
import { PageHeading, Badge, Loading } from '../components'
export default function Kitchen(){
 const [rows,setRows]=useState<any[]|null>(null)
 const load=()=>api('/kitchen/tickets?status=active').then(setRows)
 useEffect(()=>{load();const t=setInterval(load,12000);return()=>clearInterval(t)},[])
 async function move(id:number,status:string){await api('/kitchen/tickets/'+id+'/status',{method:'PUT',body:JSON.stringify({status})});load()}
 async function rush(id:number,p:string){await api('/kitchen/tickets/'+id+'/priority',{method:'PUT',body:JSON.stringify({priority:p})});load()}
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Kitchen" title="Live Tickets" sub="Start, prepare and serve orders without leaving this screen."/>
  {rows.length===0?<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm"><div className="text-[15px] font-bold text-slate-800">No active kitchen tickets</div><div className="mt-1 text-[11px] text-slate-500">New orders will appear here automatically.</div></div>:
  <div className="kds-board grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{rows.map(t=>{const mins=Math.floor(Number(t.elapsed_minutes||0));const next=t.status==='new'?'preparing':t.status==='preparing'?'ready':t.status==='ready'?'served':null;return <div key={t.id} className={'kds-card '+(t.priority==='rush'?'!border-l-4 !border-l-red-500':mins>=20?'!border-l-4 !border-l-amber-500':'!border-l-4 !border-l-[var(--brand-primary)]')}><div className="flex justify-between"><div><b>{t.ticket_no}</b><div className="mt-1 text-xs text-slate-400">{t.station_name} · {t.order_no}</div></div><div className={'text-[24px] font-extrabold tabular-nums '+(mins>=20?'text-amber-600':'text-slate-900')}>{mins}m</div></div><div className="mt-3 flex gap-2"><Badge>{t.table_name||nice(t.order_type)}</Badge>{t.priority==='rush'&&<Badge tone="red">RUSH</Badge>}</div><div className="mt-4 space-y-2">{(t.items||[]).map((i:any)=><div key={i.id} className="kds-item flex justify-between gap-3 rounded-xl p-3"><div><b className="text-sm">{Number(i.qty)} × {i.name}</b>{i.notes&&<div className="text-xs text-amber-700 mt-1">{i.notes}</div>}</div><Badge tone={i.status==='ready'?'green':'slate'}>{nice(i.status)}</Badge></div>)}</div><div className="mt-4 flex gap-2">{next&&<button onClick={()=>move(t.id,next)} className="flex-1 rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-bold text-white">{next==='preparing'?'Start':next==='ready'?'Ready':'Served'}</button>}<button onClick={()=>openPdf('/documents/kitchen-ticket/'+t.id+'/pdf')} className="rounded-xl border border-slate-200 px-3" title="Print KOT"><Printer size={16} className="text-slate-500"/></button><button onClick={()=>rush(t.id,t.priority==='rush'?'normal':'rush')} className="rounded-xl border border-slate-200 px-3"><Flame size={16} className={t.priority==='rush'?'text-red-500':'text-slate-400'}/></button></div></div>})}</div>}
 </div>
}
