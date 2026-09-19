import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, FileText, Printer } from 'lucide-react'
import { api, downloadFile, money, openPdf } from '../api'
import { PageHeading, Panel, Stat, Loading } from '../components'

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
  const qs=useMemo(()=>new URLSearchParams({...(from?{from}:{}),...(to?{to}:{}),...(branchId?{branchId}:{})}).toString(),[from,to,branchId])
  const load=()=>api('/reports/summary'+(qs?'?'+qs:'')).then(setSummary)
  useEffect(()=>{load()},[qs]);useEffect(()=>{api('/branches').then(setBranches).catch(()=>setBranches([]))},[])
  async function exp(format:'xlsx'|'csv'|'pdf'){
    setBusy(format)
    try{
      const p='/reports/export?report='+encodeURIComponent(type)+(from?'&from='+from:'')+ (to?'&to='+to:'') + (branchId?'&branchId='+branchId:'') + '&format='+format
      if(format==='pdf')await openPdf(p); else await downloadFile(p)
    }finally{setBusy('')}
  }
  if(!summary)return <Loading/>
  const gross=Number(summary.sales?.total||0),expenses=Number(summary.expenses?.total||0)
  return <div>
    <PageHeading eyebrow="Management" title="Reports" sub="Filter once. Print or export the same numbers."/>
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
          <button onClick={()=>exp('xlsx')} className="flex-1 rounded-xl bg-emerald-600 px-3 py-3 text-[13px] font-medium text-white">{busy==='xlsx'?'...':'Excel'}</button>
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
  </div>
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold text-slate-800">{value}</div></div>}
