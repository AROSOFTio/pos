import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Banknote, Landmark, LockKeyhole, Printer, RefreshCw, Settings2, ShieldCheck, UnlockKeyhole, WalletCards } from 'lucide-react'
import { api, money, nice, openPdf } from '../api'
import { PageHeading, Panel, Stat, Loading, Modal, DataTable, Badge } from '../components'

const arr=(v:any)=>Array.isArray(v)?v:[]
type MovementKind='additional_float'|'expense'|'cash_drop'|'bank_deposit'
type Destination='safe'|'carry_forward'|'handover'

export default function CashDrawer({currency,onOpened}:{currency:string;onOpened?:()=>void}){
 const [session,setSession]=useState<any>(undefined),[openSessions,setOpenSessions]=useState<any[]>([]),[closingSession,setClosingSession]=useState<any>(null),[settings,setSettings]=useState<any>({}),[branches,setBranches]=useState<any[]>([]),[terminals,setTerminals]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[history,setHistory]=useState<any[]>([]),[pending,setPending]=useState<any[]>([]),[targets,setTargets]=useState<any[]>([])
 const [openModal,setOpenModal]=useState(false),[closeModal,setCloseModal]=useState(false),[moveModal,setMoveModal]=useState(false),[settingsOpen,setSettingsOpen]=useState(false)
 const [opening,setOpening]=useState(''),[actual,setActual]=useState(''),[branchId,setBranchId]=useState<number|''>(''),[terminalId,setTerminalId]=useState<number|''>(''),[handoverId,setHandoverId]=useState<number|''>(''),[handoverReason,setHandoverReason]=useState('')
 const [movementKind,setMovementKind]=useState<MovementKind>('expense'),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[expenseCategory,setExpenseCategory]=useState('Counter Expense'),[recipient,setRecipient]=useState(''),[reference,setReference]=useState('')
 const [denoms,setDenoms]=useState<{value:string;count:string}[]>([]),[varianceReason,setVarianceReason]=useState(''),[closingNote,setClosingNote]=useState(''),[destination,setDestination]=useState<Destination>('safe'),[handoverAmount,setHandoverAmount]=useState(''),[recipientUserId,setRecipientUserId]=useState<number|''>('')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [standardFloat,setStandardFloat]=useState(''),[blindCount,setBlindCount]=useState(false),[approvalThreshold,setApprovalThreshold]=useState('')

 const load=async()=>{
   const [s,b,t,h,cfg,os]=await Promise.all([api('/cash/current'),api('/branches').catch(()=>[]),api('/terminals').catch(()=>[]),api('/cash/history').catch(()=>[]),api('/cash/settings').catch(()=>({})),api('/cash/open-sessions').catch(()=>[])])
   setSession(s||null);setBranches(arr(b));setTerminals(arr(t));setHistory(arr(h));setSettings(cfg||{});setOpenSessions(arr(os))
   if(s?.id)setMoves(arr(await api('/cash/movements?sessionId='+s.id).catch(()=>[])));else setMoves([])
   const p=await api('/cash/handovers/pending').catch(()=>[]);setPending(arr(p))
 }
 useEffect(()=>{load().catch((e:any)=>{setSession(null);setError(e.message||'Shifts could not be loaded.')})},[])

 const terminalOptions=terminals.filter(t=>!branchId||Number(t.branch_id)===Number(branchId))
 const branchPending=pending.filter(x=>!branchId||Number(x.branch_id)===Number(branchId))
 const denominationTotal=useMemo(()=>denoms.reduce((n,x)=>n+(Number(x.value)||0)*(Number(x.count)||0),0),[denoms])
 const physical=denoms.length?denominationTotal:Number(actual||0)
 const activeClose=closingSession||session
 const expected=Number(activeClose?.expectedCash||0)
 const variance=physical-expected
 const hasCount=actual!==''||denoms.length>0
 const selectedHandover=branchPending.find(x=>Number(x.id)===Number(handoverId))

 const breakdown=useMemo(()=>{
  const rows=arr(session?.movementBreakdown)
  const val=(category:string,type?:string)=>rows.filter((x:any)=>x.movement_category===category&&(!type||x.movement_type===type)).reduce((n:number,x:any)=>n+Number(x.total||0),0)
  return {expenses:val('expense','cash_out'),drops:val('cash_drop','cash_out')+val('bank_deposit','cash_out'),extraFloat:val('additional_float','cash_in')}
 },[session])

 function beginOpen(){
   setError('');setMessage('');setOpening(settings?.standard_float?String(Number(settings.standard_float)):'');setTerminalId('');setHandoverId('');setHandoverReason('')
   const only=branches.length===1?Number(branches[0].id):'';setBranchId(only);setOpenModal(true)
 }

 async function chooseBranch(v:number|''){
   setBranchId(v);setTerminalId('');setHandoverId('')
 }

 function selectHandover(id:number|''){
   setHandoverId(id);setHandoverReason('')
   const h=branchPending.find(x=>Number(x.id)===Number(id))
   if(h)setOpening(String(Number(h.amount||0)))
   else setOpening(settings?.standard_float?String(Number(settings.standard_float)):'')
 }

 async function open(){
   setError('')
   if(branches.length&&!branchId){setError('Select the branch for this shift.');return}
   if(opening!==''&&Number(opening)<0){setError('Opening float cannot be negative.');return}
   if(selectedHandover&&Math.abs(Number(opening||0)-Number(selectedHandover.amount||0))>.005&&!handoverReason.trim()){setError('Explain the handover difference before opening.');return}
   setBusy(true)
   try{
     await api('/cash/open',{method:'POST',body:JSON.stringify({openingCash:Number(opening||0),branchId:branchId||null,terminalId:terminalId||null,handoverId:handoverId||null,countedHandoverCash:selectedHandover?Number(opening||0):null,handoverDiscrepancyReason:handoverReason.trim()||null})})
     setOpenModal(false);setOpening('');await load();setMessage('Shift opened successfully.');onOpened?.()
   }catch(e:any){setError(e.message||'Shift could not be opened.')}finally{setBusy(false)}
 }

 function beginMove(kind:MovementKind){
   setError('');setMovementKind(kind);setAmount('');setReason('');setExpenseCategory('Counter Expense');setRecipient('');setReference('');setMoveModal(true)
 }

 const movementMeta={
   additional_float:{title:'Add Float',type:'cash_in',label:'Additional cash added to the till',icon:ArrowDownLeft},
   expense:{title:'Pay Out',type:'cash_out',label:'Small business expense paid from this counter',icon:WalletCards},
   cash_drop:{title:'Cash Drop',type:'cash_out',label:'Move excess cash from the till to the safe',icon:Landmark},
   bank_deposit:{title:'Bank / Safe Deposit',type:'cash_out',label:'Cash removed from the till for deposit',icon:ArrowUpRight}
 } as const

 async function addMove(){
   const meta=movementMeta[movementKind]
   setError('')
   if(!reason.trim()||Number(amount)<=0){setError('Enter a positive amount and a reason.');return}
   setBusy(true)
   try{
     await api('/cash/movements',{method:'POST',body:JSON.stringify({movementType:meta.type,movementCategory:movementKind,amount:Number(amount),reason:reason.trim(),expenseCategory:movementKind==='expense'?expenseCategory:null,recipient:recipient.trim()||null,reference:reference.trim()||null})})
     setMoveModal(false);await load();setMessage(meta.title+' posted successfully.')
   }catch(e:any){setError(e.message||'Cash movement could not be posted.')}finally{setBusy(false)}
 }

 async function beginClose(target:any=session){
   setError('');setClosingSession(target||session);setActual('');setDenoms([]);setVarianceReason('');setClosingNote('');setDestination('safe');setRecipientUserId('');setHandoverAmount(settings?.standard_float?String(Number(settings.standard_float)):'')
   if(target?.branch_id)setTargets(arr(await api('/cash/handover-targets?branchId='+target.branch_id).catch(()=>[])))
   setCloseModal(true)
 }

 async function close(){
   setError('')
   if(!hasCount){setError('Enter the physical cash counted before closing the shift.');return}
   if(physical<0){setError('Physical cash cannot be negative.');return}
   if(Math.abs(variance)>0.005&&settings?.require_variance_reason!==false&&!varianceReason.trim()){setError('Enter a reason for the cash shortage or overage.');return}
   const transfer=destination==='safe'?0:Number(handoverAmount||0)
   if(destination!=='safe'&&!(transfer>0)){setError('Enter the amount to carry forward or hand over.');return}
   if(transfer>physical+.005){setError('Handover amount cannot exceed the physical cash counted.');return}
   if(destination==='handover'&&!recipientUserId){setError('Choose the next staff member receiving the cash.');return}
   setBusy(true)
   try{
     const out=await api('/cash/close',{method:'POST',body:JSON.stringify({sessionId:activeClose?.id,actualCash:physical,denominations:denoms.map(d=>({value:Number(d.value||0),count:Number(d.count||0)})).filter(d=>d.value>0&&d.count>0),varianceReason:varianceReason.trim()||null,closingNote:closingNote.trim()||null,closeDestination:destination,handoverAmount:transfer,recipientUserId:recipientUserId||null})})
     setCloseModal(false);setClosingSession(null);setDenoms([]);setActual('');await load();setMessage(destination==='safe'?'Shift closed and cash assigned to safe/deposit.':'Shift closed and handover created for the next shift.')
     await openPdf('/documents/cash-session/'+out.id+'/pdf')
   }catch(e:any){setError(e.message||'Shift could not be closed.')}finally{setBusy(false)}
 }

 function beginSettings(){
   setStandardFloat(String(Number(settings?.standard_float||0)));setBlindCount(!!settings?.blind_count);setApprovalThreshold(String(Number(settings?.payout_approval_threshold||0)));setSettingsOpen(true)
 }
 async function saveSettings(){
   setBusy(true);setError('')
   try{
    const x=await api('/cash/settings',{method:'PUT',body:JSON.stringify({standardFloat:Number(standardFloat||0),blindCount,payoutApprovalThreshold:Number(approvalThreshold||0),requireVarianceReason:true})})
    setSettings(x);setSettingsOpen(false);setMessage('Cash controls saved.')
   }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 if(session===undefined)return <Loading/>

 return <div>
  <PageHeading eyebrow="Cash accountability" title="Shifts & Counter" sub="Opening float, cash movements, reconciliation and handover in one auditable flow." action={<div className="flex gap-2">{settings?.canManage&&<button onClick={beginSettings} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><Settings2 size={13}/>Controls</button>}<button onClick={()=>load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600"><RefreshCw size={13}/>Refresh</button></div>}/>

  {(error||message)&&<div className={'mb-4 rounded-xl border px-3.5 py-3 text-[12px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

  {!session?<div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
    <Panel title="No Active Shift" sub="Open a shift before taking counter payments.">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"><LockKeyhole size={20}/></div>
        <div className="mt-4 text-[15px] font-semibold text-slate-900">Counter is closed</div>
        <div className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-slate-500">Start with a fresh float or accept cash handed over from the previous shift.</div>
        <button onClick={beginOpen} className="mt-5 rounded-lg bg-[var(--brand-primary)] px-6 py-3 text-[12px] font-semibold text-white">Open Shift</button>
      </div>
      {pending.length>0&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800"><b>{pending.length} pending cash handover{pending.length===1?'':'s'}</b> waiting to be accepted into a new shift.</div>}
      {openSessions.filter(x=>!x.isMine).length>0&&<div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold text-slate-700">Other open shifts in this business</div>
        <div className="space-y-2">{openSessions.filter(x=>!x.isMine).map(x=><div key={x.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="text-[12px] font-semibold text-slate-900">{x.shift_no}</div><div className="mt-1 text-[10.5px] text-slate-500">{x.opened_by||x.email||'Staff'} · {x.branch_name||'Branch'}{x.terminal_name?' · '+x.terminal_name:''}</div><div className="mt-1 text-[10px] text-slate-400">Opened {new Date(x.opened_at).toLocaleString()} · Expected {money(x.expectedCash||0,currency)}</div></div>
            {x.canManage&&<button onClick={()=>beginClose(x)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10.5px] font-semibold text-slate-700 hover:bg-slate-50">Close / Reconcile</button>}
          </div>
        </div>)}</div>
      </div>}
    </Panel>
    <Panel title="Recent Shifts" sub="Completed shifts remain available for review.">
      {history.length?<DataTable head={['Shift','Opened','Variance','Destination']} rows={history.slice(0,7).map(x=>[x.shift_no||('#'+x.id),new Date(x.opened_at).toLocaleString(),x.status==='closed'?money(x.variance||0,currency):'-',x.status==='closed'?nice(x.close_destination||'safe'):<Badge tone="green">Open</Badge>])}/>:<Empty text="No previous shifts yet."/>}
    </Panel>
  </div>:<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Shift" value={session.shift_no||('#'+session.id)} sub={(session.branch_name||'Branch')+' · '+(session.terminal_name||'No terminal')} icon={UnlockKeyhole}/>
      <Stat label="Opening Float" value={money(session.opening_cash||0,currency)} sub={'Opened '+new Date(session.opened_at).toLocaleTimeString()} icon={Banknote} tone="blue"/>
      <Stat label="Expected Cash" value={money(session.expectedCash||0,currency)} sub="Live calculated drawer cash" icon={Banknote} tone="violet"/>
      <Stat label="Cash Sales" value={money(session.cashSales||0,currency)} sub={'Refunds '+money(session.refunds||0,currency)} icon={Banknote} tone="amber"/>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Counter Actions" sub="Every cash movement is recorded against this shift.">
        <div className="grid gap-2 sm:grid-cols-2">
          <Action icon={ArrowDownLeft} title="Add Float" sub="Additional cash into till" onClick={()=>beginMove('additional_float')}/>
          <Action icon={WalletCards} title="Pay Out" sub="Small expense from counter" onClick={()=>beginMove('expense')}/>
          <Action icon={Landmark} title="Cash Drop" sub="Move excess cash to safe" onClick={()=>beginMove('cash_drop')}/>
          <Action icon={ArrowUpRight} title="Deposit" sub="Remove cash for deposit" onClick={()=>beginMove('bank_deposit')}/>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={()=>openPdf('/documents/cash-session/'+session.id+'/pdf')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold text-slate-700"><Printer size={14}/>X Report</button>
          <button onClick={beginClose} className="sm:ml-auto rounded-lg bg-slate-950 px-5 py-2.5 text-[11px] font-semibold text-white">Close & Reconcile</button>
        </div>
      </Panel>

      <Panel title="Live Reconciliation" sub="Expected cash is calculated automatically.">
        <div className="space-y-3">
          <Line label="Opening float" value={money(session.opening_cash||0,currency)}/>
          <Line label="Cash sales" value={'+'+money(session.cashSales||0,currency)}/>
          <Line label="Cash refunds" value={'-'+money(session.refunds||0,currency)}/>
          <Line label="Additional float" value={'+'+money(breakdown.extraFloat,currency)}/>
          <Line label="Counter payouts" value={'-'+money(breakdown.expenses,currency)}/>
          <Line label="Drops / deposits" value={'-'+money(breakdown.drops,currency)}/>
          <div className="border-t border-slate-100 pt-3"><Line label="Expected cash" value={money(session.expectedCash||0,currency)} strong/></div>
        </div>
      </Panel>
    </div>

    <div className="mt-4"><Panel title="Cash Movement Audit" sub="Every addition, payout, drop and deposit for this shift.">
      {moves.length?<DataTable head={['Time','Type','Category','Reason','Amount','By']} rows={moves.map(x=>[new Date(x.created_at).toLocaleString(),<Badge tone={x.movement_type==='cash_in'?'green':'amber'}>{nice(x.movement_type)}</Badge>,nice(x.movement_category||'general'),x.reason,money(x.amount,currency),x.created_by||'-'])}/>:<Empty text="No manual cash movements in this shift."/>}
    </Panel></div>
  </>}

  {history.length>0&&session&&<div className="mt-4"><Panel title="Recent Shift History" sub="Closed shifts are immutable and remain auditable."><DataTable head={['Shift','Branch','Closed','Actual','Variance','Destination']} rows={history.filter(x=>Number(x.id)!==Number(session.id)).slice(0,10).map(x=>[x.shift_no||('#'+x.id),x.branch_name||'-',x.closed_at?new Date(x.closed_at).toLocaleString():'-',money(x.closing_cash||0,currency),money(x.variance||0,currency),nice(x.close_destination||'safe')])}/></Panel></div>}

  {openModal&&<Modal title="Open Shift" onClose={()=>!busy&&setOpenModal(false)} size="md">
    <div className="grid gap-4">
      <Field label="Branch" required><select className="control" value={branchId} onChange={e=>chooseBranch(Number(e.target.value)||'')}><option value="">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      <Field label="Terminal"><select className="control" value={terminalId} onChange={e=>setTerminalId(Number(e.target.value)||'')}><option value="">No specific terminal</option>{terminalOptions.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      {branchPending.length>0&&<Field label="Previous shift cash"><select className="control" value={handoverId} onChange={e=>selectHandover(Number(e.target.value)||'')}><option value="">Start with a fresh float</option>{branchPending.map(h=><option key={h.id} value={h.id}>{h.transfer_type==='direct_handover'?'Handover':'Carry forward'} · {money(h.amount,currency)} · {h.source_cashier||h.source_shift}</option>)}</select></Field>}
      <Field label={selectedHandover?'Cash physically received':'Opening float ('+currency+')'}><input className="control" inputMode="decimal" value={opening} onChange={e=>setOpening(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter opening cash"/></Field>
      {selectedHandover&&Math.abs(Number(opening||0)-Number(selectedHandover.amount||0))>.005&&<Field label="Handover difference reason" required><input className="control" value={handoverReason} onChange={e=>setHandoverReason(e.target.value)} placeholder="Explain the difference counted"/></Field>}
    </div>
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10.5px] leading-5 text-slate-500">If you accept a previous shift handover, count the cash first. Any difference is recorded against the transfer.</div>
    <button onClick={open} disabled={busy||(branches.length>0&&!branchId)} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Opening…':'Open Shift'}</button>
  </Modal>}

  {moveModal&&<Modal title={movementMeta[movementKind].title} onClose={()=>!busy&&setMoveModal(false)}>
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">{movementMeta[movementKind].label}</div>
    <div className="grid gap-4">
      <Field label={'Amount ('+currency+')'} required><input className="control" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter amount"/></Field>
      {movementKind==='expense'&&<Field label="Expense category"><select className="control" value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)}><option>Counter Expense</option><option>Supplies</option><option>Transport</option><option>Cleaning</option><option>Utilities</option><option>Emergency Purchase</option><option>Other</option></select></Field>}
      <Field label="Reason" required><input className="control" value={reason} onChange={e=>setReason(e.target.value)} placeholder={movementKind==='expense'?'What was the money used for?':movementKind==='additional_float'?'Why was extra float added?':'Where is the cash being moved?'}/></Field>
      {(movementKind==='expense'||movementKind==='cash_drop'||movementKind==='bank_deposit')&&<Field label="Recipient / destination"><input className="control" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder={movementKind==='expense'?'Person or supplier':'Safe, office, bank…'}/></Field>}
      <Field label="Reference"><input className="control" value={reference} onChange={e=>setReference(e.target.value)} placeholder="Optional receipt / voucher / note reference"/></Field>
    </div>
    <button onClick={addMove} disabled={busy||!reason.trim()||Number(amount)<=0} className="mt-4 w-full rounded-lg bg-slate-950 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Posting…':'Post '+movementMeta[movementKind].title}</button>
  </Modal>}

  {closeModal&&<Modal title={activeClose?.shift_no?("Close & Reconcile · "+activeClose.shift_no):"Close & Reconcile Shift"} onClose={()=>!busy&&setCloseModal(false)} size="lg">
    {!settings?.blind_count||hasCount?<div className="grid gap-3 sm:grid-cols-3">
      <Summary label="Expected cash" value={money(expected,currency)}/>
      <Summary label="Physical counted" value={money(physical,currency)}/>
      <Summary label="Variance" value={money(variance,currency)} danger={hasCount&&Math.abs(variance)>0.005}/>
    </div>:<div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-[12px] font-semibold text-slate-800">Blind cash count</div><div className="mt-1 text-[10.5px] text-slate-500">Count the physical cash first. Expected cash and variance will be revealed after you enter the count.</div></div>}

    <div className="mt-4"><Field label={'Physical cash counted ('+currency+')'} required><input className="control" inputMode="decimal" value={actual} disabled={denoms.length>0} onChange={e=>setActual(e.target.value.replace(/[^0-9.]/g,''))} placeholder="Enter total cash counted"/></Field></div>

    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-3"><div><div className="text-[12px] font-semibold text-slate-700">Denomination count</div><div className="mt-0.5 text-[10px] text-slate-400">Optional detailed notes/coins count.</div></div><button onClick={()=>setDenoms([...denoms,{value:'',count:''}])} className="shrink-0 text-[10.5px] font-semibold text-[var(--brand-primary)]">+ Add</button></div>
      {denoms.length>0&&<div className="mt-3 space-y-2">{denoms.map((d,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input className="control mt-0" inputMode="decimal" placeholder="Value" value={d.value} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,value:e.target.value.replace(/[^0-9.]/g,'')}:x))}/><input className="control mt-0" inputMode="numeric" placeholder="Count" value={d.count} onChange={e=>setDenoms(denoms.map((x,k)=>k===i?{...x,count:e.target.value.replace(/[^0-9]/g,'')}:x))}/><button onClick={()=>setDenoms(denoms.filter((_,k)=>k!==i))} className="px-2 text-slate-400">×</button></div>)}</div>}
      {denoms.length>0&&<div className="mt-3 text-right text-[11px] font-semibold text-slate-700">Total: {money(denominationTotal,currency)}</div>}
    </div>

    {hasCount&&Math.abs(variance)>0.005&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">Cash is <b>{variance<0?'short':'over'} by {money(Math.abs(variance),currency)}</b>.</div>}
    {hasCount&&Math.abs(variance)>0.005&&settings?.require_variance_reason!==false&&<div className="mt-4"><Field label="Variance reason" required><textarea className="control min-h-20" value={varianceReason} onChange={e=>setVarianceReason(e.target.value)} placeholder="Explain the shortage or overage"/></Field></div>}

    <div className="mt-5">
      <div className="mb-2 text-[11.5px] font-semibold text-slate-700">Where should the closing cash go?</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Choice active={destination==='safe'} icon={Landmark} title="Safe / Deposit" sub="Remove closing cash from till" onClick={()=>setDestination('safe')}/>
        <Choice active={destination==='carry_forward'} icon={ArrowRightLeft} title="Carry Forward" sub="Keep float for next shift" onClick={()=>setDestination('carry_forward')}/>
        <Choice active={destination==='handover'} icon={ShieldCheck} title="Hand Over" sub="Assign cash to next staff" onClick={()=>setDestination('handover')}/>
      </div>
    </div>

    {destination!=='safe'&&<div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={'Amount to '+(destination==='handover'?'hand over':'carry forward')} required><input className="control" inputMode="decimal" value={handoverAmount} onChange={e=>setHandoverAmount(e.target.value.replace(/[^0-9.]/g,''))}/></Field>{destination==='handover'&&<Field label="Receiving staff" required><select className="control" value={recipientUserId} onChange={e=>setRecipientUserId(Number(e.target.value)||'')}><option value="">Choose staff member</option>{targets.map(t=><option key={t.id} value={t.id}>{t.name} · {nice(t.role)}</option>)}</select></Field>}</div>}
    {destination!=='safe'&&hasCount&&<div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10.5px] text-slate-600">Safe/deposit after handover: <b>{money(Math.max(0,physical-Number(handoverAmount||0)),currency)}</b></div>}

    <div className="mt-4"><Field label="Closing note"><textarea className="control min-h-20" value={closingNote} onChange={e=>setClosingNote(e.target.value)} placeholder="Optional handover or manager note"/></Field></div>
    <button onClick={close} disabled={busy||!hasCount} className="mt-4 w-full rounded-lg bg-slate-950 py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Closing…':'Close Shift & Print Z Report'}</button>
  </Modal>}

  {settingsOpen&&<Modal title="Cash Controls" onClose={()=>!busy&&setSettingsOpen(false)} size="md">
    <div className="grid gap-4">
      <Field label={'Standard opening float ('+currency+')'}><input className="control" inputMode="decimal" value={standardFloat} onChange={e=>setStandardFloat(e.target.value.replace(/[^0-9.]/g,''))}/></Field>
      <Field label={'Payout approval threshold ('+currency+')'}><input className="control" inputMode="decimal" value={approvalThreshold} onChange={e=>setApprovalThreshold(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0 = no threshold"/></Field>
      <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-[11.5px] font-medium text-slate-700"><span><b>Blind closing count</b><span className="mt-0.5 block text-[10px] font-normal text-slate-500">Cashier counts before seeing expected cash.</span></span><input type="checkbox" checked={blindCount} onChange={e=>setBlindCount(e.target.checked)} className="h-4 w-4 accent-[var(--brand-primary)]"/></label>
    </div>
    <button onClick={saveSettings} disabled={busy} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Cash Controls</button>
  </Modal>}
 </div>
}

function Action({icon:Icon,title,sub,onClick}:{icon:any;title:string;sub:string;onClick:()=>void}){return <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon size={16}/></div><div><div className="text-[11.5px] font-semibold text-slate-800">{title}</div><div className="mt-0.5 text-[10px] text-slate-500">{sub}</div></div></button>}
function Choice({active,icon:Icon,title,sub,onClick}:{active:boolean;icon:any;title:string;sub:string;onClick:()=>void}){return <button onClick={onClick} className={'rounded-xl border p-3 text-left '+(active?'border-[var(--brand-primary)] bg-[var(--brand-soft)]':'border-slate-200 bg-white')}><Icon size={16} className={active?'text-[var(--brand-primary)]':'text-slate-400'}/><div className="mt-2 text-[11.5px] font-semibold text-slate-800">{title}</div><div className="mt-0.5 text-[10px] text-slate-500">{sub}</div></button>}
function Field({label,children,required=false}:{label:string;children:any;required?:boolean}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{required&&<span className="ml-1 text-red-500">*</span>}{children}</label>}
function Line({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className={'flex items-center justify-between gap-4 '+(strong?'text-[13px] font-semibold text-slate-900':'text-[11px] text-slate-600')}><span>{label}</span><span>{value}</span></div>}
function Summary({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <div className={'rounded-xl border p-3 '+(danger?'border-amber-200 bg-amber-50':'border-slate-200 bg-slate-50')}><div className="text-[10px] text-slate-400">{label}</div><div className={'mt-1 text-[14px] font-semibold '+(danger?'text-amber-800':'text-slate-800')}>{value}</div></div>}
function Empty({text}:{text:string}){return <div className="py-8 text-center text-[11px] text-slate-400">{text}</div>}
