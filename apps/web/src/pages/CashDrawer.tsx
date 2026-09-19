import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock3, LockKeyhole, Plus, Printer, RefreshCw, UnlockKeyhole } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Panel, Stat, Loading, Modal, DataTable, Badge } from '../components'

const arr=(v:any)=>Array.isArray(v)?v:[]

export default function CashDrawer({currency,onOpened}:{currency:string;onOpened?:()=>void}){
 const [session,setSession]=useState<any>(undefined),[branches,setBranches]=useState<any[]>([]),[terminals,setTerminals]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[history,setHistory]=useState<any[]>([])
 const [openModal,setOpenModal]=useState(false),[closeModal,setCloseModal]=useState(false),[moveModal,setMoveModal]=useState(false)
 const [opening,setOpening]=useState(''),[actual,setActual]=useState(''),[branchId,setBranchId]=useState<number|''>(''),[terminalId,setTerminalId]=useState<number|''>('')
 const [movementType,setMovementType]=useState<'cash_in'|'cash_out'>('cash_out'),[amount,setAmount]=useState(''),[reason,setReason]=useState('')
 const [denoms,setDenoms]=useState<{value:string;count:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')

 const load=async()=>{
   const [s,b,t,h]=await Promise.all([api('/cash/current'),api('/branches').catch(()=>[]),api('/terminals').catch(()=>[]),api('/cash/history').catch(()=>[])])
   setSession(s||null);setBranches(arr(b));setTerminals(arr(t));setHistory(arr(h))
   if(s?.id)setMoves(arr(await api('/cash/movements?sessionId='+s.id).catch(()=>[])));else setMoves([])
 }
 useEffect(()=>{load().catch((e:any)=>{setSession(null);setError(e.message||'Shifts could not be loaded.')})},[])

 const terminalOptions=terminals.filter(t=>!branchId||Number(t.branch_id)===Number(branchId))
 const denominationTotal=useMemo(()=>denoms.reduce((n,x)=>n+(Number(x.value)||0)*(Number(x.count)||0),0),[denoms])
 const physical=denoms.length?denominationTotal:Number(actual||0)
 const expected=Number(session?.expectedCash||0)
 const variance=physical-expected

 function beginOpen(){
   setError('');setMessage('');setOpening('');setTerminalId('')
   const only=branches.length===1?Number(branches[0].id):''
   setBranchId(only);setOpenModal(true)
 }

 async function open(){
   setError('')
   if(branches.length&&!branchId){setError('Select the branch for this shift.');return}
   if(opening!==''&&Number(opening)<0){setError('Opening float cannot be negative.');return}
   setBusy(true)
   try{
     await api('/cash/open',{method:'POST',body:JSON.stringify({openingCash:Number(opening||0),branchId:branchId||null,terminalId:terminalId||null})})
     setOpenModal(false);setOpening('');await load();setMessage('Shift opened successfully.');onOpened?.()
   }catch(e:any){setError(e.message||'Shift could not be opened.')}finally{setBusy(false)}
 }

 async function close(){
   setError('')
   if(actual===''&&!denoms.length){setError('Enter the physical cash counted before closing the shift.');return}
   if(physical<0){setError('Physical cash cannot be negative.');return}
   setBusy(true)
   try{
     const out=await api('/cash/close',{method:'POST',body:JSON.stringify({actualCash:physical,managerConfirmed:false,denominations:denoms.map(d=>({value:Number(d.value||0),count:Number(d.count||0)}))})})
     setCloseModal(false);setDenoms([]);setActual('');await load();setMessage('Shift closed and reconciled successfully.')
     await openPdf('/documents/cash-session/'+out.id+'/pdf')
   }catch(e:any){setError(e.message||'Shift could not be closed.')}finally{setBusy(false)}
 }

 async function addMove(){
   setError('')
   if(!reason.trim()||Number(amount)<=0){setError('Enter a positive amount and a reason.');return}
   setBusy(true)
   try{
     await api('/cash/movements',{method:'POST',body:JSON.stringify({movementType,amount:Number(amount),reason:reason.trim()})})
     setMoveModal(false);setAmount('');setReason('');await load();setMessage('Shift movement posted.')
   }catch(e:any){setError(e.message||'Movement could not be posted.')}finally{setBusy(false)}
 }

 if(session===undefined)return <Loading/>

 return <div>
  <PageHeading eyebrow="Shift control" title="Cashier Shifts" sub="One cashier, one active shift. Open, operate, reconcile and close with a complete audit trail." action={<button onClick={()=>load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"><RefreshCw size={13}/>Refresh</button>}/>

  {(error||message)&&<div className={'mb-4 rounded-xl border px-3.5 py-3 text-[12px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

  {!session?<div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
    <Panel title="No Active Shift" sub="Open your shift before taking payments or handling cash.">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-500 shadow-sm"><LockKeyhole size={20}/></div>
        <div className="mt-4 text-[15px] font-semibold text-slate-900">Cashier shift is closed</div>
        <div className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-slate-500">Choose the branch, optional terminal and opening float. After opening, restaurant cashiers are taken directly to operations.</div>
        <button onClick={beginOpen} className="mt-5 rounded-lg bg-[var(--brand-primary)] px-6 py-3 text-[12px] font-semibold text-white shadow-sm">Open Shift</button>
      </div>
    </Panel>
    <Panel title="Recent Shifts" sub="Your latest completed cashier shifts.">
      {history.length?<DataTable head={['Shift','Opened','Variance','Status']} rows={history.slice(0,7).map(x=>['#'+x.id,new Date(x.opened_at).toLocaleString(),x.status==='closed'?money(x.variance||0,currency):'-',<Badge tone={x.status==='closed'?'slate':'green'}>{nice(x.status)}</Badge>])}/>:<div className="py-8 text-center text-[11px] text-slate-400">No previous shifts yet.</div>}
    </Panel>
  </div>:<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Shift" value={'#'+session.id} sub={(session.branch_name||'Branch')+' · '+(session.terminal_name||'No terminal')} icon={UnlockKeyhole}/>
      <Stat label="Opening Float" value={money(session.opening_cash||0,currency)} sub={'Opened '+new Date(session.opened_at).toLocaleTimeString()} icon={Banknote} tone="blue"/>
      <Stat label="Expected Cash" value={money(session.expectedCash||0,currency)} sub="Live calculated cash" icon={Banknote} tone="violet"/>
      <Stat label="Cash Sales" value={money(session.cashSales||0,currency)} sub={'Cash refunds '+money(session.refunds||0,currency)} icon={Banknote} tone="amber"/>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Active Shift" sub={'Opened by '+(session.opened_by||'Cashier')+' · '+new Date(session.opened_at).toLocaleString()}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Mini label="Cash In" value={money(session.cashIn||0,currency)} icon={ArrowDownLeft}/>
          <Mini label="Cash Out" value={money(session.cashOut||0,currency)} icon={ArrowUpRight}/>
          <Mini label="Net Expected" value={money(session.expectedCash||0,currency)} icon={Banknote}/>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={()=>{setError('');setAmount('');setReason('');setMovementType('cash_out');setMoveModal(true)}} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Plus size={14}/>Cash In / Out</button>
          <button onClick={()=>openPdf('/documents/cash-session/'+session.id+'/pdf')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Printer size={14}/>Shift Report Preview</button>
          <button onClick={()=>{setError('');setActual('');setDenoms([]);setCloseModal(true)}} className="sm:ml-auto rounded-lg bg-red-600 px-5 py-2.5 text-[11px] font-semibold text-white hover:bg-red-700">Close & Reconcile</button>
        </div>
      </Panel>

      <Panel title="Reconciliation Snapshot" sub="This updates from cash payments, refunds and shift movements.">
        <div className="space-y-3">
          <Line label="Opening float" value={money(session.opening_cash||0,currency)}/>
          <Line label="Cash sales" value={'+'+money(session.cashSales||0,currency)}/>
          <Line label="Cash refunds" value={'-'+money(session.refunds||0,currency)}/>
          <Line label="Cash in" value={'+'+money(session.cashIn||0,currency)}/>
          <Line label="Cash out" value={'-'+money(session.cashOut||0,currency)}/>
          <div className="border-t border-slate-100 pt-3"><Line label="Expected cash" value={money(session.expectedCash||0,currency)} strong/></div>
        </div>
      </Panel>
    </div>

    <div className="mt-4"><Panel title="Shift Movements" sub="All manual cash additions and removals during this shift.">
      {moves.length?<DataTable head={['Time','Type','Reason','Amount','By']} rows={moves.map(x=>[new Date(x.created_at).toLocaleString(),<Badge tone={x.movement_type==='cash_in'?'green':'amber'}>{nice(x.movement_type)}</Badge>,x.reason,money(x.amount,currency),x.created_by||'-'])}/>:<div className="py-8 text-center text-[11px] text-slate-400">No manual cash movements in this shift.</div>}
    </Panel></div>
  </>}

  {history.length>0&&session&&<div className="mt-4"><Panel title="Recent Shift History" sub="Previous shifts remain immutable and available for review."><DataTable head={['Shift','Branch','Opened','Closed','Actual','Variance']} rows={history.filter(x=>Number(x.id)!==Number(session.id)).slice(0,10).map(x=>['#'+x.id,x.branch_name||'-',new Date(x.opened_at).toLocaleString(),x.closed_at?new Date(x.closed_at).toLocaleString():'-',money(x.closing_cash||0,currency),money(x.variance||0,currency)])}/></Panel></div>}

  {openModal&&<Modal title="Open Cashier Shift" onClose={()=>!busy&&setOpenModal(false)} size="md">
    <div className="grid gap-4">
      <Field label="Branch" required><select className="control" value={branchId} onChange={e=>{setBranchId(Number(e.target.value)||'');setTerminalId('')}}><option value="">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Terminal"><select className="control" value={terminalId} onChange={e=>setTerminalId(Number(e.target.value)||'')}><option value="">No specific terminal</option>{terminalOptions.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label={'Opening float ('+currency+')'}><input className="control" inputMode="decimal" value={opening} onChange={e=>setOpening(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter opening cash or leave empty for zero"/></Field>
    </div>
    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[10.5px] leading-5 text-slate-500">A cashier cannot open a second shift while their current shift is active. A selected terminal also cannot be shared by another active shift.</div>
    <button onClick={open} disabled={busy||(branches.length>0&&!branchId)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Opening Shift…':'Open Shift'}</button>
  </Modal>}

  {moveModal&&<Modal title="Cash In / Out" onClose={()=>!busy&&setMoveModal(false)}>
    <div className="grid gap-4">
      <Field label="Movement type"><select className="control" value={movementType} onChange={e=>setMovementType(e.target.value as 'cash_in'|'cash_out')}><option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option></select></Field>
      <Field label={'Amount ('+currency+')'} required><input className="control" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter amount"/></Field>
      <Field label="Reason" required><input className="control" value={reason} onChange={e=>setReason(e.target.value)} placeholder={movementType==='cash_in'?'e.g. Additional float':'e.g. Petty cash purchase'}/></Field>
    </div>
    <button onClick={addMove} disabled={busy||!reason.trim()||Number(amount)<=0} className="mt-4 w-full rounded-lg bg-slate-950 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Posting…':'Post Movement'}</button>
  </Modal>}

  {closeModal&&<Modal title="Close & Reconcile Shift" onClose={()=>!busy&&setCloseModal(false)} size="lg">
    <div className="grid gap-3 sm:grid-cols-3">
      <Summary label="Expected cash" value={money(expected,currency)}/>
      <Summary label="Physical counted" value={money(physical,currency)}/>
      <Summary label="Variance" value={money(variance,currency)} danger={Math.abs(variance)>0.005}/>
    </div>
    <div className="mt-4"><Field label={'Physical cash counted ('+currency+')'} required><input className="control" inputMode="decimal" value={actual} disabled={denoms.length>0} onChange={e=>setActual(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter total cash counted"/></Field></div>
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3"><div><div className="text-[12px] font-semibold text-slate-700">Optional denomination count</div><div className="mt-0.5 text-[9.5px] text-slate-400">Use notes/coins for a more detailed closing count.</div></div><button onClick={()=>setDenoms([...denoms,{value:'',count:''}])} className="shrink-0 text-[10.5px] font-semibold text-[var(--brand-primary)]">+ Add denomination</button></div>
      {denoms.length>0&&<div className="mt-3 space-y-2">{denoms.map((d,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input className="control mt-0" inputMode="decimal" placeholder="Note value" value={d.value} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,value:e.target.value.replace(/[^0-9.]/g,'')}:x))}/><input className="control mt-0" inputMode="numeric" placeholder="Count" value={d.count} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,count:e.target.value.replace(/[^0-9]/g,'')}:x))}/><button onClick={()=>setDenoms(denoms.filter((_,k)=>k!==i))} className="px-2 text-slate-400">×</button></div>)}</div>}
      {denoms.length>0&&<div className="mt-3 text-right text-[11px] font-semibold text-slate-700">Denomination total: {money(denominationTotal,currency)}</div>}
    </div>
    {Math.abs(variance)>0.005&&<div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">This shift has a cash variance of <b>{money(variance,currency)}</b>. Confirm the physical count before closing. The variance will be stored permanently in the shift record.</div>}
    <button onClick={close} disabled={busy||(actual===''&&!denoms.length)} className="mt-4 w-full rounded-lg bg-red-600 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Closing Shift…':'Close Shift & Print Z-Report'}</button>
  </Modal>}
 </div>
}
function Field({label,children,required=false}:{label:string;children:any;required?:boolean}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{required&&<span className="ml-1 text-red-500">*</span>}{children}</label>}
function Mini({label,value,icon:Icon}:{label:string;value:string;icon:any}){return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center gap-2 text-[9.5px] text-slate-400"><Icon size={13}/>{label}</div><div className="mt-1.5 text-[14px] font-semibold text-slate-800">{value}</div></div>}
function Line({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className={'flex items-center justify-between gap-4 '+(strong?'text-[13px] font-semibold text-slate-900':'text-[11px] text-slate-600')}><span>{label}</span><span>{value}</span></div>}
function Summary({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <div className={'rounded-xl border p-3 '+(danger?'border-amber-200 bg-amber-50':'border-slate-200 bg-slate-50')}><div className="text-[9.5px] text-slate-400">{label}</div><div className={'mt-1 text-[14px] font-semibold '+(danger?'text-amber-800':'text-slate-800')}>{value}</div></div>}
