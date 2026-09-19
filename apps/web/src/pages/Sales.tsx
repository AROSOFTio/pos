import { useEffect, useState } from 'react'
import { Eye, RotateCcw, ShieldAlert } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

type Mode='refund'|'void_item'|'void_sale'

export default function Sales({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[detail,setDetail]=useState<any>(null),[detailOpen,setDetailOpen]=useState(false)
 const [actionOpen,setActionOpen]=useState(false),[mode,setMode]=useState<Mode>('refund'),[qtys,setQtys]=useState<Record<number,number>>({})
 const [reasonCodes,setReasonCodes]=useState<any[]>([]),[reason,setReason]=useState(''),[restock,setRestock]=useState(true),[urgent,setUrgent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')

 const load=()=>api('/sales').then(setRows)
 useEffect(()=>{load()},[])
 async function openSale(id:number){const d=await api('/sales/'+id);setDetail(d);setDetailOpen(true);setMessage('')}
 async function openAction(next:Mode){
   setMode(next);setQtys({});setReason('');setRestock(true);setUrgent(false);setMessage('')
   const codes=await api('/reason-codes?category='+(next==='refund'?'refund':'void'));setReasonCodes(codes);setActionOpen(true)
 }
 async function submit(){
   if(!detail?.sale?.id||!reason.trim())return
   let items:any[]=[]
   if(mode!=='void_sale'){
     items=detail.items.map((x:any)=>({saleItemId:Number(x.id),qty:Number(qtys[Number(x.id)]||0)})).filter((x:any)=>x.qty>0)
     if(!items.length){setMessage('Select at least one item quantity.');return}
   }
   setBusy(true)
   try{
     const out=await api('/sales/'+detail.sale.id+'/refunds/request',{method:'POST',body:JSON.stringify({items,reason,restock,urgent,requestKind:mode})})
     setMessage((mode==='refund'?'Refund':mode==='void_item'?'Item void':'Sale void')+' request '+out.refund.refund_no+' sent for management approval.')
     setActionOpen(false);await openSale(detail.sale.id);await load()
   }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Transaction control" title="Sales & Refunds" sub="Review completed sales, payment history, refund requests and manager-controlled voids."/>
  <Panel title="Recent Sales" sub={rows.length+' transactions'}>
   <DataTable head={['Receipt','Date','Customer','Total','Paid','Due','Refund','Status','Action']} rows={rows.map(s=>[
    <b>{s.receipt_no}</b>,
    new Date(s.created_at).toLocaleString(),
    s.customer_name||'Walk-in',
    money(s.total,currency),
    money(s.amount_paid,currency),
    money(s.balance_due,currency),
    Number(s.refunded_amount)>0?money(s.refunded_amount,currency):'-',
    s.voided?<Badge tone="red">Voided</Badge>:<Badge tone={s.payment_status==='paid'?'green':s.payment_status==='partially_paid'?'amber':'slate'}>{nice(s.payment_status)}</Badge>,
    <button onClick={()=>openSale(Number(s.id))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"><Eye size={14}/>Open</button>
   ])}/>
  </Panel>

  {detailOpen&&detail&&<Modal title={'Sale · '+detail.sale.receipt_no} onClose={()=>setDetailOpen(false)}>
    <div className="mb-3 flex justify-end"><button onClick={()=>openPdf('/documents/sale/'+detail.sale.id+'/pdf')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium">Print Receipt</button></div><div className="grid grid-cols-3 gap-3">
      <Kpi label="Total" value={money(detail.sale.total,currency)}/>
      <Kpi label="Collected" value={money(detail.sale.amount_paid,currency)} tone="green"/>
      <Kpi label="Refunded" value={money(detail.sale.refunded_amount,currency)} tone={Number(detail.sale.refunded_amount)>0?'amber':'slate'}/>
    </div>
    <div className="mt-4 max-h-52 overflow-y-auto">
      <DataTable head={['Item','Qty','Price','Line total']} rows={detail.items.map((x:any)=>[<b>{x.product_name}</b>,Number(x.qty),money(x.unit_price,currency),money(x.line_total,currency)])}/>
    </div>
    <div className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Tender history</div>
    <div className="mt-2 space-y-2">{detail.payments.length?detail.payments.map((p:any)=><div key={p.id} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{nice(p.payment_method)} {p.reference&&'· '+p.reference}</span><b>{money(p.allocated_amount||p.amount,currency)}</b></div>):<div className="text-sm text-slate-400">No posted tenders.</div>}</div>
    <div className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Refund / void history</div>
    <div className="mt-2 space-y-2">{detail.refunds.length?detail.refunds.map((r:any)=><div key={r.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><div><b className="text-sm">{r.refund_no}</b><div className="mt-1 text-xs text-slate-400">{nice(r.request_kind)} · {r.reason}</div></div><div className="text-right"><b>{money(r.total,currency)}</b><div className="mt-1 flex items-center justify-end gap-2"><Badge tone={r.status==='approved'?'green':r.status==='rejected'?'red':'amber'}>{nice(r.status)}</Badge>{r.status==='approved'&&<button onClick={()=>openPdf('/documents/refund/'+r.id+'/pdf')} className="text-[11px] font-medium text-slate-500">PDF</button>}</div></div></div></div>):<div className="text-sm text-slate-400">No refund or void requests.</div>}</div>
    {!detail.sale.voided&&Number(detail.sale.amount_paid)>Number(detail.sale.refunded_amount)&&<div className="mt-5 grid grid-cols-3 gap-2">
      <button onClick={()=>openAction('refund')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium"><RotateCcw size={15}/>Refund Items</button>
      <button onClick={()=>openAction('void_item')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-medium text-amber-800"><ShieldAlert size={15}/>Void Item</button>
      <button onClick={()=>openAction('void_sale')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-medium text-red-700"><ShieldAlert size={15}/>Void Sale</button>
    </div>}
    {message&&<div className="mt-3 rounded-xl bg-emerald-50 p-3 text-[13px] font-medium text-emerald-700">{message}</div>}
  </Modal>}

  {actionOpen&&detail&&<Modal title={mode==='refund'?'Request Partial / Full Refund':mode==='void_item'?'Request Item Void':'Request Full Sale Void'} onClose={()=>setActionOpen(false)}>
    {mode!=='void_sale'&&<div className="max-h-64 overflow-y-auto space-y-2">
      {detail.items.map((x:any)=><div key={x.id} className="grid grid-cols-[1fr_100px] items-center gap-3 rounded-xl border border-slate-200 p-3"><div><b className="text-sm">{x.product_name}</b><div className="text-xs text-slate-400">Sold {Number(x.qty)} · {money(x.unit_price,currency)} each</div></div><input type="number" min="0" max={Number(x.qty)} step="0.001" value={qtys[Number(x.id)]||''} onChange={e=>setQtys({...qtys,[Number(x.id)]:Number(e.target.value)})} className="control" placeholder="Qty"/></div>)}
    </div>}
    {mode==='void_sale'&&<div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">This requests reversal of the entire sale. Management approval is required before stock or money is reversed.</div>}
    <label className="mt-4 block text-[13px] font-medium text-slate-700">Reason
      <select className="control" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Choose reason</option>{reasonCodes.map(r=><option key={r.id} value={r.label}>{r.label}</option>)}</select>
    </label>
    <label className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[13px] font-medium"><input type="checkbox" checked={restock} onChange={e=>setRestock(e.target.checked)}/>Return approved quantities to inventory / recipe stock</label>
    <label className="mt-2 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-[13px] font-medium text-amber-800"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Mark management request as urgent</label>
    {message&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-[13px] font-medium text-red-700">{message}</div>}
    <button onClick={submit} disabled={busy||!reason.trim()} className={'mt-4 w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40 '+(mode==='void_sale'?'bg-red-600':'bg-slate-950')}>{busy?'Submitting…':'Send for Management Approval'}</button>
  </Modal>}
 </div>
}
function Kpi({label,value,tone='slate'}:{label:string;value:string;tone?:string}){const cls=tone==='green'?'bg-emerald-50 text-emerald-700':tone==='amber'?'bg-amber-50 text-amber-700':'bg-slate-50 text-slate-700';return <div className={'rounded-xl p-3 '+cls}><div className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</div><div className="mt-1 text-[13px] font-medium">{value}</div></div>}
