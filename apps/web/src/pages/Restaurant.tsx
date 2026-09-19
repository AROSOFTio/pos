import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, ClipboardList, ReceiptText, ChefHat, BarChart3, Settings as SettingsIcon, UsersRound, Table2 } from 'lucide-react'
import { api, money } from '../api'
import { Badge, Loading } from '../components'
import type { ViewKey } from '../App'

type TableFilter='all'|'vacant'|'reserved'|'occupied'|'dirty'|'clean'

export default function Restaurant({currency,go}:{currency:string;go:(v:ViewKey)=>void}){
 const [overview,setOverview]=useState<any>(null),[tables,setTables]=useState<any[]>([]),[menu,setMenu]=useState<any[]>([]),[categories,setCategories]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([])
 const [categoryId,setCategoryId]=useState<number>(0),[tableFilter,setTableFilter]=useState<TableFilter>('all'),[query,setQuery]=useState('')
 const load=()=>Promise.all([
   api('/restaurant/overview'),
   api('/restaurant/tables').catch(()=>[]),
   api('/menu/available?orderType=dine_in').catch(()=>[]),
   api('/menu/categories').catch(()=>[]),
   api('/restaurant/orders?status=active').catch(()=>[])
 ]).then(([o,t,m,c,r])=>{setOverview(o||{});setTables(Array.isArray(t)?t:[]);setMenu(Array.isArray(m)?m:[]);setCategories(Array.isArray(c)?c:[]);setOrders(Array.isArray(r)?r:[])})
 useEffect(()=>{load();const id=setInterval(load,15000);return()=>clearInterval(id)},[])
 const orderByTable=useMemo(()=>new Map(orders.filter(x=>x.table_id).map(x=>[Number(x.table_id),x])),[orders])
 const visibleTables=useMemo(()=>tables.filter(t=>{
   const q=query.trim().toLowerCase()
   const matches=!q||[t.name,t.area_name,t.branch_name].some(v=>String(v||'').toLowerCase().includes(q))
   if(!matches)return false
   if(tableFilter==='all')return true
   if(tableFilter==='vacant')return t.status==='available'
   if(tableFilter==='dirty'||tableFilter==='clean')return (t.cleanliness_status||'clean')===tableFilter
   return t.status===tableFilter
 }),[tables,query,tableFilter])
 const filteredMenu=useMemo(()=>menu.filter(x=>{
   const q=query.trim().toLowerCase()
   const matches=!q||[x.name,x.category_name].some(v=>String(v||'').toLowerCase().includes(q))
   return matches&&(categoryId?Number(x.category_id)===categoryId:true)
 }),[menu,query,categoryId])

 if(!overview)return <Loading/>

 const quick=[
   ['Running Orders',ClipboardList,()=>go('Orders'),orders.length],
   ['Settled Orders',ReceiptText,()=>go('Sales'),0],
   ['Kitchen Display',ChefHat,()=>go('Kitchen'),0],
   ['Payments Report',BarChart3,()=>go('Reports'),0],
   ['Customers',UsersRound,()=>go('Customers'),0],
   ['Restaurant Settings',SettingsIcon,()=>go('Settings'),0],
 ] as const

 return <div className="min-h-[calc(100vh-110px)]">
   <div className="mb-3 flex flex-col gap-2 lg:flex-row">
     <div className="relative flex-1">
       <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
       <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tables, areas or menu items…" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[13px] outline-none focus:border-[#22A53A] focus:ring-2 focus:ring-[#22A53A]/10"/>
     </div>
     <button className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-[12px] font-semibold text-slate-700"><Table2 size={15} className="mr-2 inline"/>Dine In</button>
   </div>

   <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
     <div className="min-w-0">
       <div className="mb-3 flex flex-wrap gap-1.5">
         {(['all','vacant','reserved','occupied','dirty','clean'] as TableFilter[]).map(f=><button key={f} onClick={()=>setTableFilter(f)} className={'rounded-full px-3 py-1.5 text-[10px] font-semibold capitalize '+(tableFilter===f?'bg-slate-950 text-white':'bg-white text-slate-600 ring-1 ring-slate-200')}>{f}</button>)}
       </div>

       {visibleTables.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleTables.map(t=>{
         const order=orderByTable.get(Number(t.id))
         const clean=(t.cleanliness_status||'clean')==='clean'
         return <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
           <div className="flex items-start justify-between gap-3">
             <div>
               <div className="text-[16px] font-semibold text-slate-900">{t.name}</div>
               <div className="mt-1 text-[10px] text-slate-400">{t.area_name||'Main Floor'} · {t.capacity} seats</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <Badge tone={t.status==='occupied'?'blue':t.status==='reserved'?'amber':'green'}>{t.status==='available'?'Vacant':t.status}</Badge>
               <Badge tone={clean?'green':'red'}>{clean?'Clean':'Dirty'}</Badge>
             </div>
           </div>
           <div className="my-4 h-px bg-slate-100"/>
           <div className="flex items-center justify-between gap-3">
             <div><div className="text-[9px] uppercase tracking-[.08em] text-slate-400">Orders</div><div className="mt-0.5 text-[18px] font-semibold text-slate-800">{order?1:0}</div></div>
             <button onClick={()=>go('Orders')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Plus size={13}/>{order?'Open Order':'New Order'}</button>
           </div>
           {order&&<div className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] text-slate-500">{order.order_no} · {money(order.total||0,currency)}</div>}
         </div>
       })}</div>:<div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center"><div className="text-[13px] font-medium text-slate-600">No tables available yet</div><div className="mt-1 text-[11px] text-slate-400">Management can add floors and tables under Settings.</div><button onClick={()=>go('Settings')} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-[11px] font-semibold text-white">Open Restaurant Settings</button></div>}

       <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
         <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
           <button onClick={()=>setCategoryId(0)} className={'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold '+(!categoryId?'bg-[#22A53A] text-white':'bg-slate-100 text-slate-600')}>All Menu</button>
           {categories.map(c=><button key={c.id} onClick={()=>setCategoryId(Number(c.id))} className={'shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold '+(categoryId===Number(c.id)?'bg-[#22A53A] text-white':'bg-slate-100 text-slate-600')}>{c.name}</button>)}
         </div>
         <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{filteredMenu.slice(0,20).map(item=><div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"><div className="truncate text-[11px] font-semibold text-slate-800">{item.name}</div><div className="mt-0.5 truncate text-[9px] text-slate-400">{item.category_name||'Other'}</div><div className="mt-2 text-[11px] font-semibold text-[#169B36]">{money(item.resolved_price,currency)}</div></div>)}</div>
       </div>
     </div>

     <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-[78px]">
       <div className="px-2 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[.12em] text-slate-400">Quick actions & access</div>
       <div className="space-y-1.5">{quick.map(([label,Icon,action,count])=><button key={label} onClick={action} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 text-left transition hover:bg-slate-50">
         <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={15}/></div>
         <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">{label}</span>
         {count>0&&<span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-600">{count}</span>}
       </button>)}</div>
     </aside>
   </div>
 </div>
}
