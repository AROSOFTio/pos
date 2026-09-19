import { useEffect, useMemo, useState } from 'react'
import { Plus, Send, Pause, Play, ArrowRightLeft, Ban, CheckCircle2, Printer, Share2, SlidersHorizontal } from 'lucide-react'
import { api, money, nice, openPdf, printPdf, sharePdf } from '../api'
import { PageHeading, Badge, Loading, Modal } from '../components'
import PaymentModal, { type PaymentLine } from '../components/PaymentModal'

type OrderDraft={branchId:number;orderType:string;tableId:number;customerId:number;guestCount:number;waiterUserId:number;reservationId:number;notes:string}

export default function Orders({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 const [newOpen,setNewOpen]=useState(false),[detail,setDetail]=useState<any>(null),[detailOpen,setDetailOpen]=useState(false)
 const [branches,setBranches]=useState<any[]>([]),[tables,setTables]=useState<any[]>([]),[staff,setStaff]=useState<any[]>([]),[customers,setCustomers]=useState<any[]>([]),[reservations,setReservations]=useState<any[]>([])
 const [draft,setDraft]=useState<OrderDraft>({branchId:0,orderType:'dine_in',tableId:0,customerId:0,guestCount:1,waiterUserId:0,reservationId:0,notes:''})
 const [menu,setMenu]=useState<any[]>([]),[mods,setMods]=useState<any[]>([]),[addOpen,setAddOpen]=useState(false),[selectedProduct,setSelectedProduct]=useState<number>(0),[menuDetail,setMenuDetail]=useState<any>(null),[variantId,setVariantId]=useState<number>(0),[modifierIds,setModifierIds]=useState<number[]>([]),[qty,setQty]=useState(1),[itemNotes,setItemNotes]=useState('')
 const [transferOpen,setTransferOpen]=useState(false),[cancelOpen,setCancelOpen]=useState(false),[cancelReason,setCancelReason]=useState(''),[urgent,setUrgent]=useState(false),[transferTable,setTransferTable]=useState(0)
 const [paymentOpen,setPaymentOpen]=useState(false),[paymentBusy,setPaymentBusy]=useState(false),[bill,setBill]=useState<any>(null)
 const [depositOpen,setDepositOpen]=useState(false),[depositBusy,setDepositBusy]=useState(false)
 const [chargesOpen,setChargesOpen]=useState(false),[chargesBusy,setChargesBusy]=useState(false),[taxRate,setTaxRate]=useState(0),[serviceRate,setServiceRate]=useState(0),[tip,setTip]=useState(0),[taxInclusive,setTaxInclusive]=useState(false)
 const [adjustType,setAdjustType]=useState<'discount'|'foc'>('discount'),[adjustAmount,setAdjustAmount]=useState(0),[adjustPercent,setAdjustPercent]=useState(0),[adjustReason,setAdjustReason]=useState(''),[adjustUrgent,setAdjustUrgent]=useState(false),[adjustMessage,setAdjustMessage]=useState('')
 const [receiptActions,setReceiptActions]=useState<{id:number;orderNo:string}|null>(null)

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
   const out=await api('/restaurant/orders/'+detail.order.id+'/send-kitchen',{method:'POST',body:JSON.stringify({priority:'normal'})})
   await refreshDetail();await load()
   const tickets=Array.isArray(out?.tickets)?out.tickets:[]
   for(const t of tickets)await printPdf('/documents/kitchen-ticket/'+t.id+'/pdf')
 }
 async function holdResume(){
   const action=detail.order.held?'resume':'hold';await api('/restaurant/orders/'+detail.order.id+'/'+action,{method:'POST',body:'{}'});await refreshDetail();await load()
 }
 async function requestBill(){await api('/restaurant/orders/'+detail.order.id+'/transition',{method:'POST',body:JSON.stringify({status:'bill_requested',comment:'Bill requested from premium POS'})});await refreshDetail();await load()}
 async function openBillPayment(){if(!detail?.order?.id)return;const b=await api('/restaurant/orders/'+detail.order.id+'/bill');setBill(b);setPaymentOpen(true)}
 async function submitBillPayment(lines:Omit<PaymentLine,'id'>[]){if(!detail?.order?.id)return;setPaymentBusy(true);try{const orderId=Number(detail.order.id),orderNo=String(detail.order.order_no||'ORDER');const out=await api('/restaurant/orders/'+orderId+'/payments',{method:'POST',body:JSON.stringify({payments:lines})});setPaymentOpen(false);setBill(null);await refreshDetail();await load();if(out.order?.status==='paid'){setDetail((d:any)=>d?{...d,order:{...d.order,...out.order}}:d);setReceiptActions({id:orderId,orderNo})}}finally{setPaymentBusy(false)}}
 async function submitDeposit(lines:Omit<PaymentLine,'id'>[]){if(!detail?.order?.id)return;setDepositBusy(true);try{await api('/restaurant/orders/'+detail.order.id+'/deposits',{method:'POST',body:JSON.stringify({payments:lines})});setDepositOpen(false);await refreshDetail();await load()}finally{setDepositBusy(false)}}
 async function openCharges(){
   if(!detail?.order)return
   const settings=await api('/document-settings')
   setTaxRate(Number(detail.order.tax_rate??settings.default_tax_rate??0))
   setServiceRate(Number(detail.order.service_charge_rate??settings.default_service_charge_rate??0))
   setTip(Number(detail.order.tip||0))
   setTaxInclusive(detail.order.tax_inclusive===true||detail.order.tax_inclusive==='true'?true:!!settings.tax_inclusive)
   setAdjustType('discount');setAdjustAmount(0);setAdjustPercent(0);setAdjustReason('');setAdjustUrgent(false);setAdjustMessage('')
   setChargesOpen(true)
 }
 async function saveCharges(){
   if(!detail?.order?.id)return
   setChargesBusy(true)
   try{
     await api('/restaurant/orders/'+detail.order.id+'/charges',{method:'PUT',body:JSON.stringify({taxRate,serviceRate,tip,taxInclusive})})
     await refreshDetail();await load();setAdjustMessage('Charges updated successfully.')
   }finally{setChargesBusy(false)}
 }
 async function requestAdjustment(){
   if(!detail?.order?.id||!adjustReason.trim())return
   if(adjustType==='discount'&&!(adjustAmount>0||adjustPercent>0))return
   setChargesBusy(true)
   try{
     const out=await api('/transaction-adjustments/request',{method:'POST',body:JSON.stringify({
       sourceType:'restaurant_order',sourceId:Number(detail.order.id),adjustmentType:adjustType,
       requestedAmount:adjustType==='discount'?adjustAmount:0,requestedPercent:adjustType==='discount'?adjustPercent:0,
       reason:adjustReason,urgent:adjustUrgent
     })})
     setAdjustMessage((adjustType==='foc'?'FOC':'Discount')+' request '+out.adjustment.reference_no+' sent to management for approval.')
     setAdjustAmount(0);setAdjustPercent(0);setAdjustReason('');setAdjustUrgent(false)
   }finally{setChargesBusy(false)}
 }
 async function closePaidOrder(){if(!detail?.order?.id)return;await api('/restaurant/orders/'+detail.order.id+'/transition',{method:'POST',body:JSON.stringify({status:'closed',comment:'Order closed after full settlement'})});setDetailOpen(false);await load()}
 async function chargeBalanceToCredit(){if(!detail?.order?.id)return;setPaymentBusy(true);try{await api('/restaurant/orders/'+detail.order.id+'/credit',{method:'POST',body:'{}'});await refreshDetail();await load()}finally{setPaymentBusy(false)}}
 async function doTransfer(){if(!transferTable)return;await api('/restaurant/orders/'+detail.order.id+'/transfer',{method:'POST',body:JSON.stringify({toTableId:transferTable,notes:'Transferred from premium POS'})});setTransferOpen(false);await refreshDetail();await load()}
 async function requestCancel(){if(!cancelReason.trim())return;await api('/restaurant/orders/'+detail.order.id+'/request-cancel',{method:'POST',body:JSON.stringify({comment:cancelReason,urgent})});setCancelOpen(false);setCancelReason('');setUrgent(false)}

 if(!rows)return <Loading/>
 const availableTables=tables.filter(t=>['available','reserved'].includes(t.status))
 const hasNew=detail?.items?.some((x:any)=>x.status==='new')

 return <div>
  <PageHeading eyebrow="Front of house" title="Restaurant Orders" sub="Live tables, service status and bills." action={<button onClick={openNew} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"><Plus size={16} className="inline mr-1"/>New Order</button>}/>
  <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">{rows.map(o=><div key={o.id} className={'rounded-xl border bg-white p-4 premium-shadow '+(o.held?'border-amber-300':'border-slate-200')}><div className="flex justify-between gap-3"><div><b>{o.order_no}</b><div className="text-xs text-slate-400 mt-1">{nice(o.order_type)} {o.table_name&&'· '+o.table_name}</div></div><Badge tone={o.status==='ready'?'green':o.status==='preparing'?'amber':'blue'}>{nice(o.status)}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-lg bg-slate-50 p-2.5"><span className="text-slate-400">Guests</span><b className="block text-base mt-1">{o.guest_count}</b></div><div className="rounded-lg bg-slate-50 p-2.5"><span className="text-slate-400">Waiter</span><b className="block truncate mt-1">{o.waiter_name||'Unassigned'}</b></div></div><div className="mt-3 flex items-end justify-between"><div><span className="text-xs text-slate-400">Order total</span><div className="font-semibold">{money(o.total,currency)}</div></div><button onClick={()=>openOrder(Number(o.id))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:border-[var(--brand-border)]">Open</button></div></div>)}</div>

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
    <button onClick={createOrder} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium">Open Order</button>
  </Modal>}

  {detailOpen&&detail&&<Modal title={detail.order.order_no+' · '+nice(detail.order.status)} onClose={()=>setDetailOpen(false)} size="lg">
    <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="blue">{nice(detail.order.order_type)}</Badge>{detail.order.table_name&&<Badge>{detail.order.table_name}</Badge>}<Badge>{detail.order.guest_count} guests</Badge>{detail.order.held&&<Badge tone="amber">Held</Badge>}</div>
    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">{detail.items.length?detail.items.map((x:any)=><div key={x.id} className="py-3 flex justify-between gap-3"><div><b className="text-sm">{Number(x.qty)} × {x.product_name}{x.variant_name?' · '+x.variant_name:''}</b>{x.modifiers?.length>0&&<div className="text-xs text-slate-400 mt-1">{x.modifiers.map((m:any)=>m.name).join(', ')}</div>}{x.notes&&<div className="text-xs text-amber-700 mt-1">{x.notes}</div>}</div><div className="text-right"><Badge tone={x.status==='ready'?'green':x.status==='preparing'?'amber':'slate'}>{nice(x.status)}</Badge><div className="text-sm font-medium mt-1">{money(Number(x.line_total)+(x.modifiers||[]).reduce((n:number,m:any)=>n+Number(m.price||0)*Number(m.qty||1),0),currency)}</div></div></div>):<div className="py-8 text-center text-sm text-slate-400">No items yet.</div>}</div>
    <div className="mt-4 rounded-xl bg-slate-900 text-white p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-slate-400">Subtotal</span><span className="text-right">{money(detail.order.subtotal,currency)}</span>
        {Number(detail.order.discount||0)>0&&<><span className="text-slate-400">Discount</span><span className="text-right text-emerald-300">− {money(detail.order.discount,currency)}</span></>}
        {Number(detail.order.service_charge||0)>0&&<><span className="text-slate-400">Service charge</span><span className="text-right">{money(detail.order.service_charge,currency)}</span></>}
        {Number(detail.order.tax||0)>0&&<><span className="text-slate-400">Tax {detail.order.tax_inclusive?'(inclusive)':''}</span><span className="text-right">{money(detail.order.tax,currency)}</span></>}
        {Number(detail.order.tip||0)>0&&<><span className="text-slate-400">Tip</span><span className="text-right">{money(detail.order.tip,currency)}</span></>}
      </div>
      <div className="mt-3 flex justify-between items-end border-t border-white/10 pt-3">
        <div><div className="text-xs text-slate-400">Order total</div><div className="text-2xl font-semibold">{money(detail.order.total,currency)}</div>{Number(detail.order.amount_paid||0)>0&&<div className="mt-1 text-xs text-emerald-300">{money(detail.order.amount_paid,currency)} paid · {money(detail.order.balance_due,currency)} due</div>}</div>
        {!['bill_requested','partially_paid','paid','closed'].includes(detail.order.status)&&<button onClick={()=>setAddOpen(true)} className="rounded-lg bg-[var(--brand-primary)] text-white px-4 py-2 text-sm font-medium">+ Add Item</button>}
      </div>
    </div>
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {hasNew&&<Action onClick={sendKitchen} icon={Send} label="Send & Print KOT"/>}
      <Action onClick={holdResume} icon={detail.order.held?Play:Pause} label={detail.order.held?'Resume':'Hold'}/>
      {detail.order.order_type==='dine_in'&&<Action onClick={()=>{setTransferTable(Number(availableTables[0]?.id||0));setTransferOpen(true)}} icon={ArrowRightLeft} label="Transfer"/>}
      {!['bill_requested','partially_paid','paid','closed','cancelled'].includes(detail.order.status)&&<Action onClick={openCharges} icon={SlidersHorizontal} label="Charges / Discount"/>}
      {['open','sent_to_kitchen','preparing','ready','served'].includes(detail.order.status)&&Number(detail.order.balance_due??detail.order.total)>0.005&&<Action onClick={()=>setDepositOpen(true)} icon={ReceiptIcon} label={Number(detail.order.amount_paid||0)>0?'Add Deposit':'Take Deposit'}/>}
      {detail.order.status==='served'&&<Action onClick={requestBill} icon={ReceiptIcon} label="Request Bill"/>}
      {['bill_requested','partially_paid'].includes(detail.order.status)&&<Action onClick={openBillPayment} icon={ReceiptIcon} label={detail.order.status==='partially_paid'?'Pay Balance':'Take Payment'}/>}
      {['bill_requested','partially_paid'].includes(detail.order.status)&&detail.order.customer_id&&Number(detail.order.balance_due||0)>0.005&&<Action onClick={chargeBalanceToCredit} icon={CheckCircle2} label="Charge Balance to Credit"/>}
      <Action onClick={()=>openPdf('/documents/order/'+detail.order.id+'/pdf?type=proforma&paper=A4')} icon={ReceiptIcon} label="A4 Proforma"/>
      {!['paid','closed','cancelled'].includes(detail.order.status)&&<Action onClick={()=>openPdf('/documents/order/'+detail.order.id+'/pdf?type=interim&paper=80mm')} icon={ReceiptIcon} label="Preview Bill / Receipt"/>}
      {['paid','closed'].includes(detail.order.status)&&<Action onClick={()=>openPdf('/documents/order/'+detail.order.id+'/pdf?type=invoice&paper=A4')} icon={ReceiptIcon} label="Invoice"/>}
      <Action onClick={()=>sharePdf('/documents/order/'+detail.order.id+'/pdf?type='+( ['paid','closed'].includes(detail.order.status)?'invoice':'proforma')+'&paper=A4',detail.order.order_no+'.pdf')} icon={ReceiptIcon} label="Share PDF"/>
      {detail.order.status==='paid'&&<Action onClick={closePaidOrder} icon={CheckCircle2} label="Close Order"/>}
      {!['paid','closed'].includes(detail.order.status)&&<Action onClick={()=>setCancelOpen(true)} icon={Ban} label="Request Cancel" danger/>}
    </div>
    <div className="mt-4 border-t border-slate-100 pt-3"><div className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">History</div>{detail.history.slice(0,6).map((h:any)=><div key={h.id} className="flex justify-between gap-3 py-1.5 text-xs"><span className="text-slate-400">{new Date(h.created_at).toLocaleString()}</span><b>{nice(h.to_status)}</b></div>)}</div>
  </Modal>}

  {addOpen&&detail&&<Modal title="Add Item to Order" onClose={()=>setAddOpen(false)}>
    <Field label="Menu item"><select value={selectedProduct} onChange={e=>chooseProduct(Number(e.target.value))} className="control"><option value="0">Choose item</option>{menu.map(p=><option key={p.id} value={p.id}>{p.name} · {money(p.resolved_price,currency)}</option>)}</select></Field>
    {menuDetail?.variants?.length>0&&<Field label="Variant"><select value={variantId} onChange={e=>setVariantId(Number(e.target.value))} className="control"><option value="0">Standard</option>{menuDetail.variants.map((v:any)=><option key={v.id} value={v.id}>{v.name}{Number(v.price_delta)?' · '+money(v.price_delta,currency):''}</option>)}</select></Field>}
    {activeGroups.map((g:any)=><div key={g.id} className="mt-3 rounded-xl border border-slate-200 p-3"><div className="flex justify-between"><b className="text-sm">{g.name}{g.required?' *':''}</b><span className="text-xs text-slate-400">Choose {g.min_select}–{g.max_select}</span></div><div className="mt-2 grid gap-2">{g.modifiers.map((m:any)=><label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={modifierIds.includes(Number(m.id))} onChange={e=>setModifierIds(v=>e.target.checked?[...v,Number(m.id)]:v.filter(id=>id!==Number(m.id)))}/>{m.name}{Number(m.price)?' · +'+money(m.price,currency):''}</label>)}</div></div>)}
    <div className="grid grid-cols-2 gap-3 mt-3"><Field label="Quantity"><input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="control"/></Field><Field label="Item notes"><input value={itemNotes} onChange={e=>setItemNotes(e.target.value)} className="control" placeholder="No onions…"/></Field></div>
    <button onClick={addItem} disabled={!selectedProduct} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium disabled:opacity-40">Add to Order</button>
  </Modal>}


  {chargesOpen&&detail&&<Modal title="Charges & Adjustments" onClose={()=>setChargesOpen(false)}>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Tax rate (%)"><input className="control" type="number" min="0" step="0.01" value={taxRate} onChange={e=>setTaxRate(Number(e.target.value))}/></Field>
      <Field label="Tax mode"><select className="control" value={taxInclusive?'inclusive':'exclusive'} onChange={e=>setTaxInclusive(e.target.value==='inclusive')}><option value="exclusive">Exclusive · add to bill</option><option value="inclusive">Inclusive · included in price</option></select></Field>
      <Field label="Service charge (%)"><input className="control" type="number" min="0" step="0.01" value={serviceRate} onChange={e=>setServiceRate(Number(e.target.value))}/></Field>
      <Field label="Tip"><input className="control" type="number" min="0" step="0.01" value={tip} onChange={e=>setTip(Number(e.target.value))}/></Field>
    </div>
    <button onClick={saveCharges} disabled={chargesBusy} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-medium text-white disabled:opacity-40">{chargesBusy?'Saving…':'Save Tax / Service / Tip'}</button>

    <div className="my-5 h-px bg-slate-200"/>
    <div className="text-[11px] font-medium uppercase tracking-[.14em] text-slate-400">Management-controlled adjustment</div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button onClick={()=>setAdjustType('discount')} className={'rounded-xl border px-3 py-2.5 text-sm font-medium '+(adjustType==='discount'?'border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]':'border-slate-200')}>Discount</button>
      <button onClick={()=>setAdjustType('foc')} className={'rounded-xl border px-3 py-2.5 text-sm font-medium '+(adjustType==='foc'?'border-[var(--brand-primary)] bg-[var(--brand-soft)] text-[var(--brand-primary)]':'border-slate-200')}>FOC / Complimentary</button>
    </div>
    {adjustType==='discount'&&<div className="mt-3 grid grid-cols-2 gap-3">
      <Field label="Fixed amount"><input className="control" type="number" min="0" step="0.01" value={adjustAmount||''} onChange={e=>{setAdjustAmount(Number(e.target.value));if(Number(e.target.value)>0)setAdjustPercent(0)}} placeholder="Amount"/></Field>
      <Field label="Or percent (%)"><input className="control" type="number" min="0" max="100" step="0.01" value={adjustPercent||''} onChange={e=>{setAdjustPercent(Number(e.target.value));if(Number(e.target.value)>0)setAdjustAmount(0)}} placeholder="%"/></Field>
    </div>}
    <label className="mt-3 block text-[13px] font-medium text-slate-700">Reason<textarea className="control min-h-20" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Why is this adjustment required?"/></label>
    <label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-[13px] font-medium text-amber-800"><input type="checkbox" checked={adjustUrgent} onChange={e=>setAdjustUrgent(e.target.checked)}/>Mark approval request as urgent</label>
    <button onClick={requestAdjustment} disabled={chargesBusy||!adjustReason.trim()||(adjustType==='discount'&&!(adjustAmount>0||adjustPercent>0))} className="mt-3 w-full rounded-xl bg-[var(--brand-primary)] py-3 font-medium text-white disabled:opacity-40">Send {adjustType==='foc'?'FOC':'Discount'} for Approval</button>
    {adjustMessage&&<div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[13px] font-medium text-emerald-700">{adjustMessage}</div>}
  </Modal>}

  <PaymentModal
    open={depositOpen}
    title={detail?.order?.order_no?'Take Deposit · '+detail.order.order_no:'Take Deposit'}
    total={Number(detail?.order?.total??0)}
    amountPaid={Number(detail?.order?.amount_paid||0)}
    currency={currency}
    busy={depositBusy}
    onClose={()=>setDepositOpen(false)}
    onSubmit={submitDeposit}
  />

  <PaymentModal
    open={paymentOpen}
    title={detail?.order?.order_no?'Settle Bill · '+detail.order.order_no:'Settle Restaurant Bill'}
    total={Number(bill?.order?.total??detail?.order?.total??0)}
    amountPaid={Number(bill?.amountPaid??detail?.order?.amount_paid??0)}
    currency={currency}
    busy={paymentBusy}
    onClose={()=>{setPaymentOpen(false);setBill(null)}}
    onSubmit={submitBillPayment}
  />

  {receiptActions&&<Modal title="Payment Complete" onClose={()=>setReceiptActions(null)} size="sm">
    <div className="flex items-center gap-3 rounded-xl bg-slate-950 p-4 text-white">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><CheckCircle2 size={20}/></div>
      <div><div className="text-[13px] font-semibold">{receiptActions.orderNo}</div><div className="mt-0.5 text-[10px] text-slate-400">Order fully settled</div></div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button onClick={()=>printPdf('/documents/order/'+receiptActions.id+'/pdf?type=invoice&paper=80mm')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-3 py-3 text-[11px] font-semibold text-white"><Printer size={15}/>Print Receipt</button>
      <button onClick={()=>sharePdf('/documents/order/'+receiptActions.id+'/pdf?type=invoice&paper=80mm',receiptActions.orderNo+'.pdf')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-[11px] font-semibold text-slate-700"><Share2 size={15}/>Share</button>
      <button onClick={()=>setReceiptActions(null)} className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-medium text-slate-500">Done</button>
    </div>
  </Modal>}

  {transferOpen&&<Modal title="Transfer Table" onClose={()=>setTransferOpen(false)}><Field label="Destination table"><select value={transferTable} onChange={e=>setTransferTable(Number(e.target.value))} className="control">{availableTables.map(t=><option key={t.id} value={t.id}>{t.area_name||'Floor'} · {t.name}</option>)}</select></Field><button onClick={doTransfer} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium">Transfer Order</button></Modal>}

  {cancelOpen&&<Modal title="Request Order Cancellation" onClose={()=>setCancelOpen(false)}><p className="text-sm text-slate-500">Cancellation does not happen until management approves it.</p><textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} className="control mt-4 min-h-28" placeholder="Reason for cancellation"/><label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-[13px] font-medium text-amber-800"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Mark as urgent</label><button onClick={requestCancel} disabled={!cancelReason.trim()} className="mt-4 w-full rounded-xl bg-red-600 text-white py-3 font-medium disabled:opacity-40">Submit Cancellation Request</button></Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="text-[13px] font-medium text-slate-700">{label}{children}</label>}
function Action({onClick,icon:Icon,label,danger=false}:{onClick:()=>void;icon:any;label:string;danger?:boolean}){return <button onClick={onClick} className={'rounded-xl border px-3 py-2.5 text-xs font-medium flex items-center justify-center gap-2 '+(danger?'border-red-200 text-red-600':'border-slate-200 text-slate-700')}><Icon size={15}/>{label}</button>}
function ReceiptIcon({size=15}:{size?:number}){return <span style={{fontSize:size}}>🧾</span>}
