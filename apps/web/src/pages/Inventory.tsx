import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Boxes, Building2, ClipboardList, PackagePlus, Plus, RefreshCw, Search, Scale, Truck } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Stat, Panel, DataTable, Loading, Badge, Modal } from '../components'

type Section='overview'|'stock'|'movements'|'transfers'|'counts'|'locations'|'lots'|'batches'
const asArray=(v:any)=>Array.isArray(v)?v:[]

export default function Inventory({currency,onOpenPurchasing}:{currency:string;onOpenPurchasing?:()=>void}){
 const [section,setSection]=useState<Section>('overview')
 const [o,setO]=useState<any>(null),[loc,setLoc]=useState<any[]>([]),[bal,setBal]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[transfers,setTransfers]=useState<any[]>([]),[counts,setCounts]=useState<any[]>([]),[lots,setLots]=useState<any[]>([]),[lotMoves,setLotMoves]=useState<any[]>([]),[batches,setBatches]=useState<any[]>([]),[recipes,setRecipes]=useState<any[]>([]),[products,setProducts]=useState<any[]>([]),[suppliers,setSuppliers]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([])
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false)
 const [restockOpen,setRestockOpen]=useState(false),[adjustOpen,setAdjustOpen]=useState(false),[transferOpen,setTransferOpen]=useState(false),[countOpen,setCountOpen]=useState(false),[countEdit,setCountEdit]=useState<any>(null),[locationOpen,setLocationOpen]=useState(false),[lotOpen,setLotOpen]=useState(false),[batchOpen,setBatchOpen]=useState(false),[reorderOpen,setReorderOpen]=useState<any>(null)
 const [restock,setRestock]=useState<any>({locationId:'',productId:'',qty:'',notes:''})
 const [adjust,setAdjust]=useState<any>({locationId:'',productId:'',action:'decrease',qty:'',reason:''})
 const [transfer,setTransfer]=useState<any>({fromLocationId:'',toLocationId:'',productId:'',qty:'',notes:''})
 const [count,setCount]=useState<any>({locationId:'',notes:''})
 const [countItems,setCountItems]=useState<any[]>([])
 const [location,setLocation]=useState<any>({branchId:'',name:'',locationType:'store'})
 const [lot,setLot]=useState<any>({productId:'',locationId:'',lotNo:'',expiryDate:'',qty:'',unitCost:'',supplierId:''})
 const [batch,setBatch]=useState<any>({recipeId:'',locationId:'',actualYield:'',notes:''})
 const [reorderLevel,setReorderLevel]=useState('')

 async function load(){
  setLoading(true);setError('')
  try{
   const results=await Promise.allSettled([
    api('/inventory/overview'),api('/inventory/locations'),api('/inventory/balances'),api('/stock-movements'),
    api('/inventory/transfers').catch(()=>[]),api('/inventory/counts'),api('/inventory/lots').catch(()=>[]),api('/inventory/lot-movements').catch(()=>[]),
    api('/inventory/recipe-batches').catch(()=>[]),api('/recipes').catch(()=>[]),api('/products').catch(()=>[]),api('/suppliers').catch(()=>[]),api('/branches').catch(()=>[])
   ])
   const vals=results.map(x=>x.status==='fulfilled'?x.value:[])
   setO(results[0].status==='fulfilled'?results[0].value:{stockValue:0,locations:0,lowStock:0,openCounts:0})
   setLoc(asArray(vals[1]));setBal(asArray(vals[2]));setMoves(asArray(vals[3]));setTransfers(asArray(vals[4]));setCounts(asArray(vals[5]));setLots(asArray(vals[6]));setLotMoves(asArray(vals[7]));setBatches(asArray(vals[8]));setRecipes(asArray(vals[9]));setProducts(asArray(vals[10]));setSuppliers(asArray(vals[11]));setBranches(asArray(vals[12]))
   const failed=results.filter(x=>x.status==='rejected')
   if(failed.length)setError(failed.length===results.length?'Inventory could not be loaded. Please refresh.':'Some inventory information could not be loaded.')
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[])

 const q=query.trim().toLowerCase()
 const stockRows=useMemo(()=>bal.filter(x=>!q||[x.product_name,x.sku,x.location_name,x.branch_name].some(v=>String(v||'').toLowerCase().includes(q))),[bal,q])
 const movementRows=useMemo(()=>moves.filter(x=>!q||[x.product_name,x.sku,x.reference_no,x.movement_type,x.branch_name].some(v=>String(v||'').toLowerCase().includes(q))),[moves,q])
 const lowRows=bal.filter(x=>Number(x.qty)<=Number(x.reorder_level||0))
 const sourceBalances=bal.filter(x=>Number(x.location_id)===Number(transfer.fromLocationId)&&Number(x.qty)>0)
 const adjustBalances=bal.filter(x=>Number(x.location_id)===Number(adjust.locationId))
 const unassignedForLot=(productId:number,locationId:number)=>{
   const b=bal.find(x=>Number(x.product_id)===productId&&Number(x.location_id)===locationId)
   const assigned=lots.filter(x=>Number(x.product_id)===productId&&Number(x.location_id)===locationId).reduce((n,x)=>n+Number(x.qty||0),0)
   return Math.max(0,Number(b?.qty||0)-assigned)
 }

 const restockProducts=products.filter(x=>['prepared','both'].includes(String(x.stock_source||'purchased')))
 const chosenRestock=bal.find(x=>Number(x.product_id)===Number(restock.productId)&&Number(x.location_id)===Number(restock.locationId))
 const chosenProduct=products.find(x=>Number(x.id)===Number(restock.productId))
 const chosenRecipe=recipes.find(r=>Number(r.product_id)===Number(restock.productId))
 function openRestock(row?:any){
   setError('')
   setRestock({locationId:row?String(row.location_id):'',productId:row?String(row.product_id):'',qty:'',notes:''})
   setRestockOpen(true)
 }
 async function postRestock(){
   const qty=Number(restock.qty||0)
   if(!restock.locationId||!restock.productId||!(qty>0))return
   setBusy(true);setError('')
   try{
     await api('/inventory/restock',{method:'POST',body:JSON.stringify({locationId:Number(restock.locationId),productId:Number(restock.productId),qty,notes:restock.notes.trim()||null})})
     setRestockOpen(false);setRestock({locationId:'',productId:'',qty:'',notes:''});await load()
   }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 function prepareWithRecipe(){
   if(!chosenRecipe||!restock.locationId)return
   setBatch({recipeId:String(chosenRecipe.id),locationId:String(restock.locationId),actualYield:restock.qty,notes:restock.notes})
   setRestockOpen(false);setBatchOpen(true)
 }

 async function postAdjustment(){
  const b=bal.find(x=>Number(x.product_id)===Number(adjust.productId)&&Number(x.location_id)===Number(adjust.locationId))
  const qty=Number(adjust.qty||0);if(!b||!(qty>0)||!adjust.reason.trim())return
  const negative=adjust.action!=='increase',adjustmentType=adjust.action==='wastage'?'wastage':adjust.action==='spoilage'?'spoilage':'adjustment'
  setBusy(true);setError('')
  try{
   await api('/inventory/adjustments',{method:'POST',body:JSON.stringify({locationId:Number(adjust.locationId),adjustmentType,reason:adjust.reason.trim(),items:[{productId:Number(adjust.productId),qtyChange:negative?-qty:qty,unitCost:Number(b.avg_cost||0)}]})})
   setAdjustOpen(false);setAdjust({locationId:'',productId:'',action:'decrease',qty:'',reason:''});await load()
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function postTransfer(){
  const qty=Number(transfer.qty||0);if(!transfer.fromLocationId||!transfer.toLocationId||!transfer.productId||!(qty>0))return
  setBusy(true);setError('')
  try{await api('/inventory/transfers',{method:'POST',body:JSON.stringify({fromLocationId:Number(transfer.fromLocationId),toLocationId:Number(transfer.toLocationId),notes:transfer.notes.trim()||null,items:[{productId:Number(transfer.productId),qty}]})});setTransferOpen(false);setTransfer({fromLocationId:'',toLocationId:'',productId:'',qty:'',notes:''});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function startCount(){
  if(!count.locationId)return
  setBusy(true);setError('')
  try{const h=await api('/inventory/counts',{method:'POST',body:JSON.stringify({locationId:Number(count.locationId),notes:count.notes.trim()||null})});setCountOpen(false);setCount({locationId:'',notes:''});await openCount(h);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function openCount(h:any){
  const d=await api('/inventory/counts/'+h.id);setCountEdit(d.count);setCountItems((d.items||[]).map((x:any)=>({...x,countedQty:x.counted_qty==null?'':String(Number(x.counted_qty))})))
 }
 async function saveCount(post=false){
  if(!countEdit)return
  const items=countItems.map(x=>({itemId:Number(x.id),countedQty:x.countedQty}))
  if(post&&items.some(x=>x.countedQty==='')){setError('Enter every counted quantity before posting the stock count. Use 0 when none is found.');return}
  setBusy(true);setError('')
  try{
   if(post)await api('/inventory/counts/'+countEdit.id+'/post',{method:'POST',body:JSON.stringify({items})})
   else await api('/inventory/counts/'+countEdit.id,{method:'PUT',body:JSON.stringify({items})})
   setCountEdit(null);setCountItems([]);await load()
  }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function addLocation(){
  if(!location.branchId||!location.name.trim())return
  setBusy(true);setError('')
  try{await api('/inventory/locations',{method:'POST',body:JSON.stringify({branchId:Number(location.branchId),name:location.name.trim(),locationType:location.locationType})});setLocationOpen(false);setLocation({branchId:'',name:'',locationType:'store'});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function assignLot(){
  const qty=Number(lot.qty||0);if(!lot.productId||!lot.locationId||!lot.lotNo.trim()||!(qty>0))return
  setBusy(true);setError('')
  try{await api('/inventory/lots',{method:'POST',body:JSON.stringify({productId:Number(lot.productId),locationId:Number(lot.locationId),lotNo:lot.lotNo.trim(),expiryDate:lot.expiryDate||null,qty,unitCost:Number(lot.unitCost||0),supplierId:Number(lot.supplierId)||null})});setLotOpen(false);setLot({productId:'',locationId:'',lotNo:'',expiryDate:'',qty:'',unitCost:'',supplierId:''});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function saveReorder(){
  if(!reorderOpen)return
  setBusy(true);setError('')
  try{await api('/inventory/reorder-levels',{method:'PUT',body:JSON.stringify({productId:Number(reorderOpen.product_id),locationId:Number(reorderOpen.location_id),reorderLevel:Number(reorderLevel||0)})});setReorderOpen(null);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 if(loading&&!o)return <Loading/>
 const nav:Array<[Section,string]>=[['overview','Overview'],['stock','Stock on Hand'],['movements','History'],['transfers','Transfers'],['counts','Count Stock'],['locations','Locations'],['lots','Batches & Expiry'],['batches','Kitchen Prep']]

 return <div>
  <PageHeading eyebrow="Stock control" title="Inventory" sub="Add, receive, move, count and correct stock without accounting jargon." action={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><RefreshCw size={13}/>Refresh</button>}/>
  {error&&<div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">{error}</div>}

  <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
   {nav.map(([id,label])=><button key={id} onClick={()=>setSection(id)} className={'shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition '+(section===id?'bg-[var(--brand-soft)] text-[var(--brand-primary)]':'text-slate-500 hover:bg-slate-50')}>{label}</button>)}
  </div>

  {section==='overview'&&<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Stat label="Stock Value" value={money(o?.stockValue||0,currency)} sub="Current value across locations" icon={Boxes}/>
    <Stat label="Locations" value={o?.locations||0} sub="Stores, kitchens and bars" icon={Building2} tone="blue"/>
    <Stat label="Needs Reorder" value={o?.lowStock||0} sub="Products at or below reorder level" icon={AlertTriangle} tone={o?.lowStock?'amber':'emerald'}/>
    <Stat label="Counts in Progress" value={o?.openCounts||0} sub="Physical counts not yet posted" icon={ClipboardList} tone="violet"/>
   </div>
   <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] leading-5 text-emerald-900"><b>Need to increase stock?</b> If you made/prepared it here, use <b>Add / Refill Stock</b>. If a supplier brought it, use <b>Receive Delivery</b>. Use <b>Correct Stock</b> only when the physical quantity is unexpectedly different.</div>
   <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <Quick icon={PackagePlus} title="Add / Refill Stock" sub="Prepared or produced here" onClick={()=>openRestock()}/>
    <Quick icon={Truck} title="Receive Delivery" sub="Stock brought by a supplier" onClick={()=>onOpenPurchasing?.()}/>
    <Quick icon={ArrowRightLeft} title="Move Stock" sub="Transfer between locations" onClick={()=>setTransferOpen(true)}/>
    <Quick icon={ClipboardList} title="Count Stock" sub="Physical stock check" onClick={()=>setCountOpen(true)}/>
    <Quick icon={Scale} title="Correct Stock" sub="Fix an unexpected difference" onClick={()=>setAdjustOpen(true)}/>
   </div>
   <div className="mt-4 grid gap-4 xl:grid-cols-2">
    <Panel title="Needs refill / reorder" sub={lowRows.length+' location balance'+(lowRows.length===1?'':'s')}>{lowRows.length?<DataTable head={['Product','Location','On Hand','Alert At','What to do']} rows={lowRows.slice(0,12).map(x=>[<b>{x.product_name}</b>,x.location_name,Number(x.qty),Number(x.reorder_level||0),<button onClick={()=>x.stock_source==='purchased'?onOpenPurchasing?.():openRestock(x)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700">{x.stock_source==='purchased'?'Receive Delivery':'Add / Refill'}</button>])}/>:<Empty text="Nothing needs refilling or reordering right now."/>}</Panel>
    <Panel title="Recent stock activity" sub={moves.length+' recorded movements'}>{moves.length?<DataTable head={['Product','What happened','Qty','Reference']} rows={moves.slice(0,12).map(x=>[<b>{x.product_name}</b>,<Badge>{movementName(x.movement_type)}</Badge>,Number(x.quantity),x.reference_no||'-'])}/>:<Empty text="No stock activity yet."/>}</Panel>
   </div>
  </>}

  {section==='stock'&&<Panel title="Stock on Hand" sub="What is physically available at each location." action={<SearchBox value={query} setValue={setQuery}/>}>
   {stockRows.length?<DataTable head={['Product','Branch / Location','On Hand','Restock Method','Reorder At','Average Cost','Stock Value','Actions']} rows={stockRows.map(x=>[
    <div><b>{x.product_name}</b><div className="text-[10px] text-slate-400">{x.sku||'No SKU'}{x.lot_tracking_required?' · Batch tracked':''}</div>{x.lot_tracking_required&&Number(x.unassigned_lot_qty)>0&&<div className="mt-1 text-[9.5px] font-semibold text-amber-600">{Number(x.unassigned_lot_qty)} needs batch / expiry</div>}</div>,
    <div>{x.branch_name}<div className="text-[10px] text-slate-400">{x.location_name}</div></div>,
    <Badge tone={Number(x.qty)<=Number(x.reorder_level||0)?'amber':'green'}>{Number(x.qty)}</Badge>,<Badge>{x.stock_source==='prepared'?'Prepared here':x.stock_source==='both'?'Supplier + prepared':'Supplier'}</Badge>,Number(x.reorder_level||0),money(x.avg_cost,currency),money(Number(x.qty)*Number(x.avg_cost),currency),
    <div className="flex flex-wrap gap-1.5">{x.stock_source!=='purchased'&&<button onClick={()=>openRestock(x)} className="rounded-lg bg-[var(--brand-primary)] px-2.5 py-1.5 text-[10px] font-semibold text-white">+ Add / Refill</button>}{x.stock_source!=='prepared'&&<button onClick={()=>onOpenPurchasing?.()} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700">Receive</button>}<button onClick={()=>{setReorderOpen(x);setReorderLevel(String(Number(x.reorder_level||0)))}} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Alert level</button></div>
   ])}/>:<Empty text="No stock balances found."/>}
  </Panel>}

  {section==='movements'&&<Panel title="Stock History" sub="Every increase and reduction with its source." action={<SearchBox value={query} setValue={setQuery}/>}>
   {movementRows.length?<DataTable head={['Date','Product','Branch','What happened','Qty','Before','After','Reference','By']} rows={movementRows.map(x=>[new Date(x.created_at).toLocaleString(),<b>{x.product_name}</b>,x.branch_name||'-',<Badge tone={Number(x.quantity)<0?'amber':'green'}>{movementName(x.movement_type)}</Badge>,Number(x.quantity),Number(x.stock_before),Number(x.stock_after),x.reference_no||'-',x.created_by||'-'])}/>:<Empty text="No matching stock activity."/>}
  </Panel>}

  {section==='transfers'&&<Panel title="Stock Transfers" sub="Stock moved between your stores, bars and kitchens." action={<button onClick={()=>setTransferOpen(true)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13} className="mr-1 inline"/>Move Stock</button>}>
   {transfers.length?<DataTable head={['Reference','From','To','Qty','Status','By','Date']} rows={transfers.map(x=>[<b>{x.reference_no}</b>,x.from_location,x.to_location,Number(x.total_qty),<Badge tone="green">{nice(x.status)}</Badge>,x.created_by||'-',new Date(x.created_at).toLocaleString()])}/>:<Empty text="No stock transfers yet."/>}
  </Panel>}

  {section==='counts'&&<Panel title="Physical Stock Counts" sub="Count what is actually on the shelf and let Mauzo correct the difference." action={<button onClick={()=>setCountOpen(true)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13} className="mr-1 inline"/>Start Count</button>}>
   {counts.length?<DataTable head={['Reference','Location','Branch','Status','Created','Action']} rows={counts.map(x=>[<b>{x.reference_no}</b>,x.location_name,x.branch_name,<Badge tone={x.status==='posted'?'green':'amber'}>{x.status==='posted'?'Completed':'In progress'}</Badge>,new Date(x.created_at).toLocaleString(),x.status==='draft'?<button onClick={()=>openCount(x)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold">Enter Count</button>:'-'])}/>:<Empty text="No stock counts yet."/>}
  </Panel>}

  {section==='locations'&&<Panel title="Stock Locations" sub="Stores, kitchens, bars and other places where stock is kept." action={<button onClick={()=>setLocationOpen(true)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13} className="mr-1 inline"/>Add Location</button>}>
   {loc.length?<DataTable head={['Location','Branch','Type','Units','Stock Value']} rows={loc.map(x=>[<b>{x.name}</b>,x.branch_name,nice(x.location_type),Number(x.total_units),money(x.stock_value,currency)])}/>:<Empty text="No inventory locations yet."/>}
  </Panel>}

  {section==='lots'&&<>
   <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] leading-5 text-blue-800"><b>Batch / expiry does not add stock.</b> Use this to label stock already on hand. Supplier deliveries must be received from an approved Purchase Order in Purchasing.</div>
   <Panel title="Batches & Expiry" sub="Track expiry dates without changing your stock balance." action={<button onClick={()=>setLotOpen(true)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13} className="mr-1 inline"/>Assign Batch</button>}>
    {lots.length?<DataTable head={['Product','Batch / Lot','Location','Expiry','Qty','Cost','Status']} rows={lots.map(x=>[<b>{x.product_name}</b>,x.lot_no,x.location_name,x.expiry_date?new Date(x.expiry_date).toLocaleDateString():'-',Number(x.qty),money(x.unit_cost,currency),x.expiry_date?<Badge tone={Number(x.days_to_expiry)<0?'red':Number(x.days_to_expiry)<=7?'amber':'green'}>{Number(x.days_to_expiry)<0?'Expired':Number(x.days_to_expiry)+' days'}</Badge>:<Badge>No expiry</Badge>])}/>:<Empty text="No batch-controlled stock yet."/>}
   </Panel>
   <div className="mt-4"><Panel title="Batch History" sub="Where tracked batches came from and how they were used.">{lotMoves.length?<DataTable head={['Date','Product','Batch','Location','Activity','Qty','Reference','By']} rows={lotMoves.slice(0,100).map(x=>[new Date(x.created_at).toLocaleString(),<b>{x.product_name}</b>,x.lot_no||'-',x.location_name,movementName(x.movement_type),Number(x.quantity),x.reference_no||'-',x.created_by||'-'])}/>:<Empty text="No batch movement history yet."/>}</Panel></div>
  </>}

  {section==='batches'&&<Panel title="Prepare with Recipe" sub="Use ingredients to produce finished stock and calculate the real food cost automatically." action={<button onClick={()=>setBatchOpen(true)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13} className="mr-1 inline"/>Prepare Batch</button>}>
   {batches.length?<DataTable head={['Batch','Recipe','Location','Yield','Cost','Prepared By','Date']} rows={batches.map(x=>[<b>{x.batch_no}</b>,x.recipe_name,x.location_name,Number(x.actual_yield),money(x.total_cost,currency),x.prepared_by||'-',new Date(x.prepared_at).toLocaleString()])}/>:<Empty text="No preparation batches yet."/>}
  </Panel>}

  {restockOpen&&<Modal title="Add / Refill Stock" onClose={()=>!busy&&setRestockOpen(false)} size="md">
   <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600"><span><b className="text-slate-800">Prepared here?</b> Add the new quantity below.</span><button type="button" onClick={()=>{setRestockOpen(false);onOpenPurchasing?.()}} className="shrink-0 font-semibold text-[var(--brand-primary)]">Supplier delivery →</button></div>
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Location"><select className="control" value={restock.locationId} onChange={e=>setRestock({...restock,locationId:e.target.value,productId:''})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="Product"><select className="control" value={restock.productId} onChange={e=>setRestock({...restock,productId:e.target.value})}><option value="">Choose product</option>{restockProducts.map(x=>{const b=bal.find(z=>Number(z.product_id)===Number(x.id)&&Number(z.location_id)===Number(restock.locationId));return <option key={x.id} value={x.id}>{x.name}{restock.locationId?' · '+Number(b?.qty||0)+' available':''}</option>})}</select></Field>
    <Field label="Quantity being added"><input className="control" inputMode="decimal" value={restock.qty} onChange={e=>setRestock({...restock,qty:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="e.g. 50"/></Field>
    <Field label="Note"><input className="control" value={restock.notes} onChange={e=>setRestock({...restock,notes:e.target.value})} placeholder="e.g. Morning chapati batch"/></Field>
   </div>
   {chosenProduct&&restock.locationId&&Number(restock.qty)>0&&<div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><div><div className="text-[9px] uppercase tracking-wide text-slate-400">Current</div><div className="mt-1 text-[16px] font-bold text-slate-800">{Number(chosenRestock?.qty||0)}</div></div><div><div className="text-[9px] uppercase tracking-wide text-slate-400">Add</div><div className="mt-1 text-[16px] font-bold text-emerald-600">+{Number(restock.qty)}</div></div><div><div className="text-[9px] uppercase tracking-wide text-slate-400">New stock</div><div className="mt-1 text-[16px] font-bold text-slate-950">{Number(chosenRestock?.qty||0)+Number(restock.qty)}</div></div></div>}
   {chosenRecipe&&chosenProduct&&<div className="mt-3 rounded-lg bg-blue-50 px-3 py-2.5 text-[12px] leading-5 text-blue-900"><b>Recipe available:</b> use Prepare with Recipe to deduct ingredients automatically.</div>}
   <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">{chosenRecipe&&<button onClick={prepareWithRecipe} disabled={busy||!restock.locationId||!restock.productId||!(Number(restock.qty)>0)} className="rounded-lg border border-[var(--brand-primary)] bg-white px-4 py-3 text-[11px] font-semibold text-[var(--brand-primary)] disabled:opacity-40">Prepare with Recipe</button>}<button onClick={postRestock} disabled={busy||!restock.locationId||!restock.productId||!(Number(restock.qty)>0)} className="rounded-lg bg-[var(--brand-primary)] px-4 py-3 text-[11px] font-semibold text-white disabled:opacity-40">{busy?'Adding…':'Add Stock'}</button></div>
  </Modal>}

  {adjustOpen&&<Modal title="Correct Stock" onClose={()=>!busy&&setAdjustOpen(false)} size="md">
   <p className="mb-3 text-[11px] leading-5 text-slate-500"><b>Correction only.</b> Use this when physical stock is unexpectedly different from Mauzo. Do not use it for normal refill or supplier delivery.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Location"><select className="control" value={adjust.locationId} onChange={e=>setAdjust({...adjust,locationId:e.target.value,productId:''})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="What happened?"><select className="control" value={adjust.action} onChange={e=>setAdjust({...adjust,action:e.target.value})}><option value="increase">Found unexpected extra stock</option><option value="decrease">Stock missing / correction</option><option value="wastage">Wasted / damaged</option><option value="spoilage">Expired / spoiled</option></select></Field>
    <Field label="Product"><select className="control" value={adjust.productId} onChange={e=>setAdjust({...adjust,productId:e.target.value})}><option value="">Choose product</option>{adjustBalances.map(x=><option key={x.product_id} value={x.product_id}>{x.product_name} · {Number(x.qty)} on hand</option>)}</select></Field>
    <Field label="Quantity"><input className="control" inputMode="decimal" value={adjust.qty} onChange={e=>setAdjust({...adjust,qty:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
   </div>
   <Field label="Reason"><input className="control" value={adjust.reason} onChange={e=>setAdjust({...adjust,reason:e.target.value})} placeholder="e.g. 2 bottles broken during handling"/></Field>
   {(adjust.action==='wastage'||adjust.action==='spoilage')&&<div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10.5px] text-amber-800">This loss will be sent for manager approval before stock changes.</div>}
   <button onClick={postAdjustment} disabled={busy||!adjust.locationId||!adjust.productId||!(Number(adjust.qty)>0)||!adjust.reason.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Saving…':'Record Stock Correction'}</button>
  </Modal>}

  {transferOpen&&<Modal title="Move Stock" onClose={()=>!busy&&setTransferOpen(false)} size="md">
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="From"><select className="control" value={transfer.fromLocationId} onChange={e=>setTransfer({...transfer,fromLocationId:e.target.value,productId:''})}><option value="">Choose source</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="To"><select className="control" value={transfer.toLocationId} onChange={e=>setTransfer({...transfer,toLocationId:e.target.value})}><option value="">Choose destination</option>{loc.filter(x=>Number(x.id)!==Number(transfer.fromLocationId)).map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="Product"><select className="control" value={transfer.productId} onChange={e=>setTransfer({...transfer,productId:e.target.value})}><option value="">Choose product</option>{sourceBalances.map(x=><option key={x.product_id} value={x.product_id}>{x.product_name} · {Number(x.qty)} available</option>)}</select></Field>
    <Field label="Quantity"><input className="control" inputMode="decimal" value={transfer.qty} onChange={e=>setTransfer({...transfer,qty:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
   </div>
   <Field label="Note"><input className="control" value={transfer.notes} onChange={e=>setTransfer({...transfer,notes:e.target.value})} placeholder="Optional reason for the move"/></Field>
   <button onClick={postTransfer} disabled={busy||!transfer.fromLocationId||!transfer.toLocationId||!transfer.productId||!(Number(transfer.qty)>0)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Move Stock</button>
  </Modal>}

  {countOpen&&<Modal title="Start Physical Count" onClose={()=>!busy&&setCountOpen(false)} size="sm">
   <Field label="Location"><select className="control" value={count.locationId} onChange={e=>setCount({...count,locationId:e.target.value})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
   <Field label="Note"><input className="control" value={count.notes} onChange={e=>setCount({...count,notes:e.target.value})} placeholder="e.g. Weekly shelf count"/></Field>
   <button onClick={startCount} disabled={busy||!count.locationId} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white">Start Counting</button>
  </Modal>}

  {countEdit&&<Modal title={'Count Stock · '+countEdit.reference_no} onClose={()=>!busy&&setCountEdit(null)} size="xl">
   <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><div className="text-[11px] font-semibold">{countEdit.location_name}</div><div className="text-[10px] text-slate-500">Enter what you physically counted. Use 0 if none is found.</div></div><button onClick={()=>setCountItems(v=>v.map(x=>({...x,countedQty:String(Number(x.expected_qty))})))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold">Copy expected</button></div>
   <div className="max-h-[520px] overflow-y-auto rounded-xl border border-slate-200"><table className="w-full text-left text-[11px]"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Product</th><th className="p-3 text-right">Mauzo says</th><th className="p-3 text-right">I counted</th><th className="p-3 text-right">Difference</th></tr></thead><tbody>{countItems.map((x,i)=>{const c=x.countedQty===''?null:Number(x.countedQty),diff=c==null?null:c-Number(x.expected_qty);return <tr key={x.id} className="border-t border-slate-100"><td className="p-3"><b>{x.product_name}</b><div className="text-[9px] text-slate-400">{x.sku||''}</div></td><td className="p-3 text-right">{Number(x.expected_qty)}</td><td className="p-2 text-right"><input className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right" inputMode="decimal" value={x.countedQty} onChange={e=>setCountItems(v=>v.map((z,k)=>k===i?{...z,countedQty:e.target.value.replace(/[^0-9.]/g,'')}:z))}/></td><td className={'p-3 text-right font-semibold '+(diff==null?'text-slate-300':diff===0?'text-emerald-600':'text-amber-600')}>{diff==null?'-':diff>0?'+'+diff:diff}</td></tr>})}</tbody></table></div>
   <div className="mt-4 flex justify-end gap-2"><button onClick={()=>saveCount(false)} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2.5 text-[11px] font-semibold">Save & Finish Later</button><button onClick={()=>saveCount(true)} disabled={busy||countItems.some(x=>x.countedQty==='')} className="rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-[11px] font-semibold text-white disabled:opacity-40">Post Count & Correct Stock</button></div>
  </Modal>}

  {locationOpen&&<Modal title="Add Stock Location" onClose={()=>!busy&&setLocationOpen(false)} size="sm">
   <Field label="Branch"><select className="control" value={location.branchId} onChange={e=>setLocation({...location,branchId:e.target.value})}><option value="">Choose branch</option>{branches.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
   <Field label="Location name"><input className="control" value={location.name} onChange={e=>setLocation({...location,name:e.target.value})} placeholder="e.g. Main Store, Kitchen, Bar"/></Field>
   <Field label="Location type"><select className="control" value={location.locationType} onChange={e=>setLocation({...location,locationType:e.target.value})}><option value="store">Store</option><option value="main">Main Store</option><option value="kitchen">Kitchen</option><option value="bar">Bar</option><option value="warehouse">Warehouse</option></select></Field>
   <button onClick={addLocation} disabled={busy||!location.branchId||!location.name.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white">Add Location</button>
  </Modal>}

  {lotOpen&&<Modal title="Assign Batch / Expiry" onClose={()=>!busy&&setLotOpen(false)} size="md">
   <p className="mb-3 text-[11px] leading-5 text-slate-500">This labels stock already on hand. It does not increase quantity.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Location"><select className="control" value={lot.locationId} onChange={e=>setLot({...lot,locationId:e.target.value,productId:''})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field>
    <Field label="Product"><select className="control" value={lot.productId} onChange={e=>{const pid=Number(e.target.value),b=bal.find(x=>Number(x.product_id)===pid&&Number(x.location_id)===Number(lot.locationId));setLot({...lot,productId:e.target.value,unitCost:String(Number(b?.avg_cost||0))})}}><option value="">Choose product</option>{bal.filter(x=>Number(x.location_id)===Number(lot.locationId)&&unassignedForLot(Number(x.product_id),Number(x.location_id))>0).map(x=><option key={x.product_id} value={x.product_id}>{x.product_name} · {unassignedForLot(Number(x.product_id),Number(x.location_id))} unassigned</option>)}</select></Field>
    <Field label="Batch / lot number"><input className="control" value={lot.lotNo} onChange={e=>setLot({...lot,lotNo:e.target.value})}/></Field>
    <Field label="Expiry date"><input type="date" className="control" value={lot.expiryDate} onChange={e=>setLot({...lot,expiryDate:e.target.value})}/></Field>
    <Field label="Quantity in this batch"><input className="control" inputMode="decimal" value={lot.qty} onChange={e=>setLot({...lot,qty:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
    <Field label={'Unit cost ('+currency+')'}><input className="control" inputMode="decimal" value={lot.unitCost} onChange={e=>setLot({...lot,unitCost:e.target.value.replace(/[^0-9.]/g,'')})}/></Field>
    <Field label="Supplier"><select className="control" value={lot.supplierId} onChange={e=>setLot({...lot,supplierId:e.target.value})}><option value="">Not specified</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
   </div>
   <button onClick={assignLot} disabled={busy||!lot.productId||!lot.locationId||!lot.lotNo.trim()||!(Number(lot.qty)>0)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Assign Batch to Existing Stock</button>
  </Modal>}

  {reorderOpen&&<Modal title="Set Reorder Level" onClose={()=>!busy&&setReorderOpen(null)} size="sm">
   <div className="rounded-xl bg-slate-50 p-3 text-[11px]"><b>{reorderOpen.product_name}</b><div className="mt-1 text-slate-500">{reorderOpen.branch_name} · {reorderOpen.location_name}</div></div>
   <Field label="Alert me when stock reaches"><input className="control" inputMode="decimal" value={reorderLevel} onChange={e=>setReorderLevel(e.target.value.replace(/[^0-9.]/g,''))}/></Field>
   <button onClick={saveReorder} disabled={busy} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white">Save Reorder Level</button>
  </Modal>}

  {batchOpen&&<Modal title="Prepare with Recipe" onClose={()=>!busy&&setBatchOpen(false)} size="md">
   <div className="grid gap-3 sm:grid-cols-2"><Field label="Recipe"><select className="control" value={batch.recipeId} onChange={e=>setBatch({...batch,recipeId:e.target.value})}><option value="">Choose recipe</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name} · {r.product_name}</option>)}</select></Field><Field label="Location"><select className="control" value={batch.locationId} onChange={e=>setBatch({...batch,locationId:e.target.value})}><option value="">Choose location</option>{loc.map(x=><option key={x.id} value={x.id}>{x.branch_name} · {x.name}</option>)}</select></Field><Field label="Finished portions / yield"><input className="control" inputMode="decimal" value={batch.actualYield} onChange={e=>setBatch({...batch,actualYield:e.target.value.replace(/[^0-9.]/g,'')})}/></Field><Field label="Note"><input className="control" value={batch.notes} onChange={e=>setBatch({...batch,notes:e.target.value})}/></Field></div>
   <button onClick={async()=>{setBusy(true);try{await api('/inventory/recipe-batches',{method:'POST',body:JSON.stringify({recipeId:Number(batch.recipeId),locationId:Number(batch.locationId),actualYield:Number(batch.actualYield||0),notes:batch.notes.trim()||null})});setBatchOpen(false);setBatch({recipeId:'',locationId:'',actualYield:'',notes:''});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}} disabled={busy||!batch.recipeId||!batch.locationId||!(Number(batch.actualYield)>0)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Prepare & Add Stock</button>
  </Modal>}
 </div>
}

function movementName(v:string){return ({opening_stock:'Opening stock',purchase_receipt:'Supplier receipt',sale_consumption:'Sold',refund_return:'Customer return',transfer_out:'Moved out',transfer_in:'Moved in',count_adjustment:'Count correction',adjustment:'Stock correction',wastage:'Wasted / damaged',spoilage:'Expired / spoiled',recipe_batch_consumption:'Used in kitchen prep',recipe_batch_output:'Prepared with recipe',prepared_stock:'Prepared / refilled',lot_assignment:'Batch assigned'} as any)[v]||nice(v)}
function Quick({icon:Icon,title,sub,onClick}:{icon:any;title:string;sub:string;onClick:()=>void}){return <button onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[var(--brand-border)] hover:shadow-md"><div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)]"><Icon size={17}/></div><div className="mt-3 text-[12px] font-bold text-slate-800">{title}</div><div className="mt-1 text-[10.5px] leading-4 text-slate-500">{sub}</div></button>}
function Field({label,children}:{label:string;children:any}){return <label className="mt-3 block text-[12px] font-medium text-slate-700">{label}{children}</label>}
function SearchBox({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="relative hidden sm:block"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Search stock" className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[11px] outline-none focus:border-[var(--brand-primary)]"/></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-[11px] text-slate-400">{text}</div>}
