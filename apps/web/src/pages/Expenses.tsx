import { useEffect, useMemo, useState } from 'react'
import { Bot, Eye, FileText, Paperclip, PencilLine, Plus, Receipt, Upload, WalletCards } from 'lucide-react'
import { api, money, nice, openPdf, uploadFile } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel, Stat } from '../components'

export default function Expenses({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[accounts,setAccounts]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([])
 const [open,setOpen]=useState(false),[preview,setPreview]=useState(false),[saving,setSaving]=useState(false),[attachTo,setAttachTo]=useState<any|null>(null),[attaching,setAttaching]=useState(false)
 const [category,setCategory]=useState('General'),[description,setDescription]=useState(''),[amount,setAmount]=useState(0),[date,setDate]=useState(''),[paymentMethod,setPaymentMethod]=useState('cash'),[accountId,setAccountId]=useState(''),[branchId,setBranchId]=useState(''),[receipt,setReceipt]=useState<File|null>(null)
 const load=()=>api('/expenses').then(setRows)
 useEffect(()=>{load();api('/accounting/accounts').then((x:any[])=>setAccounts(x.filter(a=>a.is_active&&['expense','cost_of_sales'].includes(a.account_type)))).catch(()=>setAccounts([]));api('/branches').then(setBranches).catch(()=>setBranches([]))},[])
 const selectedAccount=useMemo(()=>accounts.find(a=>String(a.id)===accountId),[accounts,accountId])
 async function save(){
  if(!description.trim()||!(amount>0))return
  setSaving(true)
  try{
   const x=await api('/expenses',{method:'POST',body:JSON.stringify({category,description,amount,expenseDate:date||null,paymentMethod,expenseAccountId:accountId?Number(accountId):null,branchId:branchId?Number(branchId):null})})
   if(receipt)await uploadFile('/expenses/'+x.id+'/attachments',receipt)
   setOpen(false);setPreview(false);setCategory('General');setDescription('');setAmount(0);setDate('');setPaymentMethod('cash');setAccountId('');setBranchId('');setReceipt(null);await load()
  }finally{setSaving(false)}
 }
 async function attach(file:File|null){if(!file||!attachTo)return;setAttaching(true);try{await uploadFile('/expenses/'+attachTo.id+'/attachments',file);setAttachTo(null);await load()}finally{setAttaching(false)}}
 if(!rows)return <Loading/>
 const total=rows.reduce((n,x)=>n+Number(x.amount||0),0),autoRows=rows.filter(x=>x.auto_generated),manualRows=rows.filter(x=>!x.auto_generated)
 return <div>
  <PageHeading eyebrow="Financial control" title="Expenses & Cost Register" sub="Shift-linked operating expenses with ledger posting and receipt evidence." action={<button onClick={()=>setOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="mr-1 inline"/>Record Expense</button>}/>
  <div className="mb-4 grid gap-3 sm:grid-cols-3"><Stat label="Recorded Costs" value={money(total,currency)} sub={rows.length+' entries'} icon={WalletCards}/><Stat label="Automatic" value={autoRows.length} sub="Captured from controlled system activity" icon={Bot} tone="blue"/><Stat label="Manual" value={manualRows.length} sub="Entered by authorised management" icon={PencilLine} tone="violet"/></div>
  <Panel title="Expense register" sub="Every posted manual expense creates a balanced journal entry and can carry receipt evidence.">
   <DataTable head={['Reference','Date','Branch / Shift','Category','Description','Account','Payment','Amount','Evidence','Voucher']} rows={rows.map(x=>[
    <b>{x.reference_no||'EXP-'+x.id}</b>,String(x.expense_date).slice(0,10),
    <div>{x.branch_name||'-'}<div className="text-[9px] text-slate-400">{x.shift_no||'No shift'}</div></div>,
    x.category,<div><span>{x.description}</span>{x.supplier_name&&<div className="text-[10px] text-slate-400">{x.supplier_name}</div>}</div>,
    x.expense_account_code?<div><b>{x.expense_account_code}</b><div className="text-[9px] text-slate-400">{x.expense_account_name}</div></div>:nice(x.accounting_treatment),
    <Badge tone={x.payment_method==='cash'?'green':'blue'}>{nice(x.payment_method||x.source_type||'system')}</Badge>,
    <b>{money(x.amount,currency)}</b>,
    <button onClick={()=>setAttachTo(x)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-600"><Paperclip size={13}/>{Number(x.attachment_count||0)?x.attachment_count:'Add'}</button>,
    <button onClick={()=>openPdf('/documents/expense/'+x.id+'/pdf')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600" title="Open voucher"><FileText size={15}/></button>
   ])}/>
  </Panel>

  {open&&<Modal title={preview?'Preview Expense Voucher':'Record Expense'} onClose={()=>!saving&&setOpen(false)} size="lg">
   {!preview?<div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-[11px] font-medium text-slate-700">Category<input value={category} onChange={e=>setCategory(e.target.value)} className="control"/></label><label className="text-[11px] font-medium text-slate-700">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="control"/></label><label className="text-[11px] font-medium text-slate-700">Branch<select className="control" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">Shift / default branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
    <label className="text-[11px] font-medium text-slate-700">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} className="control min-h-24" placeholder="What was this expense for?"/></label>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-[11px] font-medium text-slate-700">Amount<input type="number" min="0" step="0.01" value={amount||''} onChange={e=>setAmount(Number(e.target.value))} className="control"/></label><label className="text-[11px] font-medium text-slate-700">Paid via<select className="control" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="mtn mobile money">MTN Mobile Money</option><option value="airtel money">Airtel Money</option><option value="card">Card</option><option value="bank transfer">Bank Transfer</option></select></label><label className="text-[11px] font-medium text-slate-700">Expense account<select className="control" value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">General Operating Expense</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.account_code} · {a.name}</option>)}</select></label></div>
    <label className="block text-[11px] font-medium text-slate-700">Receipt / supporting document<div className="mt-1 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"><Receipt size={17} className="text-slate-400"/><input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setReceipt(e.target.files?.[0]||null)} className="min-w-0 text-[10px]"/>{receipt&&<span className="ml-auto max-w-[180px] truncate text-[9px] text-slate-500">{receipt.name}</span>}</div></label>
    {paymentMethod==='cash'&&<div className="rounded-xl bg-amber-50 p-3 text-[10.5px] leading-5 text-amber-800">Cash expenses require an open cashier shift so the cash drawer, accounting journal and shift reconciliation stay aligned.</div>}
    <div className="flex justify-end gap-2 pt-2"><button onClick={()=>setPreview(true)} disabled={!description.trim()||!(amount>0)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium disabled:opacity-40"><Eye size={15} className="mr-1 inline"/>Preview</button><button onClick={save} disabled={saving||!description.trim()||!(amount>0)} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{saving?'Posting…':'Post Expense'}</button></div>
   </div>:<div>
    <div className="overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-900 p-5 text-white"><div className="text-xs text-slate-400">EXPENSE / COST VOUCHER PREVIEW</div><div className="mt-1 text-lg font-semibold">Unsaved Expense Voucher</div></div><div className="space-y-3 p-5"><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-400">Category</span><b className="mt-1 block">{category||'General'}</b></div><div><span className="text-slate-400">Date</span><b className="mt-1 block">{date||new Date().toISOString().slice(0,10)}</b></div><div><span className="text-slate-400">Account</span><b className="mt-1 block">{selectedAccount?selectedAccount.account_code+' · '+selectedAccount.name:'General Operating Expense'}</b></div><div><span className="text-slate-400">Payment</span><b className="mt-1 block">{nice(paymentMethod)}</b></div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-400">Description</div><div className="mt-1 font-semibold">{description}</div></div><div className="text-right"><div className="text-xs text-slate-400">AMOUNT</div><div className="text-2xl font-semibold">{money(amount,currency)}</div>{receipt&&<div className="mt-1 text-[10px] text-emerald-600">Receipt attached · {receipt.name}</div>}</div></div></div>
    <div className="mt-4 flex justify-end gap-2"><button onClick={()=>setPreview(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">Back</button><button onClick={save} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">{saving?'Posting…':'Post Expense'}</button></div>
   </div>}
  </Modal>}
  {attachTo&&<Modal title={'Attach Receipt · '+(attachTo.reference_no||'EXP-'+attachTo.id)} onClose={()=>!attaching&&setAttachTo(null)} size="sm"><div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><Upload size={22} className="mx-auto text-slate-400"/><div className="mt-2 text-[11px] font-medium">Image or PDF, up to 10 MB</div><input disabled={attaching} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>attach(e.target.files?.[0]||null)} className="mt-4 max-w-full text-[10px]"/></div></Modal>}
 </div>
}
