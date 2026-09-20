import { useEffect, useMemo, useState } from 'react'
import { Truck, WalletCards, ClipboardList, AlertTriangle, Plus, Eye, FileText, ReceiptText, CreditCard } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Stat, Panel, DataTable, Badge, Loading, Modal } from '../components'

type DraftItem={productId:number;name:string;qty:number;unitCost:number}

export default function Purchasing({currency}:{currency:string}){
 const [o,setO]=useState<any>(null),[pos,setPos]=useState<any[]>([]),[grns,setGrns]=useState<any[]>([]),[invoices,setInvoices]=useState<any[]>([]),[section,setSection]=useState<'orders'|'invoices'|'returns'>('orders')
 const [createOpen,setCreateOpen]=useState(false),[preview,setPreview]=useState(false)
 const [suppliers,setSuppliers]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([]),[supplierProducts,setSupplierProducts]=useState<any[]>([])
 const [supplierId,setSupplierId]=useState<number>(0),[branchId,setBranchId]=useState<number>(0),[selectedProduct,setSelectedProduct]=useState<number>(0),[notes,setNotes]=useState('')
 const [items,setItems]=useState<DraftItem[]>([]),[saving,setSaving]=useState(false)
 const [submitPo,setSubmitPo]=useState<any>(null),[submitNote,setSubmitNote]=useState(''),[urgent,setUrgent]=useState(false)
 const [receivePo,setReceivePo]=useState<any>(null),[receiveItems,setReceiveItems]=useState<any[]>([]),[receiveRef,setReceiveRef]=useState(''),[receiveNotes,setReceiveNotes]=useState('')
 const [returnOpen,setReturnOpen]=useState(false),[returnSupplier,setReturnSupplier]=useState(0),[returnReason,setReturnReason]=useState(''),[returnItems,setReturnItems]=useState<any[]>([{productId:0,locationId:0,qty:1,unitCost:0}]),[balances,setBalances]=useState<any[]>([])
 const [invoiceOpen,setInvoiceOpen]=useState(false),[invoicePay,setInvoicePay]=useState<any>(null),[invoiceSupplier,setInvoiceSupplier]=useState(0),[invoicePo,setInvoicePo]=useState(0),[invoiceGrn,setInvoiceGrn]=useState(0),[invoiceNo,setInvoiceNo]=useState(''),[invoiceDate,setInvoiceDate]=useState(''),[dueDate,setDueDate]=useState(''),[invoiceTax,setInvoiceTax]=useState(0),[invoiceItems,setInvoiceItems]=useState<any[]>([{description:'',qty:1,unitCost:0}]),[payAmount,setPayAmount]=useState(0),[payMethod,setPayMethod]=useState('cash'),[payReference,setPayReference]=useState('')

 const load=()=>Promise.all([api('/purchasing/overview'),api('/purchase-orders'),api('/grns'),api('/purchasing/invoices').catch(()=>[]),api('/purchasing/returns').catch(()=>[])]).then(([o,p,g,i,r])=>{setO(o);setPos(p);setGrns(g);setInvoices(Array.isArray(i)?i:[]);setReturns(Array.isArray(r)?r:[])})
 useEffect(()=>{load()},[])
 const total=useMemo(()=>items.reduce((n,x)=>n+x.qty*x.unitCost,0),[items])

 async function openCreate(){
   const [s,b]=await Promise.all([api('/suppliers'),api('/branches')])
   setSuppliers(s);setBranches(b);setSupplierId(0);setBranchId(Number(b[0]?.id||0));setSupplierProducts([]);setItems([]);setNotes('');setPreview(false);setCreateOpen(true)
 }
 async function chooseSupplier(id:number){setSupplierId(id);setItems([]);setSelectedProduct(0);setSupplierProducts(id?await api('/suppliers/'+id+'/products'):[])}
 function addProduct(){
   const p=supplierProducts.find(x=>Number(x.id)===selectedProduct);if(!p)return
   if(items.some(x=>x.productId===selectedProduct))return
   setItems(v=>[...v,{productId:selectedProduct,name:p.name,qty:1,unitCost:Number(p.supplier_price??p.cost??0)}])
 }
 function patchItem(i:number,patch:Partial<DraftItem>){setItems(v=>v.map((x,k)=>k===i?{...x,...patch}:x))}
 async function savePO(){
   if(!supplierId||!items.length)return
   setSaving(true)
   try{
     await api('/purchase-orders',{method:'POST',body:JSON.stringify({supplierId,branchId:branchId||null,notes,items})})
     setCreateOpen(false);await load()
   }finally{setSaving(false)}
 }
 async function sendApproval(){
   if(!submitPo)return
   await api('/purchase-orders/'+submitPo.id+'/submit',{method:'POST',body:JSON.stringify({comment:submitNote,urgent})})
   setSubmitPo(null);setSubmitNote('');setUrgent(false);await load()
 }
 async function openInvoice(){
   const [s,b]=await Promise.all([api('/suppliers'),api('/branches')]);setSuppliers(s);setBranches(b);setInvoiceSupplier(0);setInvoicePo(0);setInvoiceGrn(0);setInvoiceNo('');setInvoiceDate('');setDueDate('');setInvoiceTax(0);setInvoiceItems([{description:'',qty:1,unitCost:0}]);setInvoiceOpen(true)
 }
 const invoiceSubtotal=invoiceItems.reduce((n,x)=>n+Number(x.qty||0)*Number(x.unitCost||0),0)
 async function saveInvoice(){
   if(!invoiceSupplier||!invoiceNo.trim()||!invoiceItems.some(x=>x.description.trim()))return
   setSaving(true)
   try{await api('/purchasing/invoices',{method:'POST',body:JSON.stringify({branchId:branchId||null,supplierId:invoiceSupplier,purchaseOrderId:invoicePo||null,grnId:invoiceGrn||null,invoiceNo:invoiceNo.trim(),invoiceDate:invoiceDate||null,dueDate:dueDate||null,tax:invoiceTax,items:invoiceItems.filter(x=>x.description.trim())})});setInvoiceOpen(false);await load()}finally{setSaving(false)}
 }
 async function payInvoice(){
   if(!invoicePay||!(payAmount>0))return
   setSaving(true)
   try{await api('/purchasing/invoices/'+invoicePay.id+'/payments',{method:'POST',body:JSON.stringify({amount:payAmount,paymentMethod:payMethod,reference:payReference})});setInvoicePay(null);await load()}finally{setSaving(false)}
 }
 async function openReceive(po:any){
   const d=await api('/purchase-orders/'+po.id)
   setReceivePo(d.order);setReceiveItems((d.items||[]).filter((x:any)=>Number(x.qty_received)<Number(x.qty_ordered)).map((x:any)=>({itemId:Number(x.id),name:x.product_name,qty:Math.max(0,Number(x.qty_ordered)-Number(x.qty_received)),unitCost:Number(x.unit_cost||0),lotNo:'',expiryDate:''})));setReceiveRef('');setReceiveNotes('')
 }
 async function postReceive(){
   if(!receivePo||!receiveItems.some(x=>Number(x.qty)>0))return
   setSaving(true)
   try{await api('/purchase-orders/'+receivePo.id+'/receive',{method:'POST',body:JSON.stringify({supplierReference:receiveRef.trim()||null,notes:receiveNotes.trim()||null,items:receiveItems.filter(x=>Number(x.qty)>0)})});setReceivePo(null);await load()}finally{setSaving(false)}
 }
 async function openReturn(){
   const [s,b]=await Promise.all([api('/suppliers'),api('/inventory/balances')]);setSuppliers(s);setBalances(Array.isArray(b)?b:[]);setReturnSupplier(0);setReturnReason('');setReturnItems([{productId:0,locationId:0,qty:1,unitCost:0}]);setReturnOpen(true)
 }
 async function postReturn(){
   if(!returnSupplier||!returnReason.trim()||!returnItems.some(x=>x.productId&&x.locationId&&Number(x.qty)>0))return
   setSaving(true);try{await api('/purchasing/returns',{method:'POST',body:JSON.stringify({supplierId:returnSupplier,reason:returnReason.trim(),items:returnItems.filter(x=>x.productId&&x.locationId&&Number(x.qty)>0)})});setReturnOpen(false);await load()}finally{setSaving(false)}
 }

 if(!o)return <Loading/>
 return <div>
  <PageHeading eyebrow="Procurement" title="Purchasing & Payables" sub="Orders, receiving, supplier invoices and payments." action={<div className="flex gap-2"><button onClick={section==='orders'?openCreate:section==='invoices'?openInvoice:openReturn} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"><Plus size={16} className="inline mr-1"/>{section==='orders'?'New Purchase Order':section==='invoices'?'Supplier Invoice':'Purchase Return'}</button></div>}/>
  <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1"><button onClick={()=>setSection('orders')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='orders'?'bg-slate-950 text-white':'text-slate-500')}>Purchase Orders</button><button onClick={()=>setSection('invoices')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='invoices'?'bg-slate-950 text-white':'text-slate-500')}>Supplier Invoices</button><button onClick={()=>setSection('returns')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='returns'?'bg-slate-950 text-white':'text-slate-500')}>Returns</button></div>
  {section==='orders'&&<>
  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <Stat label="Open POs" value={o.openOrders} sub="Draft / approval / partial" icon={Truck}/>
    <Stat label="Month Purchases" value={money(o.purchaseValueMonth,currency)} sub="Purchase order value" icon={WalletCards} tone="blue"/>
    <Stat label="GRNs Today" value={o.receiptsToday} sub="Goods received" icon={ClipboardList} tone="emerald"/>
    <Stat label="Low Stock" value={o.lowStock} sub="Needs attention" icon={AlertTriangle} tone={o.lowStock?'amber':'emerald'}/>
  </div>
  <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4 mt-4">
    <Panel title="Purchase Orders"><DataTable head={['PO','Supplier','Status','Received','Total','Actions']} rows={pos.map(x=>[
      <div><b>{x.po_no}</b><div className="text-[11px] text-slate-400">{x.branch_name}</div></div>,
      x.supplier_name,
      <Badge tone={x.status==='rejected'?'red':x.status==='ordered'||x.status==='received'?'green':x.status==='pending_approval'?'amber':'slate'}>{nice(x.status)}</Badge>,
      Number(x.received_qty)+'/'+Number(x.total_qty),
      money(x.total,currency),
      <div className="flex gap-2">
        {(x.status==='draft'||x.status==='rejected')&&<button onClick={()=>setSubmitPo(x)} className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium">{x.status==='rejected'?'Resubmit':'Submit'}</button>}{(x.status==='ordered'||x.status==='partial')&&<button onClick={()=>openReceive(x)} className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-medium text-white">Receive</button>}
        <button onClick={()=>openPdf('/documents/purchase-order/'+x.id+'/pdf')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600" title="Open PDF"><FileText size={15}/></button>
      </div>
    ])}/></Panel>
    <Panel title="Recent GRNs"><DataTable head={['GRN','Supplier','Total']} rows={grns.slice(0,12).map(x=>[<b>{x.grn_no}</b>,x.supplier_name,money(x.total,currency)])}/></Panel>
  </div>  </>}

  {section==='invoices'&&<>
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Open Invoices" value={invoices.filter(x=>x.status!=='paid').length} sub="Payables outstanding" icon={ReceiptText}/>
      <Stat label="Outstanding" value={money(invoices.reduce((n,x)=>n+Number(x.balance_due||0),0),currency)} sub="Supplier balance due" icon={WalletCards} tone="amber"/>
      <Stat label="Paid" value={invoices.filter(x=>x.status==='paid').length} sub="Fully settled" icon={CreditCard} tone="emerald"/>
    </div>
    <div className="mt-4"><Panel title="Supplier invoices" sub={invoices.length+' invoice'+(invoices.length===1?'':'s')}>
      {invoices.length?<DataTable head={['Invoice','Supplier','PO / GRN','Date','Due','Total','Balance','Status','']} rows={invoices.map(x=>[
        <b>{x.invoice_no}</b>,x.supplier_name,<div className="text-[10px]">{x.po_no||'-'}<div className="text-slate-400">{x.grn_no||''}</div></div>,new Date(x.invoice_date).toLocaleDateString(),x.due_date?new Date(x.due_date).toLocaleDateString():'-',money(x.total,currency),money(x.balance_due,currency),<Badge tone={x.status==='paid'?'green':x.status==='partially_paid'?'amber':'blue'}>{nice(x.status)}</Badge>,Number(x.balance_due)>0?<button onClick={()=>{setInvoicePay(x);setPayAmount(Number(x.balance_due));setPayMethod('cash');setPayReference('')}} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white">Pay</button>:''
      ])}/>:<div className="py-10 text-center text-[11px] text-slate-400">No supplier invoices yet.</div>}
    </Panel></div>
  </>}



  {section==='returns'&&<Panel title="Purchase Returns" sub="Stock returned to suppliers is removed from inventory and credited to the supplier ledger.">
    {returns.length?<DataTable head={['Return','Supplier','PO / GRN','Reason','Total','Date']} rows={returns.map(x=>[<b>{x.return_no}</b>,x.supplier_name,<div className="text-[10px]">{x.po_no||'-'}<div className="text-slate-400">{x.grn_no||''}</div></div>,x.reason,money(x.total,currency),new Date(x.created_at).toLocaleString()])}/>:<div className="py-10 text-center text-[11px] text-slate-400">No purchase returns yet.</div>}
  </Panel>}

  {createOpen&&<Modal title={preview?'Preview Purchase Order':'New Purchase Order'} onClose={()=>setCreateOpen(false)}>
    {!preview?<div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-[13px] font-medium text-slate-700">Supplier<select value={supplierId} onChange={e=>chooseSupplier(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="0">Choose supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-[13px] font-medium text-slate-700">Branch<select value={branchId} onChange={e=>setBranchId(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="flex gap-2">
          <select value={selectedProduct} onChange={e=>setSelectedProduct(Number(e.target.value))} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="0">Add supplier product</option>{supplierProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button onClick={addProduct} className="rounded-lg bg-slate-900 text-white px-4 text-sm font-medium">Add</button>
        </div>
        {!supplierId&&<p className="mt-2 text-xs text-slate-400">Choose a supplier first. Only products registered for that supplier will appear.</p>}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">{items.map((x,i)=><div key={x.productId} className="grid grid-cols-[1fr_90px_110px_34px] gap-2 items-center rounded-xl border border-slate-100 p-2.5"><b className="text-sm truncate">{x.name}</b><input type="number" min="0.001" step="0.001" value={x.qty} onChange={e=>patchItem(i,{qty:Number(e.target.value)})} className="rounded-lg border border-slate-200 px-2 py-2 text-sm"/><input type="number" min="0" value={x.unitCost} onChange={e=>patchItem(i,{unitCost:Number(e.target.value)})} className="rounded-lg border border-slate-200 px-2 py-2 text-sm"/><button onClick={()=>setItems(v=>v.filter((_,k)=>k!==i))} className="text-slate-400 hover:text-red-500">×</button></div>)}</div>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Purchase notes (optional)" className="w-full min-h-20 rounded-xl border border-slate-200 p-3"/>
      <div className="flex justify-between items-center border-t border-slate-100 pt-4"><div><div className="text-xs text-slate-400">Draft total</div><div className="text-xl font-semibold">{money(total,currency)}</div></div><div className="flex gap-2"><button onClick={()=>setPreview(true)} disabled={!supplierId||!items.length} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40"><Eye size={15} className="inline mr-1"/>Preview</button><button onClick={savePO} disabled={saving||!supplierId||!items.length} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-40">{saving?'Saving…':'Save Draft'}</button></div></div>
    </div>:<div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex justify-between"><div><div className="text-xs text-slate-400">PURCHASE ORDER PREVIEW</div><div className="font-semibold text-lg mt-1">Draft Purchase Order</div></div><div className="text-right text-sm"><div>{suppliers.find(s=>Number(s.id)===supplierId)?.name}</div><div className="text-slate-400">{branches.find(b=>Number(b.id)===branchId)?.name}</div></div></div>
        <div className="p-5"><DataTable head={['Product','Qty','Unit Cost','Total']} rows={items.map(x=>[<b>{x.name}</b>,x.qty,money(x.unitCost,currency),money(x.qty*x.unitCost,currency)])}/><div className="mt-4 text-right"><div className="text-xs text-slate-400">TOTAL</div><div className="text-2xl font-semibold">{money(total,currency)}</div></div>{notes&&<div className="mt-4 text-sm text-slate-500">{notes}</div>}</div>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={()=>setPreview(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">Back</button><button onClick={savePO} disabled={saving} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium">{saving?'Saving…':'Save Draft PO'}</button></div>
    </div>}
  </Modal>}

  {receivePo&&<Modal title={'Receive '+receivePo.po_no} onClose={()=>!saving&&setReceivePo(null)} size="xl">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-medium text-slate-600">Supplier reference<input className="control" value={receiveRef} onChange={e=>setReceiveRef(e.target.value)} placeholder="Delivery note / invoice reference"/></label><label className="text-[11px] font-medium text-slate-600">Receiving notes<input className="control" value={receiveNotes} onChange={e=>setReceiveNotes(e.target.value)}/></label></div>
    <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">{receiveItems.map((x,i)=><div key={x.itemId} className="rounded-xl border border-slate-200 p-3"><div className="mb-2 text-[11px] font-semibold text-slate-800">{x.name}</div><div className="grid gap-2 sm:grid-cols-4"><label className="text-[9.5px] text-slate-500">Qty<input className="control" type="number" min="0" step="0.001" value={x.qty} onChange={e=>setReceiveItems(v=>v.map((z,k)=>k===i?{...z,qty:Number(e.target.value)}:z))}/></label><label className="text-[9.5px] text-slate-500">Unit cost<input className="control" type="number" min="0" value={x.unitCost} onChange={e=>setReceiveItems(v=>v.map((z,k)=>k===i?{...z,unitCost:Number(e.target.value)}:z))}/></label><label className="text-[9.5px] text-slate-500">Lot / batch<input className="control" value={x.lotNo} onChange={e=>setReceiveItems(v=>v.map((z,k)=>k===i?{...z,lotNo:e.target.value}:z))} placeholder="Optional"/></label><label className="text-[9.5px] text-slate-500">Expiry<input type="date" className="control" value={x.expiryDate} onChange={e=>setReceiveItems(v=>v.map((z,k)=>k===i?{...z,expiryDate:e.target.value}:z))}/></label></div></div>)}</div>
    <button onClick={postReceive} disabled={saving||!receiveItems.some(x=>Number(x.qty)>0)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{saving?'Posting…':'Post Goods Receipt'}</button>
  </Modal>}

  {returnOpen&&<Modal title="Purchase Return" onClose={()=>!saving&&setReturnOpen(false)} size="lg">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-medium text-slate-600">Supplier<select className="control" value={returnSupplier} onChange={e=>setReturnSupplier(Number(e.target.value))}><option value="0">Choose supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-[11px] font-medium text-slate-600">Reason<input className="control" value={returnReason} onChange={e=>setReturnReason(e.target.value)} placeholder="Damaged, wrong item, rejected quality…"/></label></div>
    <div className="mt-4 space-y-2">{returnItems.map((x,i)=><div key={i} className="grid grid-cols-[1fr_100px_110px_30px] gap-2"><select className="control mt-0" value={x.productId+'|'+x.locationId} onChange={e=>{const [productId,locationId]=e.target.value.split('|').map(Number),b=balances.find(z=>Number(z.product_id)===productId&&Number(z.location_id)===locationId);setReturnItems(v=>v.map((z,k)=>k===i?{...z,productId,locationId,unitCost:Number(b?.avg_cost||0)}:z))}}><option value="0|0">Choose stock</option>{balances.filter(b=>Number(b.qty)>0).map(b=><option key={b.product_id+'-'+b.location_id} value={b.product_id+'|'+b.location_id}>{b.product_name} · {b.location_name} · {Number(b.qty)} available</option>)}</select><input className="control mt-0" type="number" min="0.001" step="0.001" value={x.qty} onChange={e=>setReturnItems(v=>v.map((z,k)=>k===i?{...z,qty:Number(e.target.value)}:z))}/><input className="control mt-0" type="number" min="0" value={x.unitCost} onChange={e=>setReturnItems(v=>v.map((z,k)=>k===i?{...z,unitCost:Number(e.target.value)}:z))}/><button onClick={()=>setReturnItems(v=>v.filter((_,k)=>k!==i))} className="text-slate-400">×</button></div>)}</div>
    <button onClick={()=>setReturnItems(v=>[...v,{productId:0,locationId:0,qty:1,unitCost:0}])} className="mt-2 text-[10px] font-medium text-[var(--brand-primary)]">+ Add item</button>
    <button onClick={postReturn} disabled={saving||!returnSupplier||!returnReason.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{saving?'Posting…':'Post Purchase Return'}</button>
  </Modal>}

  {invoiceOpen&&<Modal title="Supplier Invoice" onClose={()=>!saving&&setInvoiceOpen(false)} size="lg">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-[11px] font-medium text-slate-600">Supplier<select className="control" value={invoiceSupplier} onChange={e=>setInvoiceSupplier(Number(e.target.value))}><option value="0">Choose supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-[11px] font-medium text-slate-600">Invoice number<input className="control" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}/></label>
      <label className="text-[11px] font-medium text-slate-600">Invoice date<input type="date" className="control" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}/></label>
      <label className="text-[11px] font-medium text-slate-600">Due date<input type="date" className="control" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
      <label className="text-[11px] font-medium text-slate-600">Purchase order<select className="control" value={invoicePo} onChange={e=>setInvoicePo(Number(e.target.value))}><option value="0">Not linked</option>{pos.filter(x=>!invoiceSupplier||Number(x.supplier_id)===invoiceSupplier).map(x=><option key={x.id} value={x.id}>{x.po_no}</option>)}</select></label>
      <label className="text-[11px] font-medium text-slate-600">Goods receipt<select className="control" value={invoiceGrn} onChange={e=>setInvoiceGrn(Number(e.target.value))}><option value="0">Not linked</option>{grns.filter(x=>!invoiceSupplier||Number(x.supplier_id)===invoiceSupplier).map(x=><option key={x.id} value={x.id}>{x.grn_no}</option>)}</select></label>
    </div>
    <div className="mt-4 space-y-2">{invoiceItems.map((x,i)=><div key={i} className="grid grid-cols-[1fr_90px_120px_30px] gap-2"><input className="control mt-0" value={x.description} onChange={e=>setInvoiceItems(v=>v.map((z,k)=>k===i?{...z,description:e.target.value}:z))} placeholder="Item / charge"/><input className="control mt-0" type="number" min="0" step="0.001" value={x.qty} onChange={e=>setInvoiceItems(v=>v.map((z,k)=>k===i?{...z,qty:Number(e.target.value)}:z))}/><input className="control mt-0" type="number" min="0" value={x.unitCost} onChange={e=>setInvoiceItems(v=>v.map((z,k)=>k===i?{...z,unitCost:Number(e.target.value)}:z))}/><button onClick={()=>setInvoiceItems(v=>v.filter((_,k)=>k!==i))} className="text-slate-400">×</button></div>)}</div>
    <button onClick={()=>setInvoiceItems(v=>[...v,{description:'',qty:1,unitCost:0}])} className="mt-2 text-[10px] font-medium text-[var(--brand-primary)]">+ Add line</button>
    <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[11px] font-medium text-slate-600">Tax<input className="control" type="number" min="0" value={invoiceTax} onChange={e=>setInvoiceTax(Number(e.target.value))}/></label><div className="rounded-xl bg-slate-50 p-3 text-right"><div className="text-[9px] text-slate-400">TOTAL</div><div className="mt-1 text-lg font-semibold">{money(invoiceSubtotal+invoiceTax,currency)}</div></div></div>
    <button onClick={saveInvoice} disabled={saving||!invoiceSupplier||!invoiceNo.trim()||!invoiceItems.some(x=>x.description.trim())} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{saving?'Saving…':'Post Supplier Invoice'}</button>
  </Modal>}

  {invoicePay&&<Modal title={'Pay '+invoicePay.invoice_no} onClose={()=>!saving&&setInvoicePay(null)} size="sm">
    <div className="rounded-xl bg-slate-950 p-4 text-white"><div className="text-[9px] text-slate-400">OUTSTANDING</div><div className="mt-1 text-xl font-semibold">{money(invoicePay.balance_due,currency)}</div></div>
    <label className="mt-3 block text-[11px] font-medium text-slate-600">Amount<input className="control" type="number" min="0" max={Number(invoicePay.balance_due)} value={payAmount} onChange={e=>setPayAmount(Number(e.target.value))}/></label>
    <label className="mt-3 block text-[11px] font-medium text-slate-600">Method<select className="control" value={payMethod} onChange={e=>setPayMethod(e.target.value)}><option value="cash">Cash</option><option value="mobile money">Mobile Money</option><option value="bank transfer">Bank Transfer</option><option value="card">Card</option></select></label>
    <label className="mt-3 block text-[11px] font-medium text-slate-600">Reference<input className="control" value={payReference} onChange={e=>setPayReference(e.target.value)}/></label>
    <button onClick={payInvoice} disabled={saving||!(payAmount>0)||payAmount>Number(invoicePay.balance_due)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{saving?'Posting…':'Post Supplier Payment'}</button>
  </Modal>}

  {submitPo&&<Modal title={(submitPo.status==='rejected'?'Resubmit ':'Submit ')+submitPo.po_no+' for Approval'} onClose={()=>setSubmitPo(null)}>
    <p className="text-sm text-slate-500">Add a note for the responsible supervisor. Urgent requests are placed first in the approval queue.</p>
    <textarea value={submitNote} onChange={e=>setSubmitNote(e.target.value)} className="mt-4 w-full min-h-28 rounded-xl border border-slate-200 p-3" placeholder="Approval note"/>
    <label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-[13px] font-medium text-amber-800"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Mark as urgent</label>
    <button onClick={sendApproval} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium">Submit for Approval</button>
  </Modal>}
 </div>
}
