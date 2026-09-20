import { useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Landmark, Plus, Smartphone, Trash2 } from 'lucide-react'
import { money } from '../api'
import { Modal } from '../components'

export type PaymentLine={
  id:number
  method:string
  amount:number
  tenderedAmount:number
  reference:string
}

type Props={
  open:boolean
  title:string
  total:number
  amountPaid?:number
  currency:string
  busy?:boolean
  onClose:()=>void
  onSubmit:(lines:Omit<PaymentLine,'id'>[])=>Promise<void>|void
}

const METHODS=[
  {value:'cash',label:'Cash',icon:Banknote},
  {value:'mtn momo',label:'MTN MoMo',icon:Smartphone},
  {value:'airtel money',label:'Airtel Money',icon:Smartphone},
  {value:'card',label:'Card',icon:CreditCard},
  {value:'bank transfer',label:'Bank Transfer',icon:Landmark},
]

const createLine=(id:number,amount=0,tenderedAmount=0):PaymentLine=>({id,method:'cash',amount,tenderedAmount,reference:''})

export default function PaymentModal({open,title,total,amountPaid=0,currency,busy=false,onClose,onSubmit}:Props){
  const balance=Math.max(0,Number(total)-Number(amountPaid||0))
  const [lines,setLines]=useState<PaymentLine[]>([])
  const [error,setError]=useState('')

  useEffect(()=>{
    if(open){setLines([createLine(Date.now())]);setError('')}
  },[open,balance])

  const proposed=useMemo(()=>lines.reduce((n,x)=>n+Number(x.amount||0),0),[lines])
  const remaining=Math.max(0,balance-proposed)
  const change=useMemo(()=>lines.reduce((n,x)=>n+(x.method==='cash'?Math.max(0,Number(x.tenderedAmount||0)-Number(x.amount||0)):0),0),[lines])
  const paidEnough=remaining<=0.005&&proposed>0

  const dueBefore=(id:number,current:PaymentLine[])=>{
    const other=current.filter(x=>x.id!==id).reduce((n,x)=>n+Math.max(0,Number(x.amount||0)),0)
    return Math.max(0,Math.round((balance-other)*100)/100)
  }

  if(!open)return null

  const patch=(id:number,patch:Partial<PaymentLine>)=>setLines(v=>v.map(x=>x.id===id?{...x,...patch}:x))
  const changeMethod=(id:number,method:string)=>setLines(v=>v.map(x=>{
    if(x.id!==id)return x
    const due=dueBefore(id,v)
    if(method==='cash')return {...x,method,amount:0,tenderedAmount:0,reference:''}
    return {...x,method,amount:due,tenderedAmount:due,reference:''}
  }))
  const setCashReceived=(id:number,value:number)=>setLines(v=>v.map(x=>{
    if(x.id!==id)return x
    const due=dueBefore(id,v),received=Math.max(0,value),applied=Math.min(received,due)
    return {...x,tenderedAmount:received,amount:applied}
  }))
  const setNonCashReceived=(id:number,value:number)=>setLines(v=>v.map(x=>{
    if(x.id!==id)return x
    const due=dueBefore(id,v),received=Math.max(0,value)
    return {...x,amount:Math.min(received,due),tenderedAmount:Math.min(received,due)}
  }))
  const add=()=>setLines(v=>{
    const allocated=v.reduce((n,x)=>n+Math.max(0,Number(x.amount||0)),0)
    const due=Math.max(0,Math.round((balance-allocated)*100)/100)
    if(due<=0.005||allocated<=0.005||v.length>=6)return v
    return [...v,createLine(Date.now()+v.length,due,due)]
  })
  const remove=(id:number)=>setLines(v=>v.filter(x=>x.id!==id))

  async function submit(){
    setError('')
    const clean=lines
      .map(x=>({method:x.method,amount:Number(x.amount||0),tenderedAmount:x.method==='cash'?Number(x.tenderedAmount||0):Number(x.amount||0),reference:x.reference.trim()}))
      .filter(x=>x.amount>0)
    if(!clean.length){setError('Enter at least one received payment amount.');return}
    if(proposed>balance+0.005){setError('Payment exceeds the outstanding balance.');return}
    if(remaining>0.005){setError(money(remaining,currency)+' is still unpaid. Add another payment method or receive the remaining amount.');return}
    try{
      await onSubmit(clean)
    }catch(e:any){
      setError(e?.message||'Payment could not be posted.')
    }
  }

  return <Modal title={title} onClose={onClose} size="lg">
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"><div className="text-[10.5px] text-slate-500">Bill total</div><div className="mt-1 text-[15px] font-semibold text-slate-900">{money(total,currency)}</div></div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"><div className="text-[10.5px] text-slate-500">Already paid</div><div className="mt-1 text-[15px] font-semibold text-slate-900">{money(amountPaid,currency)}</div></div>
      <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3.5 py-3"><div className="text-[10.5px] text-slate-500">Outstanding</div><div className="mt-1 text-[15px] font-semibold text-[var(--brand-primary)]">{money(balance,currency)}</div></div>
    </div>

    <div className="mt-3 max-h-[52vh] space-y-2.5 overflow-y-auto pr-1 sm:max-h-[46vh]">
      {lines.map((line,index)=>{
        const meta=METHODS.find(x=>x.value===line.method)||METHODS[0]
        const Icon=meta.icon
        return <div key={line.id} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,.03)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5"><Icon size={16} className="text-[var(--brand-primary)]"/><div><div className="text-[12.5px] font-semibold text-slate-800">Payment {index+1}</div><div className="text-[10.5px] text-slate-400">{meta.label}</div></div></div>
            {lines.length>1&&<button onClick={()=>remove(line.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button>}
          </div>

          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">Payment method
              <select value={line.method} onChange={e=>changeMethod(line.id,e.target.value)} className="control">
                {METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <div>
              <div className="text-xs font-medium text-slate-600">Amount due</div>
              <div className="mt-[.35rem] flex min-h-[42px] items-center rounded-[.65rem] border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800">{money(dueBefore(line.id,lines),currency)}</div>
            </div>
            {line.method==='cash'?<label className="text-xs font-medium text-slate-600">Cash received
              <input type="number" min="0" step="0.01" value={line.tenderedAmount||''} onChange={e=>setCashReceived(line.id,Number(e.target.value))} className="control" placeholder="Enter cash received"/>
            </label>:<label className="text-xs font-medium text-slate-600">Amount received
              <input type="number" min="0" step="0.01" value={line.amount||''} onChange={e=>setNonCashReceived(line.id,Number(e.target.value))} className="control" placeholder="Enter amount received"/>
            </label>}
            {line.method!=='cash'&&<label className="text-xs font-medium text-slate-600">Reference / transaction ID
              <input value={line.reference} onChange={e=>patch(line.id,{reference:e.target.value})} className="control" placeholder="Optional reference"/>
            </label>}
          </div>
          {line.method==='cash'&&Number(line.tenderedAmount)>dueBefore(line.id,lines)&&<div className="mt-2 text-right text-xs font-medium text-[var(--brand-primary)]">Change: {money(Number(line.tenderedAmount)-dueBefore(line.id,lines),currency)}</div>}
        </div>
      })}
    </div>

    <div className="sticky bottom-0 z-10 -mx-4 mt-3 border-t border-slate-100 bg-white px-4 pb-1 pt-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0"><div className="flex flex-wrap items-center justify-between gap-3">
      <button onClick={add} disabled={proposed<=0.005||remaining<=0.005||lines.length>=6} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Plus size={14}/>Add payment method</button>
      <div className="text-right">
        <div className="text-[11px] text-slate-400">Balance remaining</div>
        <div className={'text-lg font-semibold '+(paidEnough?'text-[var(--brand-primary)]':'text-slate-700')}>{paidEnough?'Fully covered':money(remaining,currency)+' still due'}</div>
        {change>0&&<div className="text-xs font-medium text-[var(--brand-primary)]">{money(change,currency)} change</div>}
      </div>
    </div>

    {error&&<div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-700">{error}</div>}

    <button onClick={submit} disabled={busy||!paidEnough} className="mt-3 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[13px] font-semibold text-white transition hover:opacity-95 disabled:opacity-40">
      {busy?'Posting payment…':'Complete Payment'}
    </button></div>
  </Modal>
}
