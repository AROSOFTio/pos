import { useEffect, useState } from 'react'
import { Plus, Store, Users, UtensilsCrossed, XCircle } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Stat, Panel, DataTable, Badge, Loading, Modal } from '../components'

export default function Restaurant({currency}:{currency:string}){
 const [o,setO]=useState<any>(null),[tables,setTables]=useState<any[]>([]),[menu,setMenu]=useState<any[]>([]),[areas,setAreas]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([])
 const [tableOpen,setTableOpen]=useState(false),[areaOpen,setAreaOpen]=useState(false),[error,setError]=useState('')
 const [table,setTable]=useState({branchId:0,areaId:0,name:'',code:'',capacity:2}),[area,setArea]=useState({branchId:0,name:''})
 const load=()=>Promise.all([api('/restaurant/overview'),api('/restaurant/tables'),api('/menu/items'),api('/restaurant/areas'),api('/branches')]).then(([ov,t,m,a,b])=>{setO(ov);setTables(t);setMenu(m);setAreas(a);setBranches(b)})
 useEffect(()=>{load()},[])
 async function createArea(){setError('');try{if(!area.branchId||!area.name.trim())throw new Error('Choose a branch and enter an area/floor name.');await api('/restaurant/areas',{method:'POST',body:JSON.stringify(area)});setAreaOpen(false);setArea({branchId:0,name:''});await load()}catch(e:any){setError(e.message)}}
 async function createTable(){setError('');try{if(!table.branchId||!table.name.trim())throw new Error('Choose a branch and enter a table name.');await api('/restaurant/tables',{method:'POST',body:JSON.stringify({...table,areaId:table.areaId||null})});setTableOpen(false);setTable({branchId:0,areaId:0,name:'',code:'',capacity:2});await load()}catch(e:any){setError(e.message)}}
 if(!o)return <Loading/>
 return <div>
  <PageHeading eyebrow="Restaurant setup" title="Floor, Tables & Menu" sub="Configure restaurant areas and tables here, then use them when opening dine-in orders." action={<div className="flex gap-2"><button onClick={()=>{setError('');setArea({...area,branchId:Number(branches[0]?.id||0)});setAreaOpen(true)}} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium"><Plus size={14} className="mr-1 inline"/>Area</button><button onClick={()=>{setError('');setTable({...table,branchId:Number(branches[0]?.id||0)});setTableOpen(true)}} className="rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-medium text-white"><Plus size={14} className="mr-1 inline"/>Table</button></div>}/>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Tables" value={o.tables} sub="Configured tables" icon={Store}/><Stat label="Occupied" value={o.occupied} sub="In service" icon={Users} tone="amber"/><Stat label="Available menu" value={o.availableMenu} sub="Can be ordered" icon={UtensilsCrossed}/><Stat label="Sold out" value={o.soldOut} sub="Hidden from POS" icon={XCircle} tone="rose"/></div>
  <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_.95fr]">
   <Panel title="Floor status" sub={areas.length+' areas · '+tables.length+' tables'}>
    {tables.length?<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{tables.map(t=><div key={t.id} className={'rounded-xl border p-3 '+(t.status==='occupied'?'border-red-100 bg-red-50':t.status==='reserved'?'border-amber-100 bg-amber-50':'border-emerald-100 bg-emerald-50')}><div className="flex items-start justify-between gap-2"><div><b className="text-[13px]">{t.name}</b><div className="mt-0.5 text-[10px] text-slate-500">{t.area_name||'Main Floor'}</div></div><Badge tone={t.status==='occupied'?'red':t.status==='reserved'?'amber':'green'}>{t.status}</Badge></div><div className="mt-2 text-[10px] text-slate-500">{t.capacity} seats · {t.branch_name}</div></div>)}</div>:<div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-[12px] text-slate-400">No tables yet. Add an area and table to start dine-in service.</div>}
   </Panel>
   <Panel title="Menu control"><DataTable head={['Item','Category','Station','Price','Status']} rows={menu.slice(0,15).map(x=>[<b>{x.product_name}</b>,x.category_name||'Other',x.station_name||'-',money(x.base_price,currency),x.sold_out?<Badge tone="red">Sold out</Badge>:<Badge tone="green">Available</Badge>])}/></Panel>
  </div>

  {areaOpen&&<Modal title="Add Restaurant Area / Floor" onClose={()=>setAreaOpen(false)}>
   <div className="grid gap-3">
    <Field label="Branch"><select className="control" value={area.branchId} onChange={e=>setArea({...area,branchId:Number(e.target.value)})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
    <Field label="Area / floor name"><input className="control" value={area.name} onChange={e=>setArea({...area,name:e.target.value})} placeholder="Main Floor, Terrace, VIP…"/></Field>
    {error&&<div className="rounded-lg bg-red-50 p-3 text-[12px] text-red-700">{error}</div>}
    <button onClick={createArea} className="rounded-lg bg-[#22A53A] py-3 text-[13px] font-semibold text-white">Save Area</button>
   </div>
  </Modal>}

  {tableOpen&&<Modal title="Add Table" onClose={()=>setTableOpen(false)}>
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Branch"><select className="control" value={table.branchId} onChange={e=>setTable({...table,branchId:Number(e.target.value),areaId:0})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
    <Field label="Area / floor"><select className="control" value={table.areaId} onChange={e=>setTable({...table,areaId:Number(e.target.value)})}><option value="0">No area</option>{areas.filter(a=>Number(a.branch_id)===Number(table.branchId)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
    <Field label="Table name"><input className="control" value={table.name} onChange={e=>setTable({...table,name:e.target.value})} placeholder="Table 1"/></Field>
    <Field label="Code"><input className="control" value={table.code} onChange={e=>setTable({...table,code:e.target.value})} placeholder="T1"/></Field>
    <Field label="Seats"><input className="control" type="number" min="1" value={table.capacity} onChange={e=>setTable({...table,capacity:Math.max(1,Number(e.target.value))})}/></Field>
   </div>
   {error&&<div className="mt-3 rounded-lg bg-red-50 p-3 text-[12px] text-red-700">{error}</div>}
   <button onClick={createTable} className="mt-4 w-full rounded-lg bg-[#22A53A] py-3 text-[13px] font-semibold text-white">Save Table</button>
  </Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-[12px] font-medium text-slate-600">{label}{children}</label>}
