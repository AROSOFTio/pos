import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarClock, Download, FileText, Plus, Printer, UtensilsCrossed } from 'lucide-react'
import { api, downloadFile, money, openPdf } from '../api'
import { Badge, DataTable, Modal, PageHeading, Panel, Stat, Loading } from '../components'

const types=[
  ['financial','Financial'],
  ['sales','Sales'],
  ['restaurant','Restaurant'],
  ['inventory','Inventory'],
  ['cash','Cash & Shifts'],
  ['payments','Payments'],
  ['refunds','Refunds & Voids'],
  ['purchases','Purchases'],
  ['expenses','Expenses'],
  ['stock_movements','Stock Movements'],
  ['kitchen','Kitchen Performance'],
] as const

export default function Reports({currency}:{currency:string}){
  const [summary,setSummary]=useState<any|null>(null),[from,setFrom]=useState(''),[to,setTo]=useState(''),[type,setType]=useState('financial'),[busy,setBusy]=useState(''),[branches,setBranches]=useState<any[]>([]),[branchId,setBranchId]=useState('')
  const [section,setSection]=useState<'reports'|'menu'|'schedules'>('reports'),[engineering,setEngineering]=useState<any[]>([]),[schedules,setSchedules]=useState<any[]>([]),[scheduleOpen,setScheduleOpen]=useState(false),[scheduleBusy,setScheduleBusy]=useState(false)
  const [schedule,setSchedule]=useState<any>({reportType:'daily_operations',cadence:'daily',sendTime:'23:59',recipients:''})
  const qs=useMemo(()=>new URLSearchParams({...(from?{from}:{}),...(to?{to}:{}),...(branchId?{branchId}:{})}).toString(),[from,to,branchId])
  const load=()=>api('/reports/summary'+(qs?'?'+qs:'')).then(setSummary)
  useEffect(()=>{load()},[qs]);useEffect(()=>{api('/branches').then(setBranches).catch(()=>setBranches([]));api('/scheduled-reports').then(x=>setSchedules(Array.isArray(x)?x:[])).catch(()=>setSchedules([]))},[])
  useEffect(()=>{if(section==='menu')api('/reports/menu-engineering'+(qs?'?'+qs:'')).then(x=>setEngineering(Array.isArray(x)?x:[])).catch(()=>setEngineering([]))},[section,qs])
  async function exp(format:'xlsx'|'csv'|'pdf'){
    setBusy(format)
    try{
      const p='/reports/export?report='+encodeURIComponent(type)+(from?'&from='+from:'')+ (to?'&to='+to:'') + (branchId?'&branchId='+branchId:'') + '&format='+format
      if(format==='pdf')await openPdf(p); else await downloadFile(p)
    }finally{setBusy('')}
  }
  async function createSchedule(){
    const recipients=String(schedule.recipients||'').split(/[;,\n]/).map(x=>x.trim()).filter(Boolean)
    if(!recipients.length)return
    setScheduleBusy(true)
    try{const x=await api('/scheduled-reports',{method:'POST',body:JSON.stringify({...schedule,recipients})});setSchedules(v=>[...v,x]);setScheduleOpen(false);setSchedule({reportType:'daily_operations',cadence:'daily',sendTime:'23:59',recipients:''})}finally{setScheduleBusy(false)}
  }
  async function toggleSchedule(x:any){const u=await api('/scheduled-reports/'+x.id,{method:'PUT',body:JSON.stringify({active:!x.active})});setSchedules(v=>v.map(s=>s.id===x.id?u:s))}
  if(!summary)return <Loading/>
  const gross=Number(summary.sales?.total||0),expenses=Number(summary.expenses?.total||0)
  return <div>
    <PageHeading eyebrow="Management" title="Reports" sub="Operational, financial and restaurant intelligence." action={section==='schedules'?<button onClick={()=>setScheduleOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13}/>Schedule</button>:null}/>
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
      <button onClick={()=>setSection('reports')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='reports'?'bg-slate-950 text-white':'text-slate-500')}>Reports</button>
      <button onClick={()=>setSection('menu')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='menu'?'bg-slate-950 text-white':'text-slate-500')}>Menu Engineering</button>
      <button onClick={()=>setSection('schedules')} className={'rounded-lg px-3.5 py-2 text-[11px] font-medium '+(section==='schedules'?'bg-slate-950 text-white':'text-slate-500')}>Scheduled Delivery</button>
    </div>
    {section==='reports'&&<>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Sales" value={money(gross,currency)} sub={(summary.sales?.count||0)+' transactions'} icon={BarChart3}/>
      <Stat label="Restaurant" value={money(summary.restaurant?.total||0,currency)} sub={(summary.restaurant?.count||0)+' orders'} icon={FileText} tone="blue"/>
      <Stat label="Expenses" value={money(expenses,currency)} sub="Posted costs" icon={Download} tone="amber"/>
      <Stat label="Net" value={money(gross-expenses,currency)} sub="Sales less expenses" icon={BarChart3} tone="violet"/>
    </div>
    <div className="mt-4"><Panel title="Report Centre" sub="XLSX is a real Excel workbook. CSV and PDF are available too.">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="text-sm font-medium text-slate-600">Report<select className="control" value={type} onChange={e=>setType(e.target.value)}>{types.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-600">From<input type="date" className="control" value={from} onChange={e=>setFrom(e.target.value)}/></label>
        <label className="text-sm font-medium text-slate-600">To<input type="date" className="control" value={to} onChange={e=>setTo(e.target.value)}/></label><label className="text-sm font-medium text-slate-600">Branch<select className="control" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">All branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <div className="flex items-end gap-2">
          <button onClick={()=>exp('xlsx')} className="flex-1 rounded-xl bg-[var(--brand-primary)] px-3 py-3 text-[13px] font-medium text-white">{busy==='xlsx'?'...':'Excel'}</button>
          <button onClick={()=>exp('csv')} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium">CSV</button>
          <button onClick={()=>exp('pdf')} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium"><Printer size={16}/></button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Discounts" value={money(summary.sales?.discounts||0,currency)}/>
        <Metric label="Tax" value={money(summary.sales?.tax||0,currency)}/>
        <Metric label="Low stock" value={String(summary.lowStock||0)}/>
      </div>
    </Panel></div>
    </>}

    {section==='menu'&&<Panel title="Menu Engineering" sub="Popularity, food cost and contribution margin by item.">
      {engineering.length?<DataTable head={['Item','Category','Units','Revenue','COGS','Contribution','Food Cost','Class']} rows={engineering.map(x=>[<b>{x.product_name}</b>,x.category,Number(x.units),money(x.revenue,currency),money(x.cogs,currency),money(x.contribution,currency),Number(x.food_cost_percent).toFixed(1)+'%',<Badge tone={x.classification==='Star'?'green':x.classification==='Workhorse'?'blue':x.classification==='Puzzle'?'amber':'slate'}>{x.classification}</Badge>])}/>:<div className="py-10 text-center text-[11px] text-slate-400"><UtensilsCrossed size={18} className="mx-auto mb-2"/>No menu sales in this period.</div>}
    </Panel>}

    {section==='schedules'&&<Panel title="Scheduled Management Reports" sub="Daily, weekly and monthly report delivery.">
      {schedules.length?<DataTable head={['Report','Cadence','Time','Recipients','Status','']} rows={schedules.map(x=>[nice(x.report_type),nice(x.cadence),String(x.send_time||'').slice(0,5),(x.recipients||[]).join(', '),<Badge tone={x.active?'green':'slate'}>{x.active?'Active':'Paused'}</Badge>,<button onClick={()=>toggleSchedule(x)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px] font-medium">{x.active?'Pause':'Enable'}</button>])}/>:<div className="py-10 text-center text-[11px] text-slate-400"><CalendarClock size={18} className="mx-auto mb-2"/>No scheduled reports yet.</div>}
    </Panel>}

    {scheduleOpen&&<Modal title="Schedule Report Delivery" onClose={()=>!scheduleBusy&&setScheduleOpen(false)} size="md">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-medium text-slate-600">Report<select className="control" value={schedule.reportType} onChange={e=>setSchedule({...schedule,reportType:e.target.value})}><option value="daily_operations">Daily Operations</option><option value="financial">Financial Summary</option><option value="restaurant">Restaurant Operations</option><option value="inventory">Inventory</option><option value="cash">Cash & Shifts</option></select></label>
        <label className="text-[11px] font-medium text-slate-600">Cadence<select className="control" value={schedule.cadence} onChange={e=>setSchedule({...schedule,cadence:e.target.value})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <label className="text-[11px] font-medium text-slate-600">Send time<input type="time" className="control" value={schedule.sendTime} onChange={e=>setSchedule({...schedule,sendTime:e.target.value})}/></label>
        <label className="text-[11px] font-medium text-slate-600">Recipients<input className="control" value={schedule.recipients} onChange={e=>setSchedule({...schedule,recipients:e.target.value})} placeholder="owner@example.com, manager@example.com"/></label>
      </div>
      <button onClick={createSchedule} disabled={scheduleBusy||!String(schedule.recipients).trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{scheduleBusy?'Saving…':'Save Schedule'}</button>
    </Modal>}
  </div>
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold text-slate-800">{value}</div></div>}
