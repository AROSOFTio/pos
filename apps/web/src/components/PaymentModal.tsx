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
  {value:'mobile money',label:'Mobile Money',icon:Smartphone},
  {value:'card',label:'Card',icon:CreditCard},
  {value:'bank transfer',label:'Bank Transfer',icon:Landmark},
]

const createLine=(id:number,amount:number):PaymentLine=>({id,method:'cash',amount,tenderedAmount:amount,reference:''})

export default function PaymentModal({open,title,total,amountPaid=0,currency,busy=false,onClose,onSubmit}:Props){
  const balance=Math.max(0,Number(total)-Number(amountPaid||0))
  const [lines,setLines]=useState<PaymentLine[]>([])
  const [error,setError]=useState('')

  useEffect(()=>{
    if(open){setLines([createLine(Date.now(),balance)]);setError('')}
  },[open,balance])

  const proposed=useMemo(()=>lines.reduce((n,x)=>n+Number(x.amount||0),0),[lines])
  const remaining=Math.max(0,balance-proposed)
  const change=useMemo(()=>lines.reduce((n,x)=>n+(x.method==='cash'?Math.max(0,Number(x.tenderedAmount||0)-Number(x.amount||0)):0),0),[lines])

  if(!open)return null

  const patch=(id:number,patch:Partial<PaymentLine>)=>setLines(v=>v.map(x=>x.id===id?{...x,...patch}:x))
  const add=()=>setLines(v=>[...v,createLine(Date.now()+v.length,remaining)])
  const remove=(id:number)=>setLines(v=>v.filter(x=>x.id!==id))

  async function submit(){
    setError('')
    const clean=lines
      .map(x=>({method:x.method,amount:Number(x.amount||0),tenderedAmount:x.method==='cash'?Number(x.tenderedAmount||0):Number(x.amount||0),reference:x.reference.trim()}))
      .filter(x=>x.amount>0)
    if(!clean.length){setError('Enter at least one payment amount.');return}
    if(proposed>balance+0.005){setError('Payment exceeds the outstanding balance.');return}
    for(const x of clean){
      if(x.method==='cash'&&x.tenderedAmount+0.005<x.amount){setError('Cash tendered cannot be less than the cash payment amount.');return}
    }
    await onSubmit(clean)
  }

  return <Modal title={title} onClose={onClose}>
    <div className="rounded-2xl bg-slate-950 p-4 text-white">
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div><div className="text-slate-400">Bill total</div><div className="mt-1 font-black">{money(total,currency)}</div></div>
        <div><div className="text-slate-400">Already paid</div><div className="mt-1 font-black text-emerald-300">{money(amountPaid,currency)}</div></div>
        <div><div className="text-slate-400">Outstanding</div><div className="mt-1 font-black text-amber-300">{money(balance,currency)}</div></div>
      </div>
    </div>

    <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
      {lines.map((line,index)=>{
        const meta=METHODS.find(x=>x.value===line.method)||METHODS[0]
        const Icon=meta.icon
        return <div key={line.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={17}/></div><div><div className="text-sm font-black">Tender {index+1}</div><div className="text-[11px] text-slate-400">{meta.label}</div></div></div>
            {lines.length>1&&<button onClick={()=>remove(line.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button>}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Payment method
              <select value={line.method} onChange={e=>patch(line.id,{method:e.target.value,tenderedAmount:Number(line.amount||0)})} className="control">
                {METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Amount
              <input type="number" min="0" step="0.01" value={line.amount||''} onChange={e=>patch(line.id,{amount:Number(e.target.value),tenderedAmount:line.method==='cash'?Number(e.target.value):Number(e.target.value)})} className="control"/>
            </label>
            {line.method==='cash'&&<label className="text-xs font-bold text-slate-600">Cash tendered
              <input type="number" min="0" step="0.01" value={line.tenderedAmount||''} onChange={e=>patch(line.id,{tenderedAmount:Number(e.target.value)})} className="control"/>
            </label>}
            {line.method!=='cash'&&<label className="text-xs font-bold text-slate-600">Reference / transaction ID
              <input value={line.reference} onChange={e=>patch(line.id,{reference:e.target.value})} className="control" placeholder="Optional reference"/>
            </label>}
          </div>
          {line.method==='cash'&&Number(line.tenderedAmount)>Number(line.amount)&&<div className="mt-2 text-right text-xs font-bold text-emerald-600">Change: {money(Number(line.tenderedAmount)-Number(line.amount),currency)}</div>}
        </div>
      })}
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <button onClick={add} disabled={remaining<=0.005} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold disabled:opacity-40"><Plus size={15}/>Split tender</button>
      <div className="text-right">
        <div className="text-[11px] text-slate-400">After this payment</div>
        <div className={'text-lg font-black '+(remaining<=0.005?'text-emerald-600':'text-amber-600')}>{remaining<=0.005?'Fully paid':money(remaining,currency)+' due'}</div>
        {change>0&&<div className="text-xs font-bold text-emerald-600">{money(change,currency)} change</div>}
      </div>
    </div>

    {error&&<div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

    <button onClick={submit} disabled={busy||proposed<=0} className="mt-4 w-full rounded-xl bg-[linear-gradient(90deg,#37C516,#22A53A)] py-3.5 font-black text-white shadow-[0_12px_24px_rgba(34,165,58,.18)] disabled:opacity-40">
      {busy?'Posting payment…':remaining<=0.005?'Complete Payment':'Post Partial Payment'}
    </button>
  </Modal>
}
