import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes, Building2, ClipboardList, RefreshCw, Search, Plus } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Stat, Panel, DataTable, Loading, Badge, Modal } from '../components'

type Section='overview'|'stock'|'locations'|'movements'|'counts'|'lots'|'batches'
const asArray=(v:any)=>Array.isArray(v)?v:[]

export default function Inventory({currency}:{currency:string}){
 const [section,setSection]=useState<Section>('overview')
 const [o,setO]=useState<any>(null),[loc,setLoc]=useState<any[]>([]),[bal,setBal]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[counts,setCounts]=useState<any[]>([]),[lots,setLots]=useState<any[]>([]),[batches,setBatches]=useState<any[]>([]),[recipes,setRecipes]=useState<any[]>([]),[products,setProducts]=useState<any[]>([]),[suppliers,setSuppliers]=useState<any[]>([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState('')
 const [lotOpen,setLotOpen]=useState(false),[batchOpen,setBatchOpen]=useState(false),[busy,setBusy]=useState(false)
 const [lot,setLot]=useState<any>({productId:'',locationId:'',lotNo:'',expiryDate:'',qty:'',unitCost:'',supplierId:''})
 const [batch,setBatch]=useState<any>({recipeId:'',locationId:'',actualYield:'',notes:''})

 async function load(){
  setLoading(true);setError('')
  try{
   const results=await Promise.allSettled([
    api('/inventory/overview'),
    api('/inventory/locations'),
    api('/inventory/balances'),
    api('/stock-movements'),
    api('/inventory/counts'),
    api('/inventory/lots').catch(()=>[]),
    api('/inventory/recipe-batches').catch(()=>[]),
    api('/recipes').catch(()=>[]),
    api('/products').catch(()=>[]),
    api('/suppliers').catch(()=>[])
   ])
   const [ov,lo,ba,mo,co,lt,bt,rc,pr,su]=results
   if(ov.status==='fulfilled')setO(ov.value);else setO({stockValue:0,locations:0,lowStock:0,openCounts:0})
   setLoc(lo.status==='fulfilled'?asArray(lo.value):[])
   setBal(ba.status==='fulfilled'?asArray(ba.value):[])
   setMoves(mo.status==='fulfilled'?asArray(mo.value):[])
   setCounts(co.status==='fulfilled'?asArray(co.value):[])
   setLots(lt.status==='fulfilled'?asArray(lt.value):[])
   setBatches(bt.status==='fulfilled'?asArray(bt.value):[])
   setRecipes(rc.status==='fulfilled'?asArray(rc.value):[])
   setProducts(pr.status==='fulfilled'?asArray(pr.value):[])
   setSuppliers(su.status==='fulfilled'?asArray(su.value):[])
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

 const nav:Array<[Section,string]>=[['overview','Overview'],['stock','Stock'],['locations','Locations'],['movements','Movements'],['counts','Stock Counts'],['lots','Lots & Expiry'],['batches','Prep Batches']]

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

  {section==='lots'&&<Panel title="Lots & Expiry" sub="Track perishable stock by batch and expiry date." action={<button onClick={()=>setLotOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13}/>Add Lot</button>}>
   {lots.length?<DataTable head={['Product','Lot','Location','Expiry','Qty','Cost','Status']} rows={lots.map(x=>[<b>{x.product_name}</b>,x.lot_no,x.location_name,x.expiry_date?new Date(x.expiry_date).toLocaleDateString():'-',Number(x.qty),money(x.unit_cost,currency),x.expiry_date?<Badge tone={Number(x.days_to_expiry)<0?'red':Number(x.days_to_expiry)<=7?'amber':'green'}>{Number(x.days_to_expiry)<0?'Expired':Number(x.days_to_expiry)+' days'}</Badge>:<Badge>No expiry</Badge>])}/>:<Empty text="No lot-controlled stock yet."/>}
  </Panel>}

  {section==='batches'&&<Panel title="Preparation Batches" sub="Produce recipe batches and post ingredient usage automatically." action={<button onClick={()=>setBatchOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13}/>Prepare Batch</button>}>
   {batches.length?<DataTable head={['Batch','Recipe','Location','Yield','Cost','Prepared By','Date']} rows={batches.map(x=>[<b>{x.batch_no}</b>,x.recipe_name,x.location_name,Number(x.actual_yield),money(x.total_cost,currency),x.prepared_by||'-',new Date(x.prepared_at).toLocaleString()])}/>:<Empty text="No preparation batches yet."/>}
  </Panel>}

  {lotOpen&&<Modal title="Add Inventory Lot" onClose={()=>!busy&&setLotOpen(false)} size="md">
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Product"><select className="control" value={lot.productId} onChange={e=>setLot({...lot,productId:e.target.value})}><option value="">Choose product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Location"><select className="control" value={lot.locationId} onChange={e=>setLot({...lot,locationId:e.target.value})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="Lot / batch number"><input className="control" value={lot.lotNo} onChange={e=>setLot({...lot,lotNo:e.target.value})}/></Field>
    <Field label="Expiry date"><input type="date" className="control" value={lot.expiryDate} onChange={e=>setLot({...lot,expiryDate:e.target.value})}/></Field>
    <Field label="Quantity"><input className="control" inputMode="decimal" value={lot.qty} onChange={e=>setLot({...lot,qty:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
    <Field label={'Unit cost ('+currency+')'}><input className="control" inputMode="decimal" value={lot.unitCost} onChange={e=>setLot({...lot,unitCost:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
    <Field label="Supplier"><select className="control" value={lot.supplierId} onChange={e=>setLot({...lot,supplierId:e.target.value})}><option value="">Not specified</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
   </div>
   <button onClick={async()=>{setBusy(true);try{await api('/inventory/lots',{method:'POST',body:JSON.stringify({productId:Number(lot.productId),locationId:Number(lot.locationId),lotNo:lot.lotNo.trim(),expiryDate:lot.expiryDate||null,qty:Number(lot.qty||0),unitCost:Number(lot.unitCost||0),supplierId:Number(lot.supplierId)||null})});setLotOpen(false);setLot({productId:'',locationId:'',lotNo:'',expiryDate:'',qty:'',unitCost:'',supplierId:''});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}} disabled={busy||!lot.productId||!lot.locationId||!lot.lotNo.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Lot</button>
  </Modal>}

  {batchOpen&&<Modal title="Prepare Recipe Batch" onClose={()=>!busy&&setBatchOpen(false)} size="md">
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Recipe"><select className="control" value={batch.recipeId} onChange={e=>setBatch({...batch,recipeId:e.target.value})}><option value="">Choose recipe</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name} · {r.product_name}</option>)}</select></Field>
    <Field label="Location"><select className="control" value={batch.locationId} onChange={e=>setBatch({...batch,locationId:e.target.value})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="Actual yield"><input className="control" inputMode="decimal" value={batch.actualYield} onChange={e=>setBatch({...batch,actualYield:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
    <Field label="Notes"><input className="control" value={batch.notes} onChange={e=>setBatch({...batch,notes:e.target.value})}/></Field>
   </div>
   <button onClick={async()=>{setBusy(true);try{await api('/inventory/recipe-batches',{method:'POST',body:JSON.stringify({recipeId:Number(batch.recipeId),locationId:Number(batch.locationId),actualYield:Number(batch.actualYield||0),notes:batch.notes.trim()||null})});setBatchOpen(false);setBatch({recipeId:'',locationId:'',actualYield:'',notes:''});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}} disabled={busy||!batch.recipeId||!batch.locationId||!(Number(batch.actualYield)>0)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Post Preparation Batch</button>
  </Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="block text-[11px] font-medium text-slate-600">{label}{children}</label>}
function SearchBox({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="relative hidden sm:block"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Search inventory" className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[11px] outline-none focus:border-[var(--brand-primary)]"/></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-[11px] text-slate-400">{text}</div>}
