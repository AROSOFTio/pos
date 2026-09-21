import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Boxes, Clock3, CircleDollarSign, Package, RefreshCw, ReceiptText, ShoppingCart, TrendingUp, UsersRound, UtensilsCrossed, WalletCards } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, money, nice } from '../api'
import { Badge, DataTable, Loading, PageHeading, Panel, Stat } from '../components'
import type { ViewKey } from '../App'

const today=()=>new Date().toISOString().slice(0,10)
const monthStart=()=>today().slice(0,8)+'01'
const pieColors=['#0f172a','#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2','#64748b']

export default function Dashboard({currency,go}:{currency:string;go:(v:ViewKey)=>void}){
  const [dash,setDash]=useState<any|null>(null),[finance,setFinance]=useState<any|null>(null),[approvals,setApprovals]=useState<any[]>([]),[activity,setActivity]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([])
  const [from,setFrom]=useState(monthStart()),[to,setTo]=useState(today()),[branchId,setBranchId]=useState(''),[error,setError]=useState('')
  const qs=useMemo(()=>new URLSearchParams({from,to,...(branchId?{branchId}:{})}).toString(),[from,to,branchId])
  const load=async()=>{
    setError('')
    try{
      const [d,f,a,act,b]=await Promise.all([
        api('/reports/management-dashboard?'+qs),
        api('/accounting/dashboard?'+qs).catch(()=>null),
        api('/approvals?status=pending').catch(()=>[]),
        api('/reports/activity?limit=12').catch(()=>[]),
        api('/branches').catch(()=>[])
      ])
      setDash(d);setFinance(f);setApprovals(Array.isArray(a)?a:[]);setActivity(Array.isArray(act)?act:[]);setBranches(Array.isArray(b)?b:[])
    }catch(e:any){setError(e?.message||'Management analytics could not be loaded')}
  }
  useEffect(()=>{load()},[qs])
  if(error)return <div><PageHeading eyebrow="Management Intelligence" title="Executive Overview" sub="Live operating and financial analysis across the business."/><Panel title="Dashboard could not load"><div className="rounded-xl bg-red-50 p-4 text-[12px] text-red-700">{error}</div><button onClick={load} className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-[11px] font-semibold text-white">Retry</button></Panel></div>
  if(!dash)return <Loading/>

  const sales=Number(dash.sales?.total||0),refunds=Number(dash.refunds?.total||0),netSales=sales-refunds
  const grossProfit=finance?Number(finance.grossProfit||0):(dash.topItems||[]).reduce((n:number,x:any)=>n+Number(x.contribution||0),0)
  const netProfit=finance?Number(finance.netProfit||0):grossProfit-Number(dash.expenses?.total||0)
  const grossMargin=sales?grossProfit/sales*100:0,netMargin=sales?netProfit/sales*100:0
  const refundRate=sales?refunds/sales*100:0,expenseRatio=sales?Number(dash.expenses?.total||0)/sales*100:0
  const avgCheck=Number(dash.sales?.avg_check||0)
  const covers=Number(dash.restaurant?.covers||0),spendPerCover=covers?Number(dash.restaurant?.total||0)/covers:0
  const bestBranch=(dash.branches||[])[0],topItem=(dash.topItems||[])[0],topPayment=(dash.paymentMix||[])[0],topCategory=(dash.categorySales||[])[0]
  const tableData=[
    {name:'Available',value:Number(dash.tables?.available||0)},
    {name:'Occupied',value:Number(dash.tables?.occupied||0)},
    {name:'Waiting bill',value:Number(dash.tables?.waiting||0)},
    {name:'Dirty',value:Number(dash.tables?.dirty||0)}
  ].filter(x=>x.value>0)
  const attention=[
    approvals.length?{label:'Pending approvals',value:approvals.length,tone:'amber' as const,go:'Approvals' as ViewKey}:null,
    Number(dash.inventory?.low_stock||0)?{label:'Low-stock products',value:Number(dash.inventory.low_stock),tone:'red' as const,go:'Inventory' as ViewKey}:null,
    Number(dash.tables?.waiting||0)?{label:'Tables waiting for bill',value:Number(dash.tables.waiting),tone:'amber' as const,go:'Restaurant' as ViewKey}:null,
    Number(dash.tables?.dirty||0)?{label:'Dirty tables',value:Number(dash.tables.dirty),tone:'red' as const,go:'Restaurant' as ViewKey}:null,
    (dash.shifts||[]).filter((x:any)=>Math.abs(Number(x.variance||0))>.01).length?{label:'Shifts with variance',value:(dash.shifts||[]).filter((x:any)=>Math.abs(Number(x.variance||0))>.01).length,tone:'red' as const,go:'Shifts' as ViewKey}:null,
  ].filter(Boolean) as any[]

  return <div>
    <PageHeading eyebrow="Management Intelligence" title="Executive Overview" sub="Sales, profitability, cash, restaurant operations, inventory and staff performance in one live command centre." action={<button onClick={load} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-medium text-slate-600"><RefreshCw size={13} className="mr-1 inline"/>Refresh</button>}/>

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <label className="text-[10.5px] font-medium text-slate-500">From<input type="date" className="control mt-1" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label className="text-[10.5px] font-medium text-slate-500">To<input type="date" className="control mt-1" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label className="text-[10.5px] font-medium text-slate-500">Branch<select className="control mt-1" value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">All branches</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Net sales" value={money(netSales,currency)} sub={(dash.sales?.count||0)+' sales · '+money(refunds,currency)+' refunded'} icon={CircleDollarSign}/>
      <Stat label="Gross profit" value={money(grossProfit,currency)} sub={grossMargin.toFixed(1)+'% gross margin'} icon={TrendingUp} tone="blue"/>
      <Stat label="Net profit" value={money(netProfit,currency)} sub={netMargin.toFixed(1)+'% net margin'} icon={BarChart3} tone="violet"/>
      <Stat label="Cash collected" value={money(dash.payments?.total,currency)} sub={(dash.payments?.count||0)+' posted payments'} icon={WalletCards} tone="emerald"/>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Average check" value={money(avgCheck,currency)} sub={(dash.sales?.count||0)+' transactions'} icon={ReceiptText} tone="blue"/>
      <Stat label="Spend per cover" value={money(spendPerCover,currency)} sub={covers+' restaurant covers'} icon={UtensilsCrossed} tone="violet"/>
      <Stat label="Inventory value" value={money(dash.inventory?.valuation,currency)} sub={(dash.inventory?.low_stock||0)+' products need attention'} icon={Boxes} tone="amber"/>
      <Stat label="Receivables" value={money(dash.customers?.receivable,currency)} sub={(dash.customers?.count||0)+' customer accounts'} icon={UsersRound} tone="rose"/>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
      <Panel title="Business performance trend" sub="Sales against expenses and refunds across the selected period">
        <div className="h-[320px]">{(dash.trend||[]).length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={dash.trend}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="d" tickFormatter={(v:any)=>String(v).slice(5,10)} tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>money(v,currency)}/><Legend wrapperStyle={{fontSize:10}}/><Area type="monotone" dataKey="sales" name="Sales" stroke="#0f172a" fill="#0f172a" fillOpacity={.08}/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#d97706" fill="#d97706" fillOpacity={.04}/><Area type="monotone" dataKey="refunds" name="Refunds" stroke="#dc2626" fill="#dc2626" fillOpacity={.03}/></AreaChart></ResponsiveContainer>:<Empty text="No movement in this period."/>}</div>
      </Panel>
      <Panel title="Payment mix" sub="How customers are paying">
        <div className="h-[320px]">{(dash.paymentMix||[]).length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dash.paymentMix} dataKey="total" nameKey="payment_method" innerRadius={62} outerRadius={98} paddingAngle={2}>{dash.paymentMix.map((_:any,i:number)=><Cell key={i} fill={pieColors[i%pieColors.length]}/>)}</Pie><Tooltip formatter={(v:any)=>money(v,currency)}/><Legend wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer>:<Empty text="No payment data in this period."/>}</div>
      </Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      <Panel title="Order channel mix" sub="Dine-in, takeaway, delivery and other sales channels"><div className="h-[260px]">{(dash.orderTypes||[]).length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dash.orderTypes} dataKey="total" nameKey="order_type" outerRadius={88}>{dash.orderTypes.map((_:any,i:number)=><Cell key={i} fill={pieColors[i%pieColors.length]}/>)}</Pie><Tooltip formatter={(v:any)=>money(v,currency)}/><Legend wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer>:<Empty text="No order-channel data."/>}</div></Panel>
      <Panel title="Expense composition" sub="Where operating money is going"><div className="h-[260px]">{(dash.expenseCategories||[]).length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dash.expenseCategories} dataKey="total" nameKey="category" innerRadius={50} outerRadius={86}>{dash.expenseCategories.map((_:any,i:number)=><Cell key={i} fill={pieColors[(i+2)%pieColors.length]}/>)}</Pie><Tooltip formatter={(v:any)=>money(v,currency)}/><Legend wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer>:<Empty text="No expense data."/>}</div></Panel>
      <Panel title="Table status" sub="Current restaurant floor state"><div className="h-[260px]">{tableData.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={tableData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={84}>{tableData.map((_:any,i:number)=><Cell key={i} fill={pieColors[(i+4)%pieColors.length]}/>)}</Pie><Tooltip/><Legend wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer>:<Empty text="No table data configured."/>}</div></Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title="Sales by branch" sub="Compare branch contribution to revenue"><div className="h-[290px]">{(dash.branches||[]).length?<ResponsiveContainer width="100%" height="100%"><BarChart data={dash.branches} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:9}}/><YAxis type="category" dataKey="name" width={90} tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>money(v,currency)}/><Bar dataKey="sales" fill="#0f172a" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>:<Empty text="No branch sales in this period."/>}</div></Panel>
      <Panel title="Sales by category" sub="Which menu/product categories generate revenue"><div className="h-[290px]">{(dash.categorySales||[]).length?<ResponsiveContainer width="100%" height="100%"><BarChart data={dash.categorySales} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:9}}/><YAxis type="category" dataKey="category" width={95} tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>money(v,currency)}/><Bar dataKey="revenue" fill="#2563eb" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>:<Empty text="No category sales in this period."/>}</div></Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <Panel title="Hourly sales pattern" sub="Identify the strongest and weakest trading hours"><div className="h-[280px]">{(dash.hourlySales||[]).length?<ResponsiveContainer width="100%" height="100%"><BarChart data={dash.hourlySales}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="hour" tickFormatter={(v:any)=>String(v).padStart(2,'0')+':00'} tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip labelFormatter={(v:any)=>String(v).padStart(2,'0')+':00'} formatter={(v:any)=>money(v,currency)}/><Bar dataKey="sales" fill="#16a34a" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:<Empty text="No hourly sales data."/>}</div></Panel>
      <Panel title="Management attention" sub="Items that require action now">
        <div className="space-y-2">{attention.length?attention.map((x:any)=><button key={x.label} onClick={()=>go(x.go)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 text-left hover:bg-slate-50"><span className="flex items-center gap-2 text-[11px] font-medium text-slate-600"><AlertTriangle size={14} className={x.tone==='red'?'text-red-500':'text-amber-500'}/>{x.label}</span><Badge tone={x.tone}>{x.value}</Badge></button>):<div className="rounded-xl bg-emerald-50 p-4 text-[11px] text-emerald-700">No immediate management exceptions detected.</div>}</div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="Refund rate" value={refundRate.toFixed(1)+'%'}/><Metric label="Expense / sales" value={expenseRatio.toFixed(1)+'%'}/><Metric label="Kitchen avg." value={Number(dash.kitchen?.avg_minutes||0).toFixed(1)+' min'}/><Metric label="Active staff" value={String(dash.staff?.count||0)}/></div>
      </Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title="Top products" sub="Revenue, cost and contribution margin"><DataTable head={['Item','Qty','Revenue','COGS','Contribution']} rows={(dash.topItems||[]).slice(0,8).map((x:any)=>[<b>{x.product_name}</b>,x.qty,money(x.revenue,currency),money(x.cogs,currency),<b>{money(x.contribution,currency)}</b>])}/></Panel>
      <Panel title="Cashier performance" sub="Sales volume and average check by cashier"><DataTable head={['Cashier','Transactions','Sales','Avg check']} rows={(dash.cashiers||[]).map((x:any)=>[<b>{x.cashier}</b>,x.transactions,money(x.sales,currency),money(x.avg_check,currency)])}/></Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <Panel title="Shift performance" sub="Recent collection and cash-variance control"><DataTable head={['Shift','Cashier','Branch','Collected','Variance','Status']} rows={(dash.shifts||[]).slice(0,12).map((x:any)=>[x.shift_no||'—',x.opened_by||'—',x.branch,money(x.collected,currency),<span className={Math.abs(Number(x.variance||0))>.01?'font-semibold text-red-600':'text-slate-500'}>{money(x.variance,currency)}</span>,<Badge tone={x.status==='open'?'green':'slate'}>{nice(x.status)}</Badge>])}/></Panel>
      <Panel title="Management insights" sub="What the current data is telling you"><div className="space-y-2.5"><Insight icon={TrendingUp} title="Profitability" text={sales?`Gross margin is ${grossMargin.toFixed(1)}% and net margin is ${netMargin.toFixed(1)}% for the selected period.`:'No sales recorded in this period.'}/><Insight icon={WalletCards} title="Payment behaviour" text={topPayment?`${nice(topPayment.payment_method)} is the leading payment method at ${money(topPayment.total,currency)}.`:'No payment mix is available.'}/><Insight icon={ShoppingCart} title="Product demand" text={topItem?`${topItem.product_name} is the highest-revenue item at ${money(topItem.revenue,currency)}, contributing ${money(topItem.contribution,currency)}.`:'No item sales recorded.'}/><Insight icon={Package} title="Category performance" text={topCategory?`${topCategory.category} is the strongest category at ${money(topCategory.revenue,currency)}.`:'No category performance data.'}/><Insight icon={Clock3} title="Kitchen & service" text={`${dash.kitchen?.tickets||0} kitchen tickets were recorded with an average preparation time of ${Number(dash.kitchen?.avg_minutes||0).toFixed(1)} minutes.`}/><Insight icon={UtensilsCrossed} title="Restaurant floor" text={`${dash.tables?.occupied||0} tables are occupied, ${dash.tables?.waiting||0} are waiting for bill and ${dash.tables?.available||0} are available.`}/>{bestBranch&&<Insight icon={BarChart3} title="Branch leader" text={`${bestBranch.name} currently leads branch sales at ${money(bestBranch.sales,currency)}.`}/>}</div></Panel>
    </div>

    <div className="mt-4"><Panel title="Recent management activity" sub="Latest audited changes across the system">{activity.length?<DataTable head={['Time','User','Module','Action','Record']} rows={activity.slice(0,10).map((x:any)=>[new Date(x.created_at).toLocaleString(),x.user_email||'System',nice(x.entity||'system'),<Badge tone="blue">{nice(x.action)}</Badge>,x.entity_id||'—'])}/>:<Empty text="No recent audited activity."/>}</Panel></div>
  </div>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[15px] font-semibold text-slate-900">{value}</div><div className="mt-0.5 text-[9.5px] text-slate-400">{label}</div></div>}
function Insight({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="flex gap-3 rounded-xl border border-slate-100 p-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={14}/></div><div><div className="text-[10.5px] font-semibold text-slate-700">{title}</div><div className="mt-0.5 text-[10px] leading-4 text-slate-500">{text}</div></div></div>}
function Empty({text}:{text:string}){return <div className="grid h-full min-h-[160px] place-items-center text-center text-[11px] text-slate-400">{text}</div>}
