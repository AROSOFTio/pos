import { useEffect, useMemo, useState } from 'react'
import { Banknote, LockKeyhole, Plus, Printer, RefreshCw, UnlockKeyhole, ArrowDownLeft, ArrowUpRight, CircleCheckBig } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Panel, Stat, Loading, Modal, DataTable, Badge } from '../components'

const asArray=(v:any)=>Array.isArray(v)?v:Array.isArray(v?.rows)?v.rows:[]

export default function CashDrawer({currency,onOpened}:{currency:string;onOpened?:()=>void}){
 const [session,setSession]=useState<any>(undefined),[branches,setBranches]=useState<any[]>([]),[terminals,setTerminals]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[history,setHistory]=useState<any[]>([])
 const [openModal,setOpenModal]=useState(false),[closeModal,setCloseModal]=useState(false),[moveModal,setMoveModal]=useState(false)
 const [opening,setOpening]=useState(''),[actual,setActual]=useState(''),[branchId,setBranchId]=useState<number|''>(''),[terminalId,setTerminalId]=useState<number|''>('')
 const [movementType,setMovementType]=useState<'cash_in'|'cash_out'>('cash_out'),[amount,setAmount]=useState(''),[reason,setReason]=useState('')
 const [varianceReason,setVarianceReason]=useState(''),[closingNote,setClosingNote]=useState(''),[denoms,setDenoms]=useState<{value:string;count:string}[]>([])
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('')

 const load=async()=>{
   setError('')
   try{
     const [s,b,t,h]=await Promise.all([api('/cash/current'),api('/branches'),api('/terminals'),api('/cash/history?limit=30').catch(()=>[])])
     setSession(s||null);setBranches(asArray(b));setTerminals(asArray(t));setHistory(asArray(h))
     if(s?.id)setMoves(asArray(await api('/cash/movements?sessionId='+s.id)));else setMoves([])
   }catch(e:any){setError(e.message||'Shift information could not be loaded.');setSession(null)}
 }
 useEffect(()=>{load()},[])

 const selectedTerminals=useMemo(()=>terminals.filter(t=>!branchId||Number(t.branch_id)===Number(branchId)),[terminals,branchId])
 const denominationTotal=useMemo(()=>denoms.reduce((n,x)=>n+(Number(x.value)||0)*(Number(x.count)||0),0),[denoms])
 const physical=denoms.length?denominationTotal:Number(actual||0)
 const expected=Number(session?.expectedCash||0)
 const variance=physical-expected

 function startOpen(){
   setOpening('');setBranchId(branches.length===1?Number(branches[0].id):'');setTerminalId('');setError('');setMessage('');setOpenModal(true)
 }
 async function open(){
   if(!branchId){setError('Choose the branch for this shift.');return}
   setBusy('open');setError('')
   try{
     await api('/cash/open',{method:'POST',body:JSON.stringify({openingCash:Number(opening||0),branchId,terminalId:terminalId||null})})
     setOpenModal(false);setOpening('');await load();setMessage('Shift opened successfully.');onOpened?.()
   }catch(e:any){setError(e.message||'Shift could not be opened.')}finally{setBusy('')}
 }
 function startClose(){
   setActual('');setDenoms([]);setVarianceReason('');setClosingNote('');setError('');setMessage('');setCloseModal(true)
 }
 async function close(){
   if(actual===''&&!denoms.length){setError('Count and enter the physical cash before closing.');return}
   if(Math.abs(variance)>0.005&&!varianceReason.trim()){setError('Enter a reason for the cash variance before closing.');return}
   setBusy('close');setError('')
   try{
     const out=await api('/cash/close',{method:'POST',body:JSON.stringify({actualCash:physical,denominations:denoms.map(x=>({value:Number(x.value||0),count:Number(x.count||0)})).filter(x=>x.value>0&&x.count>0),varianceReason:varianceReason.trim()||null,closingNote:closingNote.trim()||null})})
     setCloseModal(false);setDenoms([]);setActual('');await load();setMessage('Shift closed and reconciled.');await openPdf('/documents/cash-session/'+out.id+'/pdf')
   }catch(e:any){setError(e.message||'Shift could not be closed.')}finally{setBusy('')}
 }
 async function addMove(){
   if(!reason.trim()||Number(amount||0)<=0)return
   setBusy('move');setError('')
   try{
     await api('/cash/movements',{method:'POST',body:JSON.stringify({movementType,amount:Number(amount),reason:reason.trim()})})
     setMoveModal(false);setAmount('');setReason('');await load();setMessage('Shift movement posted.')
   }catch(e:any){setError(e.message||'Cash movement could not be posted.')}finally{setBusy('')}
 }

 if(session===undefined)return <Loading/>

 return <div>
  <PageHeading eyebrow="Shift control" title="Cashier Shifts" sub="Each cashier owns one active shift. Cash payments, refunds and movements are reconciled against that exact shift." action={<button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><RefreshCw size={13}/>Refresh</button>}/>

  {(error||message)&&<div className={'mb-4 rounded-lg border px-3 py-2.5 text-[12px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

  {!session?<div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
    <Panel title="No Active Shift" sub="Open your cashier shift before taking cash payments.">
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-500 shadow-sm"><LockKeyhole size={20}/></div>
        <div className="mt-3 text-[14px] font-semibold text-slate-800">Cashier shift is closed</div>
        <div className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-slate-400">Choose your branch, optional terminal and opening float. Cash checkout is blocked until a shift is open.</div>
        <button onClick={startOpen} className="mt-5 rounded-lg bg-slate-950 px-5 py-3 text-[12px] font-semibold text-white">Open Shift</button>
      </div>
    </Panel>
    <Panel title="Shift Rules" sub="Controls applied automatically.">
      <div className="space-y-2.5">
        <Rule text="Only one open shift is allowed per cashier."/>
        <Rule text="A terminal cannot be shared by two open shifts."/>
        <Rule text="Cash payments are posted to the active cashier shift."/>
        <Rule text="Cash refunds require an open shift and reduce expected cash."/>
        <Rule text="Any cash shortage or overage requires a variance reason."/>
      </div>
    </Panel>
  </div>:<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat label="Shift" value={session.shift_no||('Shift #'+session.id)} sub={(session.branch_name||'Branch')+(session.terminal_name?' · '+session.terminal_name:'')} icon={UnlockKeyhole}/>
      <Stat label="Opening Float" value={money(session.opening_cash||0,currency)} sub="Cash at opening" icon={Banknote} tone="blue"/>
      <Stat label="Cash Sales" value={money(session.cashSales||0,currency)} sub="Cash posted in this shift" icon={ArrowDownLeft} tone="emerald"/>
      <Stat label="Cash Refunds" value={money(session.refunds||0,currency)} sub="Cash returned in this shift" icon={ArrowUpRight} tone="amber"/>
      <Stat label="Expected Cash" value={money(session.expectedCash||0,currency)} sub="Opening + cash sales ± movements − refunds" icon={Banknote} tone="violet"/>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Panel title="Active Shift" sub={'Opened '+new Date(session.opened_at).toLocaleString()+' by '+(session.opened_by||'Cashier')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Cash In" value={money(session.cashIn||0,currency)}/>
          <Mini label="Cash Out" value={money(session.cashOut||0,currency)}/>
          <Mini label="Duration" value={duration(session.opened_at)}/>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={()=>{setMovementType('cash_in');setAmount('');setReason('');setMoveModal(true)}} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700"><Plus size={13} className="mr-1 inline"/>Cash In / Out</button>
          <button onClick={()=>openPdf('/documents/cash-session/'+session.id+'/pdf')} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700"><Printer size={13} className="mr-1 inline"/>X Report Preview</button>
          <button onClick={startClose} className="rounded-lg bg-red-600 px-4 py-2.5 text-[11px] font-semibold text-white">Close & Reconcile Shift</button>
        </div>
      </Panel>

      <Panel title="Tender Breakdown" sub="Payments posted inside this exact shift.">
        {asArray(session.tenders).length?<div className="space-y-2">{asArray(session.tenders).map((t:any)=><div key={t.payment_method} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"><div><div className="text-[11px] font-medium text-slate-700">{nice(t.payment_method)}</div><div className="text-[9px] text-slate-400">{t.transactions} transaction{Number(t.transactions)===1?'':'s'}</div></div><b className="text-[12px] text-slate-800">{money(t.total,currency)}</b></div>)}</div>:<div className="rounded-lg bg-slate-50 p-5 text-center text-[11px] text-slate-400">No payments posted yet.</div>}
      </Panel>
    </div>

    <div className="mt-4"><Panel title="Shift Movements" sub="Manual cash added to or removed from the till during this shift.">
      {moves.length?<DataTable head={['Time','Type','Reason','Amount','By']} rows={moves.map(x=>[new Date(x.created_at).toLocaleString(),<Badge tone={x.movement_type==='cash_in'?'green':'amber'}>{nice(x.movement_type)}</Badge>,x.reason,money(x.amount,currency),x.created_by||'-'])}/>:<div className="py-7 text-center text-[11px] text-slate-400">No cash movements in this shift.</div>}
    </Panel></div>
  </>}

  <div className="mt-4"><Panel title="Recent Shifts" sub="Your recent shift history. Managers with shift permission can view business shift history.">
    {history.length?<DataTable head={['Shift','Cashier','Branch / Terminal','Opened','Closed','Expected','Actual','Variance','Status','']} rows={history.map(x=>[
      x.shift_no||('Shift #'+x.id),x.opened_by||'-',(x.branch_name||'-')+(x.terminal_name?' · '+x.terminal_name:''),new Date(x.opened_at).toLocaleString(),x.closed_at?new Date(x.closed_at).toLocaleString():'—',money(x.expected_cash||0,currency),x.closing_cash==null?'—':money(x.closing_cash,currency),x.variance==null?'—':money(x.variance,currency),<Badge tone={x.status==='open'?'green':'slate'}>{x.status}</Badge>,<button onClick={()=>openPdf('/documents/cash-session/'+x.id+'/pdf')} className="text-[10px] font-semibold text-slate-600">Report</button>
    ])}/>:<div className="py-7 text-center text-[11px] text-slate-400">No previous shifts yet.</div>}
  </Panel></div>

  {openModal&&<Modal title="Open Cashier Shift" onClose={()=>!busy&&setOpenModal(false)} size="md">
    <div className="grid gap-4">
      <Field label="Branch"><select className="control" value={branchId} onChange={e=>{setBranchId(Number(e.target.value)||'');setTerminalId('')}}><option value="">Choose branch</option>{branches.filter(b=>b.active!==false).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Terminal (optional)"><select className="control" value={terminalId} onChange={e=>setTerminalId(Number(e.target.value)||'')} disabled={!branchId}><option value="">No fixed terminal</option>{selectedTerminals.filter(t=>t.active!==false).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label={'Opening float ('+currency+')'}><input className="control" inputMode="decimal" value={opening} onChange={e=>setOpening(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter opening cash"/></Field>
    </div>
    <button onClick={open} disabled={busy==='open'||!branchId} className="mt-5 w-full rounded-lg bg-[#22A53A] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy==='open'?'Opening shift…':'Open Shift & Start Operations'}</button>
  </Modal>}

  {moveModal&&<Modal title="Cash In / Cash Out" onClose={()=>!busy&&setMoveModal(false)}>
    <div className="grid gap-4">
      <Field label="Movement"><select className="control" value={movementType} onChange={e=>setMovementType(e.target.value as any)}><option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option></select></Field>
      <Field label={'Amount ('+currency+')'}><input className="control" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter amount"/></Field>
      <Field label="Reason"><input className="control" value={reason} onChange={e=>setReason(e.target.value)} placeholder={movementType==='cash_in'?'e.g. Additional float':'e.g. Petty cash purchase'}/></Field>
    </div>
    <button onClick={addMove} disabled={busy==='move'||!reason.trim()||Number(amount||0)<=0} className="mt-5 w-full rounded-lg bg-slate-950 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy==='move'?'Posting…':'Post Movement'}</button>
  </Modal>}

  {closeModal&&<Modal title="Close & Reconcile Shift" onClose={()=>!busy&&setCloseModal(false)} size="lg">
    <div className="grid gap-3 sm:grid-cols-3">
      <Mini label="Opening" value={money(session?.opening_cash||0,currency)}/>
      <Mini label="Cash Sales" value={money(session?.cashSales||0,currency)}/>
      <Mini label="Expected Cash" value={money(expected,currency)}/>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Field label={'Physical cash counted ('+currency+')'}><input className="control" inputMode="decimal" value={actual} disabled={denoms.length>0} onChange={e=>setActual(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter actual cash counted"/></Field>
      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-2"><div><div className="text-[11px] font-semibold text-slate-700">Denomination Count</div><div className="text-[9px] text-slate-400">Optional alternative to entering one total.</div></div><button onClick={()=>{setActual('');setDenoms([...denoms,{value:'',count:''}])}} className="text-[10px] font-semibold text-[#22A53A]">+ Add</button></div>
        {denoms.length>0&&<div className="mt-3 space-y-2">{denoms.map((d,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input className="control mt-0" inputMode="decimal" placeholder="Value" value={d.value} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,value:e.target.value.replace(/[^0-9.]/g,'')}:x))}/><input className="control mt-0" inputMode="numeric" placeholder="Count" value={d.count} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,count:e.target.value.replace(/[^0-9]/g,'')}:x))}/><button onClick={()=>setDenoms(denoms.filter((_,k)=>k!==i))} className="px-2 text-slate-400">×</button></div>)}</div>}
        {denoms.length>0&&<div className="mt-3 text-right text-[11px] font-semibold text-slate-700">Count total: {money(denominationTotal,currency)}</div>}
      </div>
    </div>

    <div className={'mt-4 rounded-xl border p-4 '+(Math.abs(variance)<=0.005?'border-emerald-100 bg-emerald-50':'border-amber-100 bg-amber-50')}>
      <div className="flex items-center justify-between"><span className="text-[11px] font-medium text-slate-600">Variance</span><b className={Math.abs(variance)<=0.005?'text-emerald-700':'text-amber-700'}>{money(variance,currency)}</b></div>
      {Math.abs(variance)<=0.005&&<div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700"><CircleCheckBig size={12}/>Cash count balances exactly.</div>}
    </div>

    {Math.abs(variance)>0.005&&<div className="mt-4"><Field label="Variance reason"><textarea className="control min-h-20" value={varianceReason} onChange={e=>setVarianceReason(e.target.value)} placeholder="Explain the cash shortage or overage. Required."/></Field></div>}
    <div className="mt-4"><Field label="Closing note (optional)"><textarea className="control min-h-20" value={closingNote} onChange={e=>setClosingNote(e.target.value)} placeholder="Any shift handover note…"/></Field></div>
    <button onClick={close} disabled={busy==='close'||(actual===''&&!denoms.length)||(Math.abs(variance)>0.005&&!varianceReason.trim())} className="mt-5 w-full rounded-lg bg-red-600 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy==='close'?'Closing shift…':'Close Shift & Print Z Report'}</button>
  </Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{children}</label>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[9.5px] text-slate-400">{label}</div><div className="mt-1 text-[13px] font-semibold text-slate-800">{value}</div></div>}
function Rule({text}:{text:string}){return <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5"><CircleCheckBig size={14} className="mt-0.5 shrink-0 text-emerald-600"/><span className="text-[11px] leading-5 text-slate-600">{text}</span></div>}
function duration(start:string){const ms=Math.max(0,Date.now()-new Date(start).getTime()),mins=Math.floor(ms/60000),h=Math.floor(mins/60),m=mins%60;return h?h+'h '+m+'m':m+'m'}
