import { useEffect, useMemo, useState } from 'react'
import { Truck, WalletCards, ClipboardList, AlertTriangle, Plus, Eye, FileText } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Stat, Panel, DataTable, Badge, Loading, Modal } from '../components'

type DraftItem={productId:number;name:string;qty:number;unitCost:number}

export default function Purchasing({currency}:{currency:string}){
 const [o,setO]=useState<any>(null),[pos,setPos]=useState<any[]>([]),[grns,setGrns]=useState<any[]>([])
 const [createOpen,setCreateOpen]=useState(false),[preview,setPreview]=useState(false)
 const [suppliers,setSuppliers]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([]),[supplierProducts,setSupplierProducts]=useState<any[]>([])
 const [supplierId,setSupplierId]=useState<number>(0),[branchId,setBranchId]=useState<number>(0),[selectedProduct,setSelectedProduct]=useState<number>(0),[notes,setNotes]=useState('')
 const [items,setItems]=useState<DraftItem[]>([]),[saving,setSaving]=useState(false)
 const [submitPo,setSubmitPo]=useState<any>(null),[submitNote,setSubmitNote]=useState(''),[urgent,setUrgent]=useState(false)

 const load=()=>Promise.all([api('/purchasing/overview'),api('/purchase-orders'),api('/grns')]).then(([o,p,g])=>{setO(o);setPos(p);setGrns(g)})
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

 if(!o)return <Loading/>
 return <div>
  <PageHeading eyebrow="Procurement" title="Purchasing & Receiving" sub="Supplier-controlled purchase orders, approval status and goods receiving." action={<button onClick={openCreate} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"><Plus size={16} className="inline mr-1"/>New Purchase Order</button>}/>
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
        {(x.status==='draft'||x.status==='rejected')&&<button onClick={()=>setSubmitPo(x)} className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium">{x.status==='rejected'?'Resubmit':'Submit'}</button>}
        <button onClick={()=>openPdf('/documents/purchase-order/'+x.id+'/pdf')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600" title="Open PDF"><FileText size={15}/></button>
      </div>
    ])}/></Panel>
    <Panel title="Recent GRNs"><DataTable head={['GRN','Supplier','Total']} rows={grns.slice(0,12).map(x=>[<b>{x.grn_no}</b>,x.supplier_name,money(x.total,currency)])}/></Panel>
  </div>

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

  {submitPo&&<Modal title={(submitPo.status==='rejected'?'Resubmit ':'Submit ')+submitPo.po_no+' for Approval'} onClose={()=>setSubmitPo(null)}>
    <p className="text-sm text-slate-500">Add a note for the responsible supervisor. Urgent requests are placed first in the approval queue.</p>
    <textarea value={submitNote} onChange={e=>setSubmitNote(e.target.value)} className="mt-4 w-full min-h-28 rounded-xl border border-slate-200 p-3" placeholder="Approval note"/>
    <label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-[13px] font-medium text-amber-800"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Mark as urgent</label>
    <button onClick={sendApproval} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium">Submit for Approval</button>
  </Modal>}
 </div>
}
