import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Badge, Loading } from '../components'
export default function Orders({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 useEffect(()=>{api('/restaurant/orders?status=active').then(setRows)},[])
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Front of house" title="Restaurant Orders" sub="Open tables, tabs, waiters, covers and live service status." action={<button className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>New Order</button>}/>
 <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">{rows.map(o=><div key={o.id} className={'rounded-2xl border bg-white p-5 premium-shadow '+(o.held?'border-amber-300':'border-slate-200')}><div className="flex justify-between gap-3"><div><b>{o.order_no}</b><div className="text-xs text-slate-400 mt-1">{nice(o.order_type)} {o.table_name&&'· '+o.table_name}</div></div><Badge tone={o.status==='ready'?'green':o.status==='preparing'?'amber':'blue'}>{nice(o.status)}</Badge></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400">Guests</span><b className="block text-base mt-1">{o.guest_count}</b></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400">Waiter</span><b className="block truncate mt-1">{o.waiter_name||'Unassigned'}</b></div></div><div className="mt-4 flex justify-between items-end"><div><span className="text-xs text-slate-400">Order total</span><div className="font-black">{money(o.total,currency)}</div></div><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Open</button></div></div>)}</div></div>
}
