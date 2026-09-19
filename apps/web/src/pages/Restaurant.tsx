import { useEffect, useMemo, useState } from 'react'
import { CircleCheckBig, CircleDot, Clock3, Sparkles, Table2, UtensilsCrossed } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Stat, Panel, Badge, Loading } from '../components'

type TableFilter='all'|'vacant'|'reserved'|'occupied'|'dirty'|'clean'

export default function Restaurant({currency}:{currency:string}){
 const [overview,setOverview]=useState<any>(null),[tables,setTables]=useState<any[]>([]),[menu,setMenu]=useState<any[]>([]),[categories,setCategories]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([])
 const [categoryId,setCategoryId]=useState<number>(0),[tableFilter,setTableFilter]=useState<TableFilter>('all'),[busyTable,setBusyTable]=useState<number|null>(null)
 const load=()=>Promise.all([
   api('/restaurant/overview'),
   api('/restaurant/tables'),
   api('/menu/available?orderType=dine_in'),
   api('/menu/categories'),
   api('/restaurant/orders?status=active').catch(()=>[])
 ]).then(([o,t,m,c,r])=>{setOverview(o);setTables(t);setMenu(m);setCategories(c);setOrders(r)})
 useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
 const orderByTable=useMemo(()=>new Map(orders.filter(x=>x.table_id).map(x=>[Number(x.table_id),x])),[orders])
 const visibleMenu=useMemo(()=>categoryId?menu.filter(x=>Number(x.category_id)===categoryId):menu,[menu,categoryId])
 const visibleTables=useMemo(()=>tables.filter(t=>{
   if(tableFilter==='all')return true
   if(tableFilter==='vacant')return t.status==='available'
   if(tableFilter==='dirty'||tableFilter==='clean')return (t.cleanliness_status||'clean')===tableFilter
   return t.status===tableFilter
 }),[tables,tableFilter])

 async function setCleanliness(t:any,value:'clean'|'dirty'){
   setBusyTable(Number(t.id))
   try{await api('/restaurant/tables/'+t.id+'/state',{method:'PUT',body:JSON.stringify({cleanlinessStatus:value})});await load()}finally{setBusyTable(null)}
 }

 if(!overview)return <Loading/>
 return <div>
  <PageHeading eyebrow="Restaurant service" title="Restaurant Dashboard" sub="Live menu and floor view for the active shift. Restaurant setup and pricing are managed under Settings."/>

  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
   <button onClick={()=>setTableFilter('vacant')} className="text-left"><Stat label="Vacant" value={overview.vacant||0} sub="Ready for guests" icon={Table2}/></button>
   <button onClick={()=>setTableFilter('reserved')} className="text-left"><Stat label="Reserved" value={overview.reserved||0} sub="Upcoming guests" icon={Clock3} tone="amber"/></button>
   <button onClick={()=>setTableFilter('occupied')} className="text-left"><Stat label="Occupied" value={overview.occupied||0} sub="Currently serving" icon={UtensilsCrossed} tone="blue"/></button>
   <button onClick={()=>setTableFilter('dirty')} className="text-left"><Stat label="Dirty" value={overview.dirty||0} sub="Needs cleaning" icon={Sparkles} tone="rose"/></button>
   <button onClick={()=>setTableFilter('clean')} className="text-left"><Stat label="Clean" value={overview.clean||0} sub="Clean tables" icon={CircleCheckBig} tone="emerald"/></button>
   <div><Stat label="Menu Items" value={overview.availableMenu||0} sub={(overview.categories||0)+' categories'} icon={CircleDot} tone="violet"/></div>
  </div>

  <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_.95fr]">
   <Panel title="Live floor" sub={visibleTables.length+' shown · '+tables.length+' total'} action={<button onClick={()=>setTableFilter('all')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-medium text-slate-500">Show all</button>}>
    <div className="mb-3 flex flex-wrap gap-1.5">
      {(['all','vacant','reserved','occupied','dirty','clean'] as TableFilter[]).map(f=><button key={f} onClick={()=>setTableFilter(f)} className={'rounded-full px-3 py-1.5 text-[10px] font-medium capitalize '+(tableFilter===f?'bg-slate-950 text-white':'bg-slate-100 text-slate-600')}>{f}</button>)}
    </div>
    {visibleTables.length?<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{visibleTables.map(t=>{
      const order=orderByTable.get(Number(t.id)),clean=(t.cleanliness_status||'clean')==='clean'
      const occupancy=t.status==='available'?'Vacant':t.status==='reserved'?'Reserved':'Occupied'
      return <div key={t.id} className={'rounded-xl border p-3 '+(t.status==='occupied'?'border-blue-200 bg-blue-50/60':t.status==='reserved'?'border-amber-200 bg-amber-50/60':clean?'border-emerald-200 bg-emerald-50/50':'border-red-200 bg-red-50/60')}>
       <div className="flex items-start justify-between gap-2"><div><div className="text-[13px] font-semibold text-slate-800">{t.name}</div><div className="mt-0.5 text-[9.5px] text-slate-400">{t.area_name||'Main Floor'} · {t.capacity} seats</div></div><Badge tone={t.status==='occupied'?'blue':t.status==='reserved'?'amber':'green'}>{occupancy}</Badge></div>
       <div className="mt-2 flex items-center justify-between gap-2"><Badge tone={clean?'green':'red'}>{clean?'Clean':'Dirty'}</Badge>{order&&<span className="truncate text-[9px] font-medium text-slate-500">{order.order_no}</span>}</div>
       {t.status==='available'&&<button disabled={busyTable===Number(t.id)} onClick={()=>setCleanliness(t,clean?'dirty':'clean')} className={'mt-2 w-full rounded-lg border px-2 py-1.5 text-[9.5px] font-medium '+(clean?'border-slate-200 bg-white text-slate-500':'border-emerald-200 bg-white text-emerald-700')}>{busyTable===Number(t.id)?'Updating…':clean?'Mark Dirty':'Mark Clean'}</button>}
      </div>
    })}</div>:<div className="rounded-xl border border-dashed border-slate-200 p-7 text-center text-[12px] text-slate-400">No tables match this status.</div>}
   </Panel>

   <Panel title="Menu" sub={visibleMenu.length+' available items'}>
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
      <button onClick={()=>setCategoryId(0)} className={'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium '+(!categoryId?'bg-[#22A53A] text-white':'bg-slate-100 text-slate-600')}>All</button>
      {categories.map(c=><button key={c.id} onClick={()=>setCategoryId(Number(c.id))} className={'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium '+(categoryId===Number(c.id)?'bg-[#22A53A] text-white':'bg-slate-100 text-slate-600')}>{c.name}</button>)}
    </div>
    {visibleMenu.length?<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">{visibleMenu.map(item=><div key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="h-20 bg-slate-50">{item.image_url?<img src={item.image_url} alt="" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center"><UtensilsCrossed size={20} className="text-slate-300"/></div>}</div>
      <div className="p-2.5"><div className="truncate text-[11.5px] font-semibold text-slate-800">{item.name}</div><div className="mt-0.5 truncate text-[9px] text-slate-400">{item.category_name||'Other'}</div><div className="mt-1.5 text-[11px] font-semibold text-[#169B36]">{money(item.resolved_price,currency)}</div></div>
    </div>)}</div>:<div className="rounded-xl bg-slate-50 p-6 text-center text-[11px] text-slate-400">No available menu items in this category.</div>}
   </Panel>
  </div>
 </div>
}
