import { useEffect, useState } from 'react'
import { Clock3, ShoppingCart, SlidersHorizontal, UtensilsCrossed } from 'lucide-react'
import { api, money, nice } from '../api'
import { Badge, Modal, PageHeading, Panel } from '../components'
import PaymentModal, { type PaymentLine } from '../components/PaymentModal'

type Adjustment={id:number;reference_no:string;adjustment_type:'discount'|'foc';requested_amount:number;requested_percent:number;status:string}

export default function POS({currency}:{currency:string}){
 const [items,setItems]=useState<any[]>([]),[cart,setCart]=useState<any[]>([]),[type,setType]=useState('counter'),[category,setCategory]=useState('All')
 const [busy,setBusy]=useState(false),[paymentOpen,setPaymentOpen]=useState(false),[balancesOpen,setBalancesOpen]=useState(false),[balances,setBalances]=useState<any[]>([])
 const [selectedSale,setSelectedSale]=useState<any>(null),[success,setSuccess]=useState<any>(null)
 const [chargesOpen,setChargesOpen]=useState(false),[taxRate,setTaxRate]=useState(0),[serviceRate,setServiceRate]=useState(0),[tip,setTip]=useState(0),[taxInclusive,setTaxInclusive]=useState(false)
 const [adjustment,setAdjustment]=useState<Adjustment|null>(null),[adjustType,setAdjustType]=useState<'discount'|'foc'>('discount'),[adjustAmount,setAdjustAmount]=useState(0),[adjustPercent,setAdjustPercent]=useState(0),[adjustReason,setAdjustReason]=useState(''),[adjustUrgent,setAdjustUrgent]=useState(false),[adjustMessage,setAdjustMessage]=useState('')

 const load=()=>api('/menu/available?orderType='+type).then(setItems)
 async function loadDefaults(){
   const s=await api('/document-settings')
   setTaxRate(Number(s.default_tax_rate||0));setServiceRate(Number(s.default_service_charge_rate||0));setTaxInclusive(!!s.tax_inclusive)
 }
 useEffect(()=>{setCart([]);setAdjustment(null);load();loadDefaults()},[type])

 const cats=['All',...Array.from(new Set(items.map(x=>x.category_name||'Other')))]
 const shown=items.filter(x=>category==='All'||(x.category_name||'Other')===category)
 const subtotal=cart.reduce((n,x)=>n+x.price*x.qty,0)

 const approved=adjustment?.status==='approved'
 const foc=approved&&adjustment?.adjustment_type==='foc'
 const discount=approved?(foc?subtotal:Math.min(Number(adjustment?.requested_amount||0),subtotal)):0
 const taxable=Math.max(0,subtotal-discount)
 const appliedTaxRate=foc?0:Math.max(0,taxRate)
 const appliedServiceRate=foc?0:Math.max(0,serviceRate)
 const appliedTip=foc?0:Math.max(0,tip)
 const tax=appliedTaxRate>0?(taxInclusive?taxable-(taxable/(1+appliedTaxRate/100)):taxable*appliedTaxRate/100):0
 const service=taxable*appliedServiceRate/100
 const finalTotal=Math.max(0,taxable+service+appliedTip+(taxInclusive?0:tax))

 function invalidateApproval(){
   if(adjustment)setAdjustMessage('Cart changed. Any previous discount/FOC approval must be requested again.')
   setAdjustment(null)
 }
 const add=(p:any)=>{invalidateApproval();setCart(c=>{const i=c.findIndex(x=>x.id===p.id);if(i<0)return [...c,{id:p.id,name:p.name,price:Number(p.resolved_price),qty:1}];return c.map((x,k)=>k===i?{...x,qty:x.qty+1}:x)})}
 const qty=(i:number,d:number)=>{invalidateApproval();setCart(c=>c.map((x,k)=>k===i?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0))}

 async function openBalances(){
   const rows=await api('/sales')
   setBalances(rows.filter((x:any)=>Number(x.balance_due||0)>0.005&&x.payment_status!=='paid'))
   setBalancesOpen(true)
 }
 function startNewPayment(){if(!cart.length)return;setSelectedSale(null);if(finalTotal<=0.005){completeFoc();return}setPaymentOpen(true)}
 async function completeFoc(){
   if(!cart.length||!adjustment||adjustment.status!=='approved'||adjustment.adjustment_type!=='foc')return
   setBusy(true)
   try{
     const out=await api('/sales',{method:'POST',body:JSON.stringify({items:cart.map(x=>({productId:x.id,qty:x.qty})),payments:[],orderType:type,taxRate,serviceRate,tip,taxInclusive,adjustmentRequestId:adjustment.id})})
     setCart([]);setAdjustment(null);setChargesOpen(false);await load();setSuccess({sale:out.sale,payments:[],existing:false})
   }finally{setBusy(false)}
 }
 async function submitPayment(lines:Omit<PaymentLine,'id'>[]){
   setBusy(true)
   try{
     if(selectedSale){
       const out=await api('/sales/'+selectedSale.id+'/payments',{method:'POST',body:JSON.stringify({payments:lines})})
       setPaymentOpen(false);setSelectedSale(null)
       const rows=await api('/sales');setBalances(rows.filter((x:any)=>Number(x.balance_due||0)>0.005&&x.payment_status!=='paid'))
       setSuccess({sale:out.sale,payments:lines,existing:true})
     }else{
       const out=await api('/sales',{method:'POST',body:JSON.stringify({
         items:cart.map(x=>({productId:x.id,qty:x.qty})),payments:lines,orderType:type,
         taxRate,serviceRate,tip,taxInclusive,adjustmentRequestId:adjustment?.status==='approved'?adjustment.id:null
       })})
       setPaymentOpen(false);setCart([]);setAdjustment(null);await load();setSuccess({sale:out.sale,payments:out.payments||lines,existing:false})
     }
   }finally{setBusy(false)}
 }
 async function requestAdjustment(){
   if(!cart.length||!adjustReason.trim())return
   if(adjustType==='discount'&&!(adjustAmount>0||adjustPercent>0))return
   setBusy(true)
   try{
     const out=await api('/transaction-adjustments/request',{method:'POST',body:JSON.stringify({
       sourceType:'pos_draft',adjustmentType:adjustType,baseAmount:subtotal,
       requestedAmount:adjustType==='discount'?adjustAmount:0,requestedPercent:adjustType==='discount'?adjustPercent:0,
       reason:adjustReason,urgent:adjustUrgent
     })})
     setAdjustment(out.adjustment)
     setAdjustMessage((adjustType==='foc'?'FOC':'Discount')+' request '+out.adjustment.reference_no+' is awaiting management approval.')
     setAdjustReason('');setAdjustAmount(0);setAdjustPercent(0);setAdjustUrgent(false)
   }finally{setBusy(false)}
 }
 async function checkApproval(){
   if(!adjustment)return
   const next=await api('/transaction-adjustments/'+adjustment.id)
   setAdjustment(next)
   setAdjustMessage(next.status==='approved'?'Approved. This adjustment is ready for one checkout.':next.status==='rejected'?'Management rejected this adjustment.':'Still awaiting management approval.')
 }

 return <div>
  <PageHeading
    eyebrow="Fast checkout"
    title="Point of Sale"
    sub="Live menu, controlled discounts, accurate charges, split tenders and partial-payment recovery."
    action={<div className="flex gap-2">
      <button onClick={openBalances} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><Clock3 size={16}/>Open Balances</button>
      <select value={type} onChange={e=>setType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><option value="counter">Counter</option><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option><option value="delivery">Delivery</option></select>
    </div>}
  />

  <div className="grid xl:grid-cols-[1fr_410px] gap-4">
    <Panel title="Menu" sub={shown.length+' items available'}>
      <div className="flex gap-2 overflow-x-auto pb-3">{cats.map(c=><button key={c} onClick={()=>setCategory(c)} className={'whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold '+(category===c?'bg-slate-950 text-white':'bg-slate-100 text-slate-600')}>{c}</button>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3 mt-2">{shown.map(p=><button key={p.id} onClick={()=>add(p)} className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#22A53A] hover:shadow-lg transition"><div className="h-24 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 grid place-items-center"><UtensilsCrossed className="text-slate-300" size={28}/></div><b className="block mt-3 line-clamp-2">{p.name}</b><span className="text-xs text-slate-400">{p.category_name||'Other'}</span><div className="mt-3 font-black text-[#169B36]">{money(p.resolved_price,currency)}</div></button>)}</div>
    </Panel>

    <Panel title="Current sale" sub={cart.reduce((n,x)=>n+x.qty,0)+' item(s)'} action={<button onClick={()=>setChargesOpen(true)} disabled={!cart.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"><SlidersHorizontal size={14}/>Charges</button>}>
      <div className="space-y-1 min-h-48">{cart.length?cart.map((x,i)=><div key={x.id} className="flex gap-3 items-center py-3 border-b border-slate-100"><div className="flex-1"><b className="text-sm">{x.name}</b><div className="text-xs text-slate-400">{money(x.price,currency)}</div></div><div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1"><button onClick={()=>qty(i,-1)} className="h-7 w-7 rounded-md bg-white">−</button><b className="w-5 text-center text-sm">{x.qty}</b><button onClick={()=>qty(i,1)} className="h-7 w-7 rounded-md bg-white">+</button></div><b className="text-sm">{money(x.price*x.qty,currency)}</b></div>):<div className="h-48 grid place-items-center text-center text-slate-400"><div><ShoppingCart className="mx-auto mb-2"/><span className="text-sm">Tap menu items to start a sale</span></div></div>}</div>

      <div className="mt-4 rounded-2xl bg-slate-950 text-white p-5">
        <div className="grid grid-cols-2 gap-y-1 text-xs">
          <span className="text-slate-400">Subtotal</span><span className="text-right">{money(subtotal,currency)}</span>
          {discount>0&&<><span className="text-slate-400">{foc?'FOC':'Approved discount'}</span><span className="text-right text-emerald-300">− {money(discount,currency)}</span></>}
          {service>0&&<><span className="text-slate-400">Service charge</span><span className="text-right">{money(service,currency)}</span></>}
          {tax>0&&<><span className="text-slate-400">Tax {taxInclusive?'(inclusive)':''}</span><span className="text-right">{money(tax,currency)}</span></>}
          {appliedTip>0&&<><span className="text-slate-400">Tip</span><span className="text-right">{money(appliedTip,currency)}</span></>}
        </div>
        <div className="mt-3 border-t border-white/10 pt-3"><div className="flex justify-between text-sm text-slate-400"><span>Payable</span><span>{cart.reduce((n,x)=>n+x.qty,0)} items</span></div><div className="mt-2 text-2xl font-black">{money(finalTotal,currency)}</div></div>
        {adjustment&&<div className="mt-2 text-[11px]"><Badge tone={adjustment.status==='approved'?'green':adjustment.status==='rejected'?'red':'amber'}>{nice(adjustment.status)} · {adjustment.reference_no}</Badge></div>}
        <button disabled={!cart.length||busy||(adjustment?.status==='pending')} onClick={startNewPayment} className="mt-4 w-full rounded-xl bg-[#22A53A] text-white py-3 font-black disabled:opacity-40">{busy?'Processing…':foc&&approved?'Complete Approved FOC':'Take Payment'}</button>
      </div>
    </Panel>
  </div>

  <PaymentModal
    open={paymentOpen}
    title={selectedSale?'Pay Balance · '+selectedSale.receipt_no:'Settle Current Sale'}
    total={Number(selectedSale?.total??finalTotal)}
    amountPaid={Number(selectedSale?.amount_paid||0)}
    currency={currency}
    busy={busy}
    onClose={()=>{setPaymentOpen(false);setSelectedSale(null)}}
    onSubmit={submitPayment}
  />

  {chargesOpen&&<Modal title="Charges & Discount Control" onClose={()=>setChargesOpen(false)}>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Tax rate (%)"><input className="control" type="number" min="0" step="0.01" value={taxRate} onChange={e=>setTaxRate(Number(e.target.value))}/></Field>
      <Field label="Tax mode"><select className="control" value={taxInclusive?'inclusive':'exclusive'} onChange={e=>setTaxInclusive(e.target.value==='inclusive')}><option value="exclusive">Exclusive · add to total</option><option value="inclusive">Inclusive · in item prices</option></select></Field>
      <Field label="Service charge (%)"><input className="control" type="number" min="0" step="0.01" value={serviceRate} onChange={e=>setServiceRate(Number(e.target.value))}/></Field>
      <Field label="Tip"><input className="control" type="number" min="0" step="0.01" value={tip} onChange={e=>setTip(Number(e.target.value))}/></Field>
    </div>

    <div className="my-5 h-px bg-slate-200"/>
    <div className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Management-controlled adjustment</div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button onClick={()=>setAdjustType('discount')} className={'rounded-xl border px-3 py-2.5 text-sm font-bold '+(adjustType==='discount'?'border-[#22A53A] bg-green-50 text-[#169B36]':'border-slate-200')}>Discount</button>
      <button onClick={()=>setAdjustType('foc')} className={'rounded-xl border px-3 py-2.5 text-sm font-bold '+(adjustType==='foc'?'border-[#22A53A] bg-green-50 text-[#169B36]':'border-slate-200')}>FOC</button>
    </div>
    {adjustType==='discount'&&<div className="mt-3 grid grid-cols-2 gap-3">
      <Field label="Fixed amount"><input className="control" type="number" min="0" step="0.01" value={adjustAmount||''} onChange={e=>{setAdjustAmount(Number(e.target.value));if(Number(e.target.value)>0)setAdjustPercent(0)}}/></Field>
      <Field label="Or percent (%)"><input className="control" type="number" min="0" max="100" step="0.01" value={adjustPercent||''} onChange={e=>{setAdjustPercent(Number(e.target.value));if(Number(e.target.value)>0)setAdjustAmount(0)}}/></Field>
    </div>}
    <label className="mt-3 block text-sm font-semibold text-slate-700">Reason<textarea className="control min-h-20" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Why is this adjustment required?"/></label>
    <label className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800"><input type="checkbox" checked={adjustUrgent} onChange={e=>setAdjustUrgent(e.target.checked)}/>Mark approval as urgent</label>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button onClick={requestAdjustment} disabled={busy||!adjustReason.trim()||(adjustType==='discount'&&!(adjustAmount>0||adjustPercent>0))} className="rounded-xl bg-[#22A53A] py-3 font-bold text-white disabled:opacity-40">Request Approval</button>
      <button onClick={checkApproval} disabled={!adjustment} className="rounded-xl border border-slate-200 py-3 font-bold disabled:opacity-40">Check Approval</button>
    </div>
    {adjustMessage&&<div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{adjustMessage}</div>}
  </Modal>}

  {balancesOpen&&<Modal title="Open Sale Balances" onClose={()=>setBalancesOpen(false)}>
    <div className="max-h-[520px] overflow-y-auto space-y-2">
      {balances.length?balances.map(s=><div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><b className="text-sm">{s.receipt_no}</b><div className="mt-1 text-[11px] text-slate-400">{new Date(s.created_at).toLocaleString()} · {nice(s.order_type)}</div><div className="mt-1 flex gap-2"><Badge tone="amber">{nice(s.payment_status)}</Badge><span className="text-xs text-slate-500">{money(s.amount_paid,currency)} paid</span></div></div><div className="text-right"><div className="text-xs text-slate-400">Balance</div><div className="font-black text-amber-600">{money(s.balance_due,currency)}</div><button onClick={()=>{setSelectedSale(s);setBalancesOpen(false);setPaymentOpen(true)}} className="mt-2 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">Pay balance</button></div></div>):<div className="py-10 text-center text-sm text-slate-400">No unpaid or partially paid sales.</div>}
    </div>
  </Modal>}

  {success&&<Modal title={success.sale.payment_status==='paid'?'Payment Complete':'Partial Payment Posted'} onClose={()=>setSuccess(null)}>
    <div className="rounded-2xl bg-slate-950 p-5 text-white">
      <div className="text-xs text-slate-400">Receipt</div><div className="mt-1 text-lg font-black">{success.sale.receipt_no}</div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div><div className="text-xs text-slate-400">Paid</div><div className="font-black text-emerald-300">{money(success.sale.amount_paid,currency)}</div></div><div><div className="text-xs text-slate-400">Balance</div><div className="font-black text-amber-300">{money(success.sale.balance_due,currency)}</div></div></div>
    </div>
    <div className="mt-4 text-sm text-slate-500">{success.sale.payment_status==='paid'?'The sale is fully settled.':'The sale remains open in Open Balances for later collection.'}</div>
  </Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
