import { useEffect, useState } from 'react'
import { CreditCard, Eye, Plus, WalletCards, Heart, Star } from 'lucide-react'
import { api, money, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

export default function Customers({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 const [createOpen,setCreateOpen]=useState(false),[detail,setDetail]=useState<any>(null),[detailOpen,setDetailOpen]=useState(false)
 const [creditOpen,setCreditOpen]=useState(false),[payOpen,setPayOpen]=useState(false),[crmOpen,setCrmOpen]=useState(false),[loyaltyOpen,setLoyaltyOpen]=useState(false)
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState('')
 const [creditEnabled,setCreditEnabled]=useState(false),[creditLimit,setCreditLimit]=useState(0)
 const [payAmount,setPayAmount]=useState(0),[payMethod,setPayMethod]=useState('cash'),[payReference,setPayReference]=useState(''),[payTendered,setPayTendered]=useState(0)
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [birthday,setBirthday]=useState(''),[crmNotes,setCrmNotes]=useState(''),[preferences,setPreferences]=useState(''),[allergies,setAllergies]=useState(''),[loyaltyTier,setLoyaltyTier]=useState('Standard'),[loyaltyPoints,setLoyaltyPoints]=useState(0),[loyaltyNote,setLoyaltyNote]=useState('')

 const load=()=>api('/customers').then(setRows)
 useEffect(()=>{load()},[])

 async function create(){
   if(!name.trim())return
   setBusy(true)
   try{
     await api('/customers',{method:'POST',body:JSON.stringify({name,phone,email,creditEnabled,creditLimit})})
     setCreateOpen(false);setName('');setPhone('');setEmail('');setCreditEnabled(false);setCreditLimit(0);await load()
   }finally{setBusy(false)}
 }
 async function openDetail(id:number){
   const [ledger,profile]=await Promise.all([api('/customers/'+id+'/ledger'),api('/customers/'+id+'/profile').catch(()=>null)])
   setDetail({...ledger,profile:profile?.customer||ledger.customer,loyalty:profile?.loyalty||[]});setDetailOpen(true);setMessage('')
 }
 function openCredit(){
   setCreditEnabled(!!detail.customer.credit_enabled);setCreditLimit(Number(detail.customer.credit_limit||0));setCreditOpen(true);setMessage('')
 }
 async function saveCredit(){
   setBusy(true)
   try{
     await api('/customers/'+detail.customer.id+'/credit',{method:'PUT',body:JSON.stringify({creditEnabled,creditLimit})})
     setCreditOpen(false);await openDetail(detail.customer.id);await load()
   }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 function openPayment(){
   const balance=Number(detail.customer.balance||0);setPayAmount(balance);setPayTendered(balance);setPayMethod('cash');setPayReference('');setPayOpen(true);setMessage('')
 }
 async function receivePayment(){
   if(!(payAmount>0))return
   setBusy(true)
   try{
     await api('/customers/'+detail.customer.id+'/account-payments',{method:'POST',body:JSON.stringify({amount:payAmount,method:payMethod,tenderedAmount:payMethod==='cash'?payTendered:payAmount,reference:payReference})})
     setPayOpen(false);await openDetail(detail.customer.id);await load()
   }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 function openCrm(){
   const c=detail.profile||detail.customer;setBirthday(c.birthday?String(c.birthday).slice(0,10):'');setCrmNotes(c.notes||'');setPreferences(c.preferences||'');setAllergies(c.allergies||'');setLoyaltyTier(c.loyalty_tier||'Standard');setCrmOpen(true)
 }
 async function saveCrm(){
   setBusy(true);try{await api('/customers/'+detail.customer.id+'/crm',{method:'PUT',body:JSON.stringify({birthday:birthday||null,notes:crmNotes||null,preferences:preferences||null,allergies:allergies||null,loyaltyTier})});setCrmOpen(false);await openDetail(detail.customer.id);await load()}finally{setBusy(false)}
 }
 async function adjustLoyalty(){
   if(!loyaltyPoints)return
   setBusy(true);try{await api('/customers/'+detail.customer.id+'/loyalty',{method:'POST',body:JSON.stringify({points:loyaltyPoints,eventType:'manual_adjustment',notes:loyaltyNote||null})});setLoyaltyOpen(false);setLoyaltyPoints(0);setLoyaltyNote('');await openDetail(detail.customer.id);await load()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }

 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Customer accounts" title="Customers & Credit" sub="Customer records, controlled credit limits, outstanding balances and account-payment allocation." action={<button onClick={()=>setCreateOpen(true)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"><Plus size={16} className="inline mr-1"/>New Customer</button>}/>
  <Panel title="Customers" sub={rows.length+' customer accounts'}>
    <DataTable head={['Customer','Contact','Loyalty','Credit','Outstanding','Action']} rows={rows.map(x=>[
      <b>{x.name}</b>,
      <div><div>{x.phone||'-'}</div><div className="text-[11px] text-slate-400">{x.email||''}</div></div>,
      <div><div className="text-[11px] font-semibold">{Number(x.loyalty_points||0)} pts</div><div className="text-[9px] text-slate-400">{x.loyalty_tier||'Standard'}</div></div>,
      x.credit_enabled?<Badge tone="green">Enabled</Badge>:<Badge>Cash only</Badge>,
      <b className={Number(x.balance)>0?'text-amber-600':''}>{money(x.balance,currency)}</b>,
      <button onClick={()=>openDetail(Number(x.id))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"><Eye size={14}/>View</button>
    ])}/>
  </Panel>

  {createOpen&&<Modal title="New Customer" onClose={()=>setCreateOpen(false)}>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Customer name"><input className="control" value={name} onChange={e=>setName(e.target.value)}/></Field>
      <Field label="Phone"><input className="control" value={phone} onChange={e=>setPhone(e.target.value)}/></Field>
      <Field label="Email"><input className="control" value={email} onChange={e=>setEmail(e.target.value)}/></Field>
      <Field label="Credit policy"><select className="control" value={creditEnabled?'enabled':'disabled'} onChange={e=>setCreditEnabled(e.target.value==='enabled')}><option value="disabled">Cash / immediate payment only</option><option value="enabled">Allow customer credit</option></select></Field>
      {creditEnabled&&<Field label="Credit limit"><input className="control" type="number" min="0" step="0.01" value={creditLimit} onChange={e=>setCreditLimit(Number(e.target.value))}/></Field>}
    </div>
    <button onClick={create} disabled={busy||!name.trim()} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-medium text-white disabled:opacity-40">{busy?'Saving…':'Create Customer'}</button>
  </Modal>}

  {detailOpen&&detail&&<Modal title={detail.customer.name+' · Account'} onClose={()=>setDetailOpen(false)}>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Kpi label="Outstanding" value={money(detail.customer.balance,currency)} tone={Number(detail.customer.balance)>0?'amber':'green'}/>
      <Kpi label="Credit limit" value={money(detail.customer.credit_limit,currency)}/>
      <Kpi label="Loyalty" value={String(detail.profile?.loyalty_points||0)+' pts'} tone="green"/>
      <Kpi label="Visits" value={String(detail.profile?.visit_count||0)}/>
    </div>
    {(detail.profile?.allergies||detail.profile?.preferences)&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{detail.profile?.allergies&&<div className="rounded-xl border border-red-100 bg-red-50 p-3"><div className="text-[9px] font-semibold uppercase tracking-wider text-red-500">Allergies</div><div className="mt-1 text-[11px] text-red-700">{detail.profile.allergies}</div></div>}{detail.profile?.preferences&&<div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Preferences</div><div className="mt-1 text-[11px] text-slate-600">{detail.profile.preferences}</div></div>}</div>}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button onClick={openCrm} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[11px] font-medium"><Heart size={14}/>Guest Profile</button>
      <button onClick={()=>{setLoyaltyPoints(0);setLoyaltyNote('');setLoyaltyOpen(true)}} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[11px] font-medium"><Star size={14}/>Loyalty</button>
      <button onClick={openCredit} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[11px] font-medium"><CreditCard size={14}/>Credit</button>
      <button onClick={openPayment} disabled={Number(detail.customer.balance)<=0.005} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] py-2.5 text-[11px] font-medium text-white disabled:opacity-40"><WalletCards size={14}/>Payment</button>
    </div>
    <div className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Outstanding / recent sales</div>
    <div className="mt-2 max-h-44 overflow-y-auto"><DataTable head={['Receipt','Total','Paid','Due','Status']} rows={detail.sales.slice(0,30).map((s:any)=>[<b>{s.receipt_no}</b>,money(s.total,currency),money(s.amount_paid,currency),money(s.balance_due,currency),<Badge tone={s.payment_status==='paid'?'green':'amber'}>{nice(s.payment_status)}</Badge>])}/></div>
    <div className="mt-5 text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Ledger</div>
    <div className="mt-2 max-h-52 overflow-y-auto"><DataTable head={['Date','Entry','Reference','Debit','Credit','Balance']} rows={detail.ledger.slice(0,80).map((x:any)=>[new Date(x.created_at).toLocaleDateString(),nice(x.entry_type),x.reference_no||'-',Number(x.debit)>0?money(x.debit,currency):'-',Number(x.credit)>0?money(x.credit,currency):'-',money(x.balance_after,currency)])}/></div>
  </Modal>}

  {crmOpen&&detail&&<Modal title="Guest Profile" onClose={()=>!busy&&setCrmOpen(false)} size="md">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Birthday"><input type="date" className="control" value={birthday} onChange={e=>setBirthday(e.target.value)}/></Field>
      <Field label="Loyalty tier"><select className="control" value={loyaltyTier} onChange={e=>setLoyaltyTier(e.target.value)}><option>Standard</option><option>Silver</option><option>Gold</option><option>VIP</option></select></Field>
      <div className="sm:col-span-2"><Field label="Preferences"><textarea className="control min-h-20" value={preferences} onChange={e=>setPreferences(e.target.value)} placeholder="Favourite table, preferred seating, dietary preferences…"/></Field></div>
      <div className="sm:col-span-2"><Field label="Allergies / dietary alerts"><textarea className="control min-h-20" value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Peanuts, shellfish, gluten…"/></Field></div>
      <div className="sm:col-span-2"><Field label="Guest notes"><textarea className="control min-h-20" value={crmNotes} onChange={e=>setCrmNotes(e.target.value)}/></Field></div>
    </div>
    <button onClick={saveCrm} disabled={busy} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Guest Profile</button>
  </Modal>}

  {loyaltyOpen&&detail&&<Modal title="Loyalty Points" onClose={()=>!busy&&setLoyaltyOpen(false)} size="sm">
    <div className="rounded-xl bg-slate-950 p-4 text-white"><div className="text-[9px] text-slate-400">CURRENT POINTS</div><div className="mt-1 text-xl font-semibold">{detail.profile?.loyalty_points||0}</div></div>
    <Field label="Adjustment"><input className="control" type="number" value={loyaltyPoints||''} onChange={e=>setLoyaltyPoints(Number(e.target.value))} placeholder="Use negative value to deduct"/></Field>
    <Field label="Reason"><input className="control" value={loyaltyNote} onChange={e=>setLoyaltyNote(e.target.value)} placeholder="Reason for adjustment"/></Field>
    {message&&<div className="mt-3 rounded-lg bg-red-50 p-3 text-[11px] text-red-700">{message}</div>}
    <button onClick={adjustLoyalty} disabled={busy||!loyaltyPoints} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Post Loyalty Adjustment</button>
  </Modal>}

  {creditOpen&&detail&&<Modal title="Customer Credit Settings" onClose={()=>setCreditOpen(false)}>
    <Field label="Credit access"><select className="control" value={creditEnabled?'enabled':'disabled'} onChange={e=>setCreditEnabled(e.target.value==='enabled')}><option value="disabled">Disabled</option><option value="enabled">Enabled</option></select></Field>
    <Field label="Credit limit"><input className="control" type="number" min="0" step="0.01" value={creditLimit} onChange={e=>setCreditLimit(Number(e.target.value))}/></Field>
    {message&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}
    <button onClick={saveCredit} disabled={busy} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-medium text-white">{busy?'Saving…':'Save Credit Policy'}</button>
  </Modal>}

  {payOpen&&detail&&<Modal title="Receive Customer Account Payment" onClose={()=>setPayOpen(false)}>
    <div className="rounded-xl bg-slate-950 p-4 text-white"><div className="text-xs text-slate-400">Current outstanding balance</div><div className="mt-1 text-2xl font-semibold">{money(detail.customer.balance,currency)}</div></div>
    <div className="mt-3 grid sm:grid-cols-2 gap-3">
      <Field label="Amount"><input className="control" type="number" min="0" max={Number(detail.customer.balance)} step="0.01" value={payAmount||''} onChange={e=>{setPayAmount(Number(e.target.value));if(payMethod==='cash')setPayTendered(Number(e.target.value))}}/></Field>
      <Field label="Method"><select className="control" value={payMethod} onChange={e=>setPayMethod(e.target.value)}><option value="cash">Cash</option><option value="mobile money">Mobile Money</option><option value="card">Card</option><option value="bank transfer">Bank Transfer</option></select></Field>
      {payMethod==='cash'&&<Field label="Cash tendered"><input className="control" type="number" min="0" value={payTendered||''} onChange={e=>setPayTendered(Number(e.target.value))}/></Field>}
      {payMethod!=='cash'&&<Field label="Reference"><input className="control" value={payReference} onChange={e=>setPayReference(e.target.value)} placeholder="Transaction / bank reference"/></Field>}
    </div>
    {payMethod==='cash'&&payTendered>payAmount&&<div className="mt-2 text-right text-sm font-medium text-emerald-600">Change: {money(payTendered-payAmount,currency)}</div>}
    {message&&<div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}
    <button onClick={receivePayment} disabled={busy||!(payAmount>0)} className="mt-4 w-full rounded-xl bg-[var(--brand-primary)] py-3 font-medium text-white disabled:opacity-40">{busy?'Posting…':'Receive & Allocate Payment'}</button>
  </Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="mt-3 block text-[13px] font-medium text-slate-700">{label}{children}</label>}
function Kpi({label,value,tone='slate'}:{label:string;value:string;tone?:string}){const cls=tone==='amber'?'bg-amber-50 text-amber-700':tone==='green'?'bg-emerald-50 text-emerald-700':'bg-slate-50 text-slate-700';return <div className={'rounded-xl p-3 '+cls}><div className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</div><div className="mt-1 text-[13px] font-medium">{value}</div></div>}
