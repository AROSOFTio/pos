import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Building2, ClipboardList, History, RefreshCw, Search } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Stat, Panel, DataTable, Loading, Badge } from '../components'

type Section='overview'|'stock'|'locations'|'movements'|'counts'
const asArray=(v:any)=>Array.isArray(v)?v:[]

export default function Inventory({currency}:{currency:string}){
 const [section,setSection]=useState<Section>('overview')
 const [o,setO]=useState<any>(null),[loc,setLoc]=useState<any[]>([]),[bal,setBal]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[counts,setCounts]=useState<any[]>([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState('')

 async function load(){
  setLoading(true);setError('')
  try{
   const results=await Promise.allSettled([
    api('/inventory/overview'),
    api('/inventory/locations'),
    api('/inventory/balances'),
    api('/stock-movements'),
    api('/inventory/counts')
   ])
   const [ov,lo,ba,mo,co]=results
   if(ov.status==='fulfilled')setO(ov.value);else setO({stockValue:0,locations:0,lowStock:0,openCounts:0})
   setLoc(lo.status==='fulfilled'?asArray(lo.value):[])
   setBal(ba.status==='fulfilled'?asArray(ba.value):[])
   setMoves(mo.status==='fulfilled'?asArray(mo.value):[])
   setCounts(co.status==='fulfilled'?asArray(co.value):[])
   const failed=results.filter(x=>x.status==='rejected')
   if(failed.length)setError(failed.length===results.length?'Inventory could not be loaded. Please refresh.':'Some inventory information could not be loaded.')
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])

 const q=query.trim().toLowerCase()
 const stockRows=useMemo(()=>bal.filter(x=>!q||[x.product_name,x.sku,x.location_name,x.branch_name].some(v=>String(v||'').toLowerCase().includes(q))),[bal,q])
 const movementRows=useMemo(()=>moves.filter(x=>!q||[x.product_name,x.sku,x.reference_no,x.movement_type,x.branch_name].some(v=>String(v||'').toLowerCase().includes(q))),[moves,q])
 const lowRows=bal.filter(x=>Number(x.qty)<=Number(x.reorder_level||0))

 if(loading&&!o)return <Loading/>

 const nav:Array<[Section,string]>=[['overview','Overview'],['stock','Stock'],['locations','Locations'],['movements','Movements'],['counts','Stock Counts']]

 return <div>
  <PageHeading eyebrow="Stock control" title="Inventory" sub="Live stock, locations and movement history." action={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><RefreshCw size={13}/>Refresh</button>}/>
  {error&&<div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">{error}</div>}

  <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
   {nav.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={'shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-medium transition '+(section===id?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-50')}>{label}</button>)}
  </div>

  {section==='overview'&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Stat label="Stock Value" value={money(o?.stockValue||0,currency)} sub="Across all locations" icon={Boxes}/>
    <Stat label="Locations" value={o?.locations||0} sub="Active stores" icon={Building2} tone="blue"/>
    <Stat label="Low Stock" value={o?.lowStock||0} sub="At or below reorder level" icon={AlertTriangle} tone={o?.lowStock?'amber':'emerald'}/>
    <Stat label="Open Counts" value={o?.openCounts||0} sub="Physical counts in progress" icon={ClipboardList} tone="violet"/>
   </div>
   <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
    <Panel title="Low stock" sub={lowRows.length+' item'+(lowRows.length===1?'':'s')}>
     {lowRows.length?<DataTable head={['Product','Location','Qty','Reorder']} rows={lowRows.slice(0,10).map(x=>[<b>{x.product_name}</b>,x.location_name,Number(x.qty),Number(x.reorder_level||0)])}/>:<Empty text="No low-stock items."/>}
    </Panel>
    <Panel title="Recent movements" sub={moves.length+' recorded'}>
     {moves.length?<DataTable head={['Product','Type','Qty','Reference']} rows={moves.slice(0,10).map(x=>[<b>{x.product_name}</b>,<Badge>{nice(x.movement_type)}</Badge>,Number(x.quantity),x.reference_no||'-'])}/>:<Empty text="No stock movements yet."/>}
    </Panel>
   </div>
  </>}

  {section==='stock'&&<Panel title="Stock balances" sub={bal.length+' location balance'+(bal.length===1?'':'s')} action={<SearchBox value={query} setValue={setQuery}/>}>
   {stockRows.length?<DataTable head={['Product','SKU','Branch','Location','Qty','Avg Cost','Value']} rows={stockRows.map(x=>[<b>{x.product_name}</b>,x.sku||'-',x.branch_name,x.location_name,Number(x.qty),money(x.avg_cost,currency),money(Number(x.qty)*Number(x.avg_cost),currency)])}/>:<Empty text="No stock balances found."/>}
  </Panel>}

  {section==='locations'&&<Panel title="Inventory locations" sub={loc.length+' active location'+(loc.length===1?'':'s')}>
   {loc.length?<DataTable head={['Location','Branch','Type','Units','Stock Value']} rows={loc.map(x=>[<b>{x.name}</b>,x.branch_name,nice(x.location_type),Number(x.total_units),money(x.stock_value,currency)])}/>:<Empty text="No inventory locations yet. Receiving stock or adding a store location will create one."/>}
  </Panel>}

  {section==='movements'&&<Panel title="Stock movement history" sub={moves.length+' recent movement'+(moves.length===1?'':'s')} action={<SearchBox value={query} setValue={setQuery}/>}>
   {movementRows.length?<DataTable head={['Date','Product','Branch','Movement','Qty','Cost','Reference','By']} rows={movementRows.map(x=>[new Date(x.created_at).toLocaleString(),<b>{x.product_name}</b>,x.branch_name||'-',<Badge tone={Number(x.quantity)<0?'amber':'green'}>{nice(x.movement_type)}</Badge>,Number(x.quantity),money(x.unit_cost,currency),x.reference_no||'-',x.created_by||'-'])}/>:<Empty text="No matching stock movements."/>}
  </Panel>}

  {section==='counts'&&<Panel title="Physical stock counts" sub={counts.length+' recent count'+(counts.length===1?'':'s')}>
   {counts.length?<DataTable head={['Reference','Location','Branch','Status','Created','Posted']} rows={counts.map(x=>[<b>{x.reference_no}</b>,x.location_name,x.branch_name,<Badge tone={x.status==='posted'?'green':'amber'}>{nice(x.status)}</Badge>,new Date(x.created_at).toLocaleString(),x.posted_at?new Date(x.posted_at).toLocaleString():'-'])}/>:<Empty text="No physical stock counts yet."/>}
  </Panel>}
 </div>
}

function SearchBox({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="relative hidden sm:block"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Search inventory" className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[11px] outline-none focus:border-[var(--brand-primary)]"/></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-[11px] text-slate-400">{text}</div>}
