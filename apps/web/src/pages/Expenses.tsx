import { useEffect, useState } from 'react'
import { Plus, Eye, FileText } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Panel, DataTable, Badge, Loading, Modal } from '../components'

export default function Expenses({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 const [open,setOpen]=useState(false),[preview,setPreview]=useState(false),[saving,setSaving]=useState(false)
 const [category,setCategory]=useState('General'),[description,setDescription]=useState(''),[amount,setAmount]=useState(0),[date,setDate]=useState('')
 const load=()=>api('/expenses').then(setRows)
 useEffect(()=>{load()},[])
 async function save(){
   if(!description.trim()||!(amount>0))return
   setSaving(true)
   try{
     await api('/expenses',{method:'POST',body:JSON.stringify({category,description,amount,expenseDate:date||null})})
     setOpen(false);setPreview(false);setCategory('General');setDescription('');setAmount(0);setDate('');await load()
   }finally{setSaving(false)}
 }
 if(!rows)return <Loading/>
 return <div>
   <PageHeading eyebrow="Financial control" title="Expenses & Cost Register" sub="Manual operating expenses and automatically reconciled system costs." action={<button onClick={()=>setOpen(true)} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>Record Expense</button>}/>
   <Panel title="Expense register" sub={rows.length+' recent entries'}>
     <DataTable head={['Reference','Date','Category','Description','Source','Treatment','Amount','Document']} rows={rows.map(x=>[
       <b>{x.reference_no||'EXP-'+x.id}</b>,
       String(x.expense_date).slice(0,10),
       x.category,
       <div><span>{x.description}</span>{x.supplier_name&&<div className="text-[11px] text-slate-400">{x.supplier_name}</div>}</div>,
       x.auto_generated?<Badge tone="blue">Auto · {x.source_type}</Badge>:<Badge>Manual</Badge>,
       nice(x.accounting_treatment),
       <b>{money(x.amount,currency)}</b>,
       <button onClick={()=>openPdf('/documents/expense/'+x.id+'/pdf')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600" title="Open PDF"><FileText size={15}/></button>
     ])}/>
   </Panel>

   {open&&<Modal title={preview?'Preview Expense Voucher':'Record Expense'} onClose={()=>setOpen(false)}>
     {!preview?<div className="space-y-4">
       <div className="grid sm:grid-cols-2 gap-3">
         <label className="text-sm font-semibold text-slate-700">Category<input value={category} onChange={e=>setCategory(e.target.value)} className="control"/></label>
         <label className="text-sm font-semibold text-slate-700">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="control"/></label>
       </div>
       <label className="text-sm font-semibold text-slate-700">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} className="control min-h-24" placeholder="What was this expense for?"/></label>
       <label className="text-sm font-semibold text-slate-700">Amount<input type="number" min="0" step="0.01" value={amount||''} onChange={e=>setAmount(Number(e.target.value))} className="control"/></label>
       <div className="flex justify-end gap-2 pt-2"><button onClick={()=>setPreview(true)} disabled={!description.trim()||!(amount>0)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold disabled:opacity-40"><Eye size={15} className="inline mr-1"/>Preview</button><button onClick={save} disabled={saving||!description.trim()||!(amount>0)} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-40">{saving?'Saving…':'Save Expense'}</button></div>
     </div>:<div>
       <div className="rounded-2xl border border-slate-200 overflow-hidden">
         <div className="bg-slate-950 text-white p-5"><div className="text-xs text-slate-400">EXPENSE / COST VOUCHER PREVIEW</div><div className="font-black text-lg mt-1">Unsaved Expense Voucher</div></div>
         <div className="p-5 space-y-3">
           <div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">Category</span><b className="block mt-1">{category||'General'}</b></div><div><span className="text-slate-400">Date</span><b className="block mt-1">{date||new Date().toISOString().slice(0,10)}</b></div></div>
           <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-400">Description</div><div className="mt-1 font-semibold">{description}</div></div>
           <div className="text-right"><div className="text-xs text-slate-400">AMOUNT</div><div className="text-2xl font-black">{money(amount,currency)}</div></div>
         </div>
       </div>
       <div className="mt-4 flex justify-end gap-2"><button onClick={()=>setPreview(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Back</button><button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold">{saving?'Saving…':'Save Expense'}</button></div>
     </div>}
   </Modal>}
 </div>
}
