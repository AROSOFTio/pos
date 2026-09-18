import { useEffect, useState } from 'react'
import { Clock3, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { api, money, nice } from '../api'
import { Badge, Modal, PageHeading, Panel } from '../components'
import PaymentModal, { type PaymentLine } from '../components/PaymentModal'

export default function POS({currency}:{currency:string}){
 const [items,setItems]=useState<any[]>([]),[cart,setCart]=useState<any[]>([]),[type,setType]=useState('counter'),[category,setCategory]=useState('All')
 const [busy,setBusy]=useState(false),[paymentOpen,setPaymentOpen]=useState(false),[balancesOpen,setBalancesOpen]=useState(false),[balances,setBalances]=useState<any[]>([])
 const [selectedSale,setSelectedSale]=useState<any>(null),[success,setSuccess]=useState<any>(null)

 const load=()=>api('/menu/available?orderType='+type).then(setItems)
 useEffect(()=>{setCart([]);load()},[type])

 const cats=['All',...Array.from(new Set(items.map(x=>x.category_name||'Other')))]
 const shown=items.filter(x=>category==='All'||(x.category_name||'Other')===category)
 const total=cart.reduce((n,x)=>n+x.price*x.qty,0)

 const add=(p:any)=>setCart(c=>{const i=c.findIndex(x=>x.id===p.id);if(i<0)return [...c,{id:p.id,name:p.name,price:Number(p.resolved_price),qty:1}];return c.map((x,k)=>k===i?{...x,qty:x.qty+1}:x)})
 const qty=(i:number,d:number)=>setCart(c=>c.map((x,k)=>k===i?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0))

 async function openBalances(){
   const rows=await api('/sales')
   setBalances(rows.filter((x:any)=>Number(x.balance_due||0)>0.005&&x.payment_status!=='paid'))
   setBalancesOpen(true)
 }
 function startNewPayment(){if(!cart.length)return;setSelectedSale(null);setPaymentOpen(true)}
 async function submitPayment(lines:Omit<PaymentLine,'id'>[]){
   setBusy(true)
   try{
     if(selectedSale){
       const out=await api('/sales/'+selectedSale.id+'/payments',{method:'POST',body:JSON.stringify({payments:lines})})
       setPaymentOpen(false)
       setSelectedSale(null)
       const rows=await api('/sales')
       setBalances(rows.filter((x:any)=>Number(x.balance_due||0)>0.005&&x.payment_status!=='paid'))
       setSuccess({sale:out.sale,payments:lines,existing:true})
     }else{
       const out=await api('/sales',{method:'POST',body:JSON.stringify({items:cart.map(x=>({productId:x.id,qty:x.qty})),payments:lines,orderType:type})})
       setPaymentOpen(false)
       setCart([])
       await load()
       setSuccess({sale:out.sale,payments:out.payments||lines,existing:false})
     }
   }finally{setBusy(false)}
 }

 return <div>
  <PageHeading
    eyebrow="Fast checkout"
    title="Point of Sale"
    sub="Touch-friendly menu with live availability, split tenders and partial-payment recovery."
    action={<div className="flex gap-2">
      <button onClick={openBalances} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold"><Clock3 size={16}/>Open Balances</button>
      <select value={type} onChange={e=>setType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"><option value="counter">Counter</option><option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option><option value="delivery">Delivery</option></select>
    </div>}
  />

  <div className="grid xl:grid-cols-[1fr_390px] gap-4">
    <Panel title="Menu" sub={shown.length+' items available'}>
      <div className="flex gap-2 overflow-x-auto pb-3">{cats.map(c=><button key={c} onClick={()=>setCategory(c)} className={'whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold '+(category===c?'bg-slate-950 text-white':'bg-slate-100 text-slate-600')}>{c}</button>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3 mt-2">{shown.map(p=><button key={p.id} onClick={()=>add(p)} className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#22A53A] hover:shadow-lg transition"><div className="h-24 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 grid place-items-center"><UtensilsCrossed className="text-slate-300" size={28}/></div><b className="block mt-3 line-clamp-2">{p.name}</b><span className="text-xs text-slate-400">{p.category_name||'Other'}</span><div className="mt-3 font-black text-[#169B36]">{money(p.resolved_price,currency)}</div></button>)}</div>
    </Panel>

    <Panel title="Current sale" sub={cart.reduce((n,x)=>n+x.qty,0)+' item(s)'}>
      <div className="space-y-1 min-h-52">{cart.length?cart.map((x,i)=><div key={x.id} className="flex gap-3 items-center py-3 border-b border-slate-100"><div className="flex-1"><b className="text-sm">{x.name}</b><div className="text-xs text-slate-400">{money(x.price,currency)}</div></div><div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1"><button onClick={()=>qty(i,-1)} className="h-7 w-7 rounded-md bg-white">−</button><b className="w-5 text-center text-sm">{x.qty}</b><button onClick={()=>qty(i,1)} className="h-7 w-7 rounded-md bg-white">+</button></div><b className="text-sm">{money(x.price*x.qty,currency)}</b></div>):<div className="h-52 grid place-items-center text-center text-slate-400"><div><ShoppingCart className="mx-auto mb-2"/><span className="text-sm">Tap menu items to start a sale</span></div></div>}</div>
      <div className="mt-4 rounded-2xl bg-slate-950 text-white p-5"><div className="flex justify-between text-sm text-slate-400"><span>Total</span><span>{cart.reduce((n,x)=>n+x.qty,0)} items</span></div><div className="mt-2 text-2xl font-black">{money(total,currency)}</div><button disabled={!cart.length||busy} onClick={startNewPayment} className="mt-4 w-full rounded-xl bg-[#22A53A] text-white py-3 font-black disabled:opacity-40">{busy?'Processing…':'Take Payment'}</button></div>
    </Panel>
  </div>

  <PaymentModal
    open={paymentOpen}
    title={selectedSale?'Pay Balance · '+selectedSale.receipt_no:'Settle Current Sale'}
    total={Number(selectedSale?.total??total)}
    amountPaid={Number(selectedSale?.amount_paid||0)}
    currency={currency}
    busy={busy}
    onClose={()=>{setPaymentOpen(false);setSelectedSale(null)}}
    onSubmit={submitPayment}
  />

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
