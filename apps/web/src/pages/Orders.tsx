import { useEffect, useMemo, useState } from 'react'
import { Plus, Send, Pause, Play, ArrowRightLeft, Ban } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Badge, Loading, Modal } from '../components'

type OrderDraft={branchId:number;orderType:string;tableId:number;customerId:number;guestCount:number;waiterUserId:number;reservationId:number;notes:string}

export default function Orders({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 const [newOpen,setNewOpen]=useState(false),[detail,setDetail]=useState<any>(null),[detailOpen,setDetailOpen]=useState(false)
 const [branches,setBranches]=useState<any[]>([]),[tables,setTables]=useState<any[]>([]),[staff,setStaff]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[reservations,setReservations]=useState<any[]>([])
 const [draft,setDraft]=useState<OrderDraft>({branchId:0,orderType:'dine_in',tableId:0,customerId:0,guestCount:1,waiterUserId:0,reservationId:0,notes:''})
 const [menu,setMenu]=useState<any[]>([]),[mods,setMods]=useState<any[]>([]),[addOpen,setAddOpen]=useState(false),[selectedProduct,setSelectedProduct]=useState<number>(0),[menuDetail,setMenuDetail]=useState<any>(null),[variantId,setVariantId]=useState<number>(0),[modifierIds,setModifierIds]=useState<number[]>([]),[qty,setQty]=useState(1),[itemNotes,setItemNotes]=useState('')
 const [transferOpen,setTransferOpen]=useState(false),[cancelOpen,setCancelOpen]=useState(false),[cancelReason,setCancelReason]=useState(''),[urgent,setUrgent]=useState(false),[transferTable,setTransferTable]=useState(0)

 const load=()=>api('/restaurant/orders?status=active').then(setRows)
 useEffect(()=>{load()},[])

 async function openNew(){
   const [b,t,s,c,r]=await Promise.all([api('/branches'),api('/restaurant/tables'),api('/staff'),api('/customers'),api('/restaurant/reservations')])
   setBranches(b);setTables(t);setStaff(s);setCustomers(c);setReservations(r)
   setDraft({branchId:Number(b[0]?.id||0),orderType:'dine_in',tableId:0,customerId:0,guestCount:1,waiterUserId:0,reservationId:0,notes:''});setNewOpen(true)
 }
 async function createOrder(){
   if(draft.orderType==='dine_in'&&!draft.tableId)return
   const o=await api('/restaurant/orders',{method:'POST',body:JSON.stringify({...draft,tableId:draft.tableId||null,customerId:draft.customerId||null,waiterUserId:draft.waiterUserId||null,reservationId:draft.reservationId||null})})
   setNewOpen(false);await load();await openOrder(Number(o.id))
 }
 async function openOrder(id:number){
   const [d,m,g,t]=await Promise.all([api('/restaurant/orders/'+id),api('/restaurant/orders/'+id).then((x:any)=>api('/menu/available?branchId='+x.order.branch_id+'&orderType='+x.order.order_type)),api('/menu/modifier-groups'),api('/restaurant/tables')])
   setDetail(d);setMenu(m);setMods(g);setTables(t);setDetailOpen(true)
 }
 async function refreshDetail(){if(detail?.order?.id)await openOrder(Number(detail.order.id))}
 async function chooseProduct(id:number){
   setSelectedProduct(id);setVariantId(0);setModifierIds([])
   const p=menu.find(x=>Number(x.id)===id)
   setMenuDetail(p?.menu_item_id?await api('/menu/items/'+p.menu_item_id):null)
 }
 const activeGroups=useMemo(()=>{const ids=new Set((menuDetail?.modifierGroupIds||[]).map(Number));return mods.filter(g=>ids.has(Number(g.id)))},[menuDetail,mods])
 async function addItem(){
   if(!selectedProduct||!(qty>0))return
   await api('/restaurant/orders/'+detail.order.id+'/items',{method:'POST',body:JSON.stringify({productId:selectedProduct,qty,variantId:variantId||null,modifierIds,notes:itemNotes})})
   setAddOpen(false);setSelectedProduct(0);setMenuDetail(null);setVariantId(0);setModifierIds([]);setQty(1);setItemNotes('');await refreshDetail()
 }
 async function sendKitchen(){
   await api('/restaurant/orders/'+detail.order.id+'/send-kitchen',{method:'POST',body:JSON.stringify({priority:'normal'})});await refreshDetail();await load()
 }
 async function holdResume(){
   const action=detail.order.held?'resume':'hold';await api('/restaurant/orders/'+detail.order.id+'/'+action,{method:'POST',body:'{}'});await refreshDetail();await load()
 }
 async function requestBill(){await api('/restaurant/orders/'+detail.order.id+'/transition',{method:'POST',body:JSON.stringify({status:'bill_requested',comment:'Bill requested from premium POS'})});await refreshDetail();await load()}
 async function doTransfer(){if(!transferTable)return;await api('/restaurant/orders/'+detail.order.id+'/transfer',{method:'POST',body:JSON.stringify({toTableId:transferTable,notes:'Transferred from premium POS'})});setTransferOpen(false);await refreshDetail();await load()}
 async function requestCancel(){if(!cancelReason.trim())return;await api('/restaurant/orders/'+detail.order.id+'/request-cancel',{method:'POST',body:JSON.stringify({comment:cancelReason,urgent})});setCancelOpen(false);setCancelReason('');setUrgent(false)}

 if(!rows)return <Loading/>
 const availableTables=tables.filter(t=>['available','reserved'].includes(t.status))
 const hasNew=detail?.items?.some((x:any)=>x.status==='new')

 return <div>
  <PageHeading eyebrow="Front of house" title="Restaurant Orders" sub="Open tables, tabs, waiters, covers and live service status." action={<button onClick={openNew} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>New Order</button>}/>
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">{rows.map(o=><div key={o.id} className={'rounded-2xl border bg-white p-5 premium-shadow '+(o.held?'border-amber-300':'border-slate-200')}><div className="flex justify-between gap-3"><div><b>{o.order_no}</b><div className="text-xs text-slate-400 mt-1">{nice(o.order_type)} {o.table_name&&'· '+o.table_name}</div></div><Badge tone={o.status==='ready'?'green':o.status==='preparing'?'amber':'blue'}>{nice(o.status)}</Badge></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400">Guests</span><b className="block text-base mt-1">{o.guest_count}</b></div><div className="bg-slate-50 rounded-xl p-3"><span className="text-slate-400">Waiter</span><b className="block truncate mt-1">{o.waiter_name||'Unassigned'}</b></div></div><div className="mt-4 flex justify-between items-end"><div><span className="text-xs text-slate-400">Order total</span><div className="font-black">{money(o.total,currency)}</div></div><button onClick={()=>openOrder(Number(o.id))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:border-emerald-400">Open</button></div></div>)}</div>

  {newOpen&&<Modal title="Open Restaurant Order" onClose={()=>setNewOpen(false)}>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Order type"><select value={draft.orderType} onChange={e=>setDraft({...draft,orderType:e.target.value,tableId:e.target.value==='dine_in'?draft.tableId:0})} className="control"><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option><option value="delivery">Delivery</option><option value="counter">Counter</option></select></Field>
      <Field label="Branch"><select value={draft.branchId} onChange={e=>setDraft({...draft,branchId:Number(e.target.value)})} className="control">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      {draft.orderType==='dine_in'&&<Field label="Table"><select value={draft.tableId} onChange={e=>setDraft({...draft,tableId:Number(e.target.value)})} className="control"><option value="0">Choose table</option>{tables.filter(t=>Number(t.branch_id)===draft.branchId&&['available','reserved'].includes(t.status)).map(t=><option key={t.id} value={t.id}>{t.area_name||'Floor'} · {t.name} ({t.capacity})</option>)}</select></Field>}
      <Field label="Guests / covers"><input type="number" min="1" value={draft.guestCount} onChange={e=>setDraft({...draft,guestCount:Number(e.target.value)})} className="control"/></Field>
      <Field label="Waiter"><select value={draft.waiterUserId} onChange={e=>setDraft({...draft,waiterUserId:Number(e.target.value)})} className="control"><option value="0">Unassigned</option>{staff.map(s=><option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select></Field>
      <Field label="Customer"><select value={draft.customerId} onChange={e=>setDraft({...draft,customerId:Number(e.target.value)})} className="control"><option value="0">Walk-in</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Reservation"><select value={draft.reservationId} onChange={e=>setDraft({...draft,reservationId:Number(e.target.value)})} className="control"><option value="0">None</option>{reservations.filter(r=>r.status==='reserved').map(r=><option key={r.id} value={r.id}>{new Date(r.reserved_at).toLocaleString()} · {r.guest_name||r.customer_name||'Guest'}</option>)}</select></Field>
    </div>
    <textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} className="control mt-3 min-h-20" placeholder="Order notes"/>
    <button onClick={createOrder} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold">Open Order</button>
  </Modal>}

  {detailOpen&&detail&&<Modal title={detail.order.order_no+' · '+nice(detail.order.status)} onClose={()=>setDetailOpen(false)}>
    <div className="flex flex-wrap gap-2 mb-4"><Badge tone="blue">{nice(detail.order.order_type)}</Badge>{detail.order.table_name&&<Badge>{detail.order.table_name}</Badge>}<Badge>{detail.order.guest_count} guests</Badge>{detail.order.held&&<Badge tone="amber">Held</Badge>}</div>
    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">{detail.items.length?detail.items.map((x:any)=><div key={x.id} className="py-3 flex justify-between gap-3"><div><b className="text-sm">{Number(x.qty)} × {x.product_name}{x.variant_name?' · '+x.variant_name:''}</b>{x.modifiers?.length>0&&<div className="text-xs text-slate-400 mt-1">{x.modifiers.map((m:any)=>m.name).join(', ')}</div>}{x.notes&&<div className="text-xs text-amber-700 mt-1">{x.notes}</div>}</div><div className="text-right"><Badge tone={x.status==='ready'?'green':x.status==='preparing'?'amber':'slate'}>{nice(x.status)}</Badge><div className="text-sm font-bold mt-1">{money(Number(x.line_total)+(x.modifiers||[]).reduce((n:number,m:any)=>n+Number(m.price||0)*Number(m.qty||1),0),currency)}</div></div></div>):<div className="py-8 text-center text-sm text-slate-400">No items yet.</div>}</div>
    <div className="mt-4 rounded-xl bg-slate-950 text-white p-4 flex justify-between items-end"><div><div className="text-xs text-slate-400">Order total</div><div className="text-2xl font-black">{money(detail.order.total,currency)}</div></div><button onClick={()=>setAddOpen(true)} className="rounded-lg bg-emerald-400 text-slate-950 px-4 py-2 text-sm font-bold">+ Add Item</button></div>
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {hasNew&&<Action onClick={sendKitchen} icon={Send} label="Send Kitchen"/>}
      <Action onClick={holdResume} icon={detail.order.held?Play:Pause} label={detail.order.held?'Resume':'Hold'}/>
      {detail.order.order_type==='dine_in'&&<Action onClick={()=>{setTransferTable(Number(availableTables[0]?.id||0));setTransferOpen(true)}} icon={ArrowRightLeft} label="Transfer"/>}
      {detail.order.status==='served'&&<Action onClick={requestBill} icon={ReceiptIcon} label="Request Bill"/>}
      <Action onClick={()=>setCancelOpen(true)} icon={Ban} label="Request Cancel" danger/>
    </div>
    <div className="mt-4 border-t border-slate-100 pt-3"><div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">History</div>{detail.history.slice(0,6).map((h:any)=><div key={h.id} className="flex justify-between gap-3 py-1.5 text-xs"><span className="text-slate-400">{new Date(h.created_at).toLocaleString()}</span><b>{nice(h.to_status)}</b></div>)}</div>
  </Modal>}

  {addOpen&&detail&&<Modal title="Add Item to Order" onClose={()=>setAddOpen(false)}>
    <Field label="Menu item"><select value={selectedProduct} onChange={e=>chooseProduct(Number(e.target.value))} className="control"><option value="0">Choose item</option>{menu.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.resolved_price,currency)}</option>)}</select></Field>
    {menuDetail?.variants?.length>0&&<Field label="Variant"><select value={variantId} onChange={e=>setVariantId(Number(e.target.value))} className="control"><option value="0">Standard</option>{menuDetail.variants.map((v:any)=><option key={v.id} value={v.id}>{v.name}{Number(v.price_delta)?' · '+money(v.price_delta,currency):''}</option>)}</select></Field>}
    {activeGroups.map((g:any)=><div key={g.id} className="mt-3 rounded-xl border border-slate-200 p-3"><div className="flex justify-between"><b className="text-sm">{g.name}{g.required?' *':''}</b><span className="text-xs text-slate-400">Choose {g.min_select}–{g.max_select}</span></div><div className="mt-2 grid gap-2">{g.modifiers.map((m:any)=><label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modifierIds.includes(Number(m.id))} onChange={e=>setModifierIds(v=>e.target.checked?[...v,Number(m.id)]:v.filter(id=>id!==Number(m.id)))}/>{m.name}{Number(m.price)?' · +'+money(m.price,currency):''}</label>)}</div></div>)}
    <div className="grid grid-cols-2 gap-3 mt-3"><Field label="Quantity"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="control"/></Field><Field label="Item notes"><input value={itemNotes} onChange={e=>setItemNotes(e.target.value)} className="control" placeholder="No onions…"/></Field></div>
    <button onClick={addItem} disabled={!selectedProduct} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold disabled:opacity-40">Add to Order</button>
  </Modal>}

  {transferOpen&&<Modal title="Transfer Table" onClose={()=>setTransferOpen(false)}><Field label="Destination table"><select value={transferTable} onChange={e=>setTransferTable(Number(e.target.value))} className="control">{availableTables.map(t=><option key={t.id} value={t.id}>{t.area_name||'Floor'} · {t.name}</option>)}</select></Field><button onClick={doTransfer} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold">Transfer Order</button></Modal>}

  {cancelOpen&&<Modal title="Request Order Cancellation" onClose={()=>setCancelOpen(false)}><p className="text-sm text-slate-500">Cancellation does not happen until management approves it.</p><textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} className="control mt-4 min-h-28" placeholder="Reason for cancellation"/><label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Mark as urgent</label><button onClick={requestCancel} disabled={!cancelReason.trim()} className="mt-4 w-full rounded-xl bg-red-600 text-white py-3 font-bold disabled:opacity-40">Submit Cancellation Request</button></Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
function Action({onClick,icon:Icon,label,danger=false}:{onClick:()=>void;icon:any;label:string;danger?:boolean}){return <button onClick={onClick} className={'rounded-xl border px-3 py-2.5 text-xs font-bold flex items-center justify-center gap-2 '+(danger?'border-red-200 text-red-600':'border-slate-200 text-slate-700')}><Icon size={15}/>{label}</button>}
function ReceiptIcon({size=15}:{size?:number}){return <span style={{fontSize:size}}>🧾</span>}
