import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Building2, CircleDollarSign, Landmark, Plus, RefreshCw, Scale, WalletCards } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, money, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel, Stat } from '../components'

type Tab='overview'|'coa'|'journals'|'ledger'|'statements'|'cashbook'|'setup'
const tools:[Tab,string][]=[
 ['overview','Financial Overview'],['coa','Chart of Accounts'],['journals','Journal Register'],
 ['ledger','General Ledger'],['statements','Financial Statements'],['cashbook','Cashbook'],['setup','Mappings & Periods']
]
const today=()=>new Date().toISOString().slice(0,10)
const monthStart=()=>today().slice(0,8)+'01'

export default function Accounting({currency}:{currency:string}){
 const [tab,setTab]=useState<Tab>('overview'),[from,setFrom]=useState(monthStart()),[to,setTo]=useState(today()),[loadError,setLoadError]=useState('')
 const [accounts,setAccounts]=useState<any[]|null>(null),[overview,setOverview]=useState<any|null>(null),[journals,setJournals]=useState<any[]>([])
 const [trial,setTrial]=useState<any|null>(null),[pnl,setPnl]=useState<any|null>(null),[balance,setBalance]=useState<any|null>(null),[cashbook,setCashbook]=useState<any[]>([])
 const [ledgerAccount,setLedgerAccount]=useState(''),[ledger,setLedger]=useState<any|null>(null),[mappings,setMappings]=useState<any[]>([]),[periods,setPeriods]=useState<any[]>([])
 const [journalOpen,setJournalOpen]=useState(false),[journal,setJournal]=useState<any>({entryDate:today(),description:'',notes:'',lines:[{accountId:'',debit:'',credit:'',memo:''},{accountId:'',debit:'',credit:'',memo:''}]}),[saving,setSaving]=useState(false)
 const qs=useMemo(()=>new URLSearchParams({from,to}).toString(),[from,to])
 const title=tools.find(([v])=>v===tab)?.[1]||'Accounting'
 const loadBase=()=>{setLoadError('');return Promise.all([api('/accounting/accounts'),api('/accounting/dashboard?'+qs)]).then(([a,o])=>{setAccounts(a);setOverview(o)}).catch((e:any)=>{setAccounts([]);setOverview(null);setLoadError(e?.message||'Accounting data could not be loaded')})}
 useEffect(()=>{loadBase()},[qs])
 useEffect(()=>{
  if(!accounts)return
  if(tab==='journals')api('/accounting/journals?'+qs).then(setJournals)
  if(tab==='ledger'&&ledgerAccount)api('/accounting/general-ledger?accountId='+ledgerAccount+'&'+qs).then(setLedger)
  if(tab==='statements')Promise.all([api('/accounting/trial-balance?asOf='+to),api('/accounting/profit-loss?'+qs),api('/accounting/balance-sheet?asOf='+to)]).then(([t,p,b])=>{setTrial(t);setPnl(p);setBalance(b)})
  if(tab==='cashbook')api('/accounting/cashbook?'+qs).then(setCashbook)
  if(tab==='setup')Promise.all([api('/accounting/mappings'),api('/accounting/periods')]).then(([m,p])=>{setMappings(m);setPeriods(p)})
 },[tab,accounts,qs,ledgerAccount,to])

 if(loadError)return <div><PageHeading eyebrow="Management · Finance" title="Accounting" sub="Live financial control from every POS and back-office transaction."/><Panel title="Accounting could not load" sub="The server returned an error while loading financial data."><div className="rounded-xl bg-red-50 p-4 text-[12px] text-red-700">{loadError}</div><button onClick={()=>loadBase()} className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-[11px] font-semibold text-white">Retry</button></Panel></div>
 if(!accounts||!overview)return <Loading/>

 async function saveJournal(){
  setSaving(true)
  try{
   await api('/accounting/journals',{method:'POST',body:JSON.stringify({...journal,lines:journal.lines.map((x:any)=>({...x,accountId:Number(x.accountId),debit:Number(x.debit||0),credit:Number(x.credit||0)}))})})
   setJournalOpen(false);setJournal({entryDate:today(),description:'',notes:'',lines:[{accountId:'',debit:'',credit:'',memo:''},{accountId:'',debit:'',credit:'',memo:''}]})
   await loadBase();if(tab==='journals')setJournals(await api('/accounting/journals?'+qs))
  }finally{setSaving(false)}
 }
 const manual=accounts.filter((x:any)=>x.allow_manual_entries&&x.is_active)
 const debit=journal.lines.reduce((n:number,x:any)=>n+Number(x.debit||0),0),credit=journal.lines.reduce((n:number,x:any)=>n+Number(x.credit||0),0)

 return <div>
  <PageHeading eyebrow="Management · Finance" title={title} sub={tab==='overview'?'A live financial picture of revenue, margin, cash, obligations and ledger health.':'Accounting records and controls connected to POS, inventory, purchasing and shifts.'} action={<div className="flex items-center gap-2">
   <select aria-label="Open accounting section" value={tab} onChange={e=>setTab(e.target.value as Tab)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-medium text-slate-700 outline-none">{tools.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
   <button onClick={()=>setJournalOpen(true)} className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-[11px] font-semibold text-white"><Plus size={14} className="mr-1 inline"/>Journal</button>
  </div>}/>

  {tab!=='coa'&&tab!=='setup'&&<div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
   <label className="min-w-[150px] flex-1 text-[10px] font-medium text-slate-500">From<input className="control mt-1" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label className="min-w-[150px] flex-1 text-[10px] font-medium text-slate-500">To<input className="control mt-1" type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
   <button onClick={()=>loadBase()} className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-[10.5px] font-medium text-slate-600"><RefreshCw size={13} className="mr-1 inline"/>Refresh</button>
  </div>}

  {tab==='overview'&&<Overview x={overview} currency={currency}/>}
  {tab==='coa'&&<Coa accounts={accounts} currency={currency}/>}
  {tab==='journals'&&<Journals rows={journals} currency={currency}/>}
  {tab==='ledger'&&<Ledger accounts={accounts} accountId={ledgerAccount} setAccountId={setLedgerAccount} ledger={ledger} currency={currency}/>}
  {tab==='statements'&&<Statements trial={trial} pnl={pnl} balance={balance} currency={currency}/>}
  {tab==='cashbook'&&<Cashbook rows={cashbook} currency={currency}/>}
  {tab==='setup'&&<Setup mappings={mappings} accounts={accounts} periods={periods} refresh={async()=>{const [m,p]=await Promise.all([api('/accounting/mappings'),api('/accounting/periods')]);setMappings(m);setPeriods(p)}}/>}

  {journalOpen&&<Modal title="Post Manual Journal" onClose={()=>!saving&&setJournalOpen(false)} size="lg">
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-medium text-slate-600">Entry date<input type="date" className="control" value={journal.entryDate} onChange={e=>setJournal({...journal,entryDate:e.target.value})}/></label><label className="text-[11px] font-medium text-slate-600">Description<input className="control" value={journal.description} onChange={e=>setJournal({...journal,description:e.target.value})} placeholder="Purpose of journal"/></label></div>
   <div className="mt-4 space-y-2">{journal.lines.map((l:any,i:number)=><div key={i} className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1.5fr_.7fr_.7fr_1fr]"><select className="control" value={l.accountId} onChange={e=>{const lines=[...journal.lines];lines[i]={...l,accountId:e.target.value};setJournal({...journal,lines})}}><option value="">Account</option>{manual.map((a:any)=><option key={a.id} value={a.id}>{a.account_code} · {a.name}</option>)}</select><input className="control" type="number" min="0" placeholder="Debit" value={l.debit} onChange={e=>{const lines=[...journal.lines];lines[i]={...l,debit:e.target.value,credit:e.target.value?'':l.credit};setJournal({...journal,lines})}}/><input className="control" type="number" min="0" placeholder="Credit" value={l.credit} onChange={e=>{const lines=[...journal.lines];lines[i]={...l,credit:e.target.value,debit:e.target.value?'':l.debit};setJournal({...journal,lines})}}/><input className="control" placeholder="Memo" value={l.memo} onChange={e=>{const lines=[...journal.lines];lines[i]={...l,memo:e.target.value};setJournal({...journal,lines})}}/></div>)}</div>
   <div className="mt-3 flex items-center justify-between"><button onClick={()=>setJournal({...journal,lines:[...journal.lines,{accountId:'',debit:'',credit:'',memo:''}]})} className="rounded-lg border border-slate-200 px-3 py-2 text-[10.5px] font-medium">+ Line</button><div className={'text-[11px] font-semibold '+(Math.abs(debit-credit)<.01?'text-emerald-600':'text-red-600')}>Debit {money(debit,currency)} · Credit {money(credit,currency)}</div></div>
   <label className="mt-3 block text-[11px] font-medium text-slate-600">Notes<textarea className="control min-h-20" value={journal.notes} onChange={e=>setJournal({...journal,notes:e.target.value})}/></label>
   <button disabled={saving||!journal.description||journal.lines.some((x:any)=>!x.accountId)||Math.abs(debit-credit)>.01||debit<=0} onClick={saveJournal} className="mt-4 w-full rounded-xl bg-slate-950 py-3 text-[11px] font-semibold text-white disabled:opacity-40">{saving?'Posting…':'Post Balanced Journal'}</button>
  </Modal>}
 </div>
}

function Overview({x,currency}:{x:any;currency:string}){
 const cash=(x.cash||[]).map((r:any)=>({name:r.name,balance:Number(r.balance||0)}))
 const performance=[
  {name:'Revenue',value:Number(x.revenue||0)},
  {name:'COGS',value:Number(x.cogs||0)},
  {name:'Gross profit',value:Number(x.grossProfit||0)},
  {name:'Expenses',value:Number(x.expenses||0)},
  {name:'Net profit',value:Number(x.netProfit||0)}
 ]
 return <>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
   <Stat label="Revenue" value={money(x.revenue,currency)} sub="Posted sales income" icon={CircleDollarSign}/>
   <Stat label="Gross profit" value={money(x.grossProfit,currency)} sub={(Number(x.grossMargin||0)).toFixed(1)+'% margin'} icon={Landmark} tone="blue"/>
   <Stat label="Net profit" value={money(x.netProfit,currency)} sub={(Number(x.netMargin||0)).toFixed(1)+'% net margin'} icon={Scale} tone="violet"/>
   <Stat label="Cash & bank" value={money(x.cashTotal,currency)} sub={(x.cash||[]).length+' settlement accounts'} icon={WalletCards} tone="emerald"/>
   <Stat label="Receivables" value={money(x.accountsReceivable,currency)} sub="Customers owing" icon={Building2} tone="amber"/>
   <Stat label="Payables" value={money(x.accountsPayable,currency)} sub="Suppliers owing" icon={BookOpen} tone="rose"/>
  </div>

  <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
   <Panel title="Financial performance" sub="Revenue, cost of sales and operating expenses across the selected period">
    <div className="h-[300px]">{(x.trend||[]).length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={x.trend}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="d" tickFormatter={(v:any)=>String(v).slice(5,10)} tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>money(v,currency)}/><Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0f172a" fill="#0f172a" fillOpacity={.08}/><Area type="monotone" dataKey="cogs" name="COGS" stroke="#64748b" fill="#64748b" fillOpacity={.04}/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#94a3b8" fill="#94a3b8" fillOpacity={.03}/></AreaChart></ResponsiveContainer>:<Empty text="No accounting movement in this period."/>}</div>
   </Panel>
   <Panel title="Profit structure" sub="A quick view of what the period generated and consumed">
    <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={performance} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:9}}/><YAxis type="category" dataKey="name" width={82} tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>money(v,currency)}/><Bar dataKey="value" fill="#0f172a" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div>
   </Panel>
  </div>

  <div className="mt-4 grid gap-4 xl:grid-cols-2">
   <Panel title="Cash & settlement position" sub={'Available across cash, bank, mobile money and card clearing · '+money(x.cashTotal,currency)}>
    {cash.length?<div className="space-y-2">{cash.map((r:any)=><div key={r.name} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3"><div className="text-[11px] font-medium text-slate-600">{r.name}</div><div className="text-[12px] font-semibold text-slate-900">{money(r.balance,currency)}</div></div>)}</div>:<Empty text="No settlement-account balances yet."/>}
   </Panel>
   <Panel title="Financial health" sub="Balance-sheet and ledger controls at a glance">
    <div className="grid gap-3 sm:grid-cols-2">
     <Metric label="Total assets" value={money(x.totalAssets,currency)}/>
     <Metric label="Total liabilities" value={money(x.totalLiabilities,currency)}/>
     <Metric label="Equity incl. current earnings" value={money(x.totalEquity,currency)}/>
     <Metric label="Trial balance" value={x.trialBalance?.balanced?'Balanced':'Check required'} tone={x.trialBalance?.balanced?'green':'red'}/>
     <Metric label="Total debits" value={money(x.trialBalance?.debit,currency)}/>
     <Metric label="Total credits" value={money(x.trialBalance?.credit,currency)}/>
    </div>
   </Panel>
  </div>

  <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
   <Panel title="Recent journal activity" sub="Latest financial postings generated by sales, inventory, purchasing, refunds and expenses">
    {(x.recentJournals||[]).length?<DataTable head={['Date','Journal','Source','Description','Amount']} rows={x.recentJournals.map((j:any)=>[String(j.entry_date).slice(0,10),<b>{j.entry_no}</b>,nice(j.source_module||'accounting'),j.description,<b>{money(j.amount,currency)}</b>])}/>:<Empty text="No journal entries in this period."/>}
   </Panel>
   <Panel title="Working capital" sub="Money tied up in customers versus obligations to suppliers">
    <div className="space-y-3">
     <Position label="Customers owe you" value={x.accountsReceivable} currency={currency}/>
     <Position label="You owe suppliers" value={x.accountsPayable} currency={currency}/>
     <Position label="Net receivable position" value={Number(x.accountsReceivable||0)-Number(x.accountsPayable||0)} currency={currency} strong/>
     <Position label="Posted journals" text={String(x.journalCount||0)} currency={currency}/>
    </div>
   </Panel>
  </div>
 </>
}

function Coa({accounts,currency}:{accounts:any[];currency:string}){return <Panel title="Chart of Accounts" sub="Restaurant-ready hierarchy with system mappings and controlled manual posting."><DataTable head={['Code','Account','Type','Normal','Balance','Control']} rows={accounts.map((a:any)=>[<b>{a.account_code}</b>,<div><b>{a.name}</b>{a.parent_code&&<div className="text-[9px] text-slate-400">Under {a.parent_code} · {a.parent_name}</div>}</div>,nice(a.account_type),nice(a.normal_balance),<b>{money(a.current_balance,currency)}</b>,a.is_system?<Badge tone="blue">System</Badge>:<Badge>Custom</Badge>])}/></Panel>}
function Journals({rows,currency}:{rows:any[];currency:string}){return <Panel title="Journal Register" sub="Immutable operational and manual double-entry postings.">{rows.length?<DataTable head={['Date','Journal','Source','Description','Debit','Credit','Status']} rows={rows.map((x:any)=>[String(x.entry_date).slice(0,10),<b>{x.entry_no}</b>,nice(x.source_module||x.reference_type||'manual'),x.description,money(x.total_debit,currency),money(x.total_credit,currency),<Badge tone={x.status==='posted'?'green':'slate'}>{nice(x.status)}</Badge>])}/>:<Empty text="No journals in this period."/>}</Panel>}
function Ledger({accounts,accountId,setAccountId,ledger,currency}:{accounts:any[];accountId:string;setAccountId:(v:string)=>void;ledger:any;currency:string}){return <Panel title="General Ledger" sub="Account-by-account transaction history with running balance."><select className="control mb-4 max-w-xl" value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Choose account</option>{accounts.filter((a:any)=>a.is_active).map((a:any)=><option key={a.id} value={a.id}>{a.account_code} · {a.name}</option>)}</select>{ledger?<><div className="mb-3 text-[11px] text-slate-500">{ledger.account.account_code} · {ledger.account.name} · Closing <b>{money(ledger.closingBalance,currency)}</b></div><DataTable head={['Date','Journal','Description','Debit','Credit','Balance']} rows={ledger.rows.map((x:any)=>[String(x.entry_date).slice(0,10),x.entry_no,x.description,money(x.debit,currency),money(x.credit,currency),<b>{money(x.balance,currency)}</b>])}/></>:<Empty text="Choose an account to inspect its ledger."/>}</Panel>}
function Statements({trial,pnl,balance,currency}:{trial:any;pnl:any;balance:any;currency:string}){if(!trial||!pnl||!balance)return <Loading/>;return <div className="grid gap-4 xl:grid-cols-2"><Panel title="Profit & Loss" sub="Revenue, cost of sales and operating expenses from journal postings."><StatementRow label="Revenue" value={pnl.totalRevenue} currency={currency}/><StatementRow label="Cost of sales" value={-pnl.totalCogs} currency={currency}/><StatementRow label="Gross profit" value={pnl.grossProfit} currency={currency} strong/><StatementRow label="Operating expenses" value={-pnl.totalExpenses} currency={currency}/><StatementRow label="Net profit" value={pnl.netProfit} currency={currency} strong/></Panel><Panel title="Balance Sheet" sub="Assets = Liabilities + Equity, including current-period earnings."><StatementRow label="Assets" value={balance.totalAssets} currency={currency} strong/><StatementRow label="Liabilities" value={balance.totalLiabilities} currency={currency}/><StatementRow label="Equity + current earnings" value={balance.totalEquity} currency={currency}/><StatementRow label="Liabilities + Equity" value={balance.totalLiabilitiesAndEquity} currency={currency} strong/><div className="mt-3"><Badge tone={balance.isBalanced?'green':'red'}>{balance.isBalanced?'Balanced':'Out of balance'}</Badge></div></Panel><Panel title="Trial Balance" sub="Control total across every posted account."><DataTable head={['Code','Account','Debit','Credit']} rows={trial.rows.map((x:any)=>[x.account_code,x.name,money(x.debit,currency),money(x.credit,currency)])}/><div className="mt-3 flex justify-between text-[11px] font-semibold"><span>Debits {money(trial.totalDebit,currency)}</span><span>Credits {money(trial.totalCredit,currency)}</span></div></Panel><Panel title="Financial control" sub="Posting health for the selected period."><div className="grid gap-3 sm:grid-cols-2"><Metric label="Trial balance" value={trial.isBalanced?'Balanced':'Out of balance'} tone={trial.isBalanced?'green':'red'}/><Metric label="Current earnings" value={money(balance.currentEarnings,currency)}/><Metric label="Gross margin" value={pnl.totalRevenue?((pnl.grossProfit/pnl.totalRevenue)*100).toFixed(1)+'%':'0%'}/><Metric label="Net margin" value={pnl.totalRevenue?((pnl.netProfit/pnl.totalRevenue)*100).toFixed(1)+'%':'0%'}/></div></Panel></div>}
function Cashbook({rows,currency}:{rows:any[];currency:string}){return <Panel title="Cashbook" sub="Cash, bank, mobile-money and card-clearing ledger balances.">{rows.length?<DataTable head={['Code','Account','Inflows','Outflows','Balance']} rows={rows.map((x:any)=>[x.account_code,<b>{x.name}</b>,money(x.debit,currency),money(x.credit,currency),<b>{money(x.balance,currency)}</b>])}/>:<Empty text="No settlement-account postings yet."/>}</Panel>}
function Setup({mappings,accounts,periods,refresh}:{mappings:any[];accounts:any[];periods:any[];refresh:()=>Promise<void>}){async function change(key:string,accountId:string){await api('/accounting/mappings/'+encodeURIComponent(key),{method:'PUT',body:JSON.stringify({accountId:Number(accountId)})});await refresh()}return <div className="grid gap-4 xl:grid-cols-2"><Panel title="System Account Mappings" sub="Operational events post here instead of hard-coded account numbers."><div className="space-y-2">{mappings.map((m:any)=><div key={m.id} className="grid items-center gap-2 rounded-lg border border-slate-100 p-2.5 sm:grid-cols-[1fr_1.4fr]"><div className="text-[10.5px] font-medium text-slate-600">{nice(m.operation_key)}</div><select className="control" value={m.account_id} onChange={e=>change(m.operation_key,e.target.value)}>{accounts.filter((a:any)=>a.is_active).map((a:any)=><option key={a.id} value={a.id}>{a.account_code} · {a.name}</option>)}</select></div>)}</div></Panel><Panel title="Accounting Periods" sub="Closed and locked periods reject new journal postings.">{periods.length?<DataTable head={['Period','Start','End','Status']} rows={periods.map((x:any)=>[x.name,String(x.start_date).slice(0,10),String(x.end_date).slice(0,10),<Badge tone={x.status==='open'?'green':x.status==='closing'?'amber':'slate'}>{nice(x.status)}</Badge>])}/>:<Empty text="No explicit accounting periods configured; posting remains open."/>}</Panel></div>}
function StatementRow({label,value,currency,strong=false}:{label:string;value:number;currency:string;strong?:boolean}){return <div className={'flex items-center justify-between border-b border-slate-100 py-2.5 text-[11.5px] '+(strong?'font-semibold text-slate-900':'text-slate-600')}><span>{label}</span><span>{money(value,currency)}</span></div>}
function Metric({label,value,tone='slate'}:{label:string;value:string;tone?:'slate'|'green'|'red'}){return <div className={'rounded-xl border border-slate-100 p-3 '+(tone==='green'?'bg-emerald-50':tone==='red'?'bg-red-50':'bg-slate-50')}><div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-[14px] font-semibold text-slate-800">{value}</div></div>}
function Position({label,value,text,currency,strong=false}:{label:string;value?:number;text?:string;currency:string;strong?:boolean}){return <div className={'flex items-center justify-between rounded-xl border px-3.5 py-3 '+(strong?'border-slate-300 bg-slate-50':'border-slate-100')}><span className="text-[10.5px] text-slate-500">{label}</span><span className="text-[12px] font-semibold text-slate-900">{text??money(value||0,currency)}</span></div>}
function Empty({text}:{text:string}){return <div className="py-10 text-center text-[11px] text-slate-400">{text}</div>}
