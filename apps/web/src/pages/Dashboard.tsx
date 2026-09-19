import { useEffect, useState } from 'react'
import { BarChart3, Boxes, Building2, PackagePlus, ShieldCheck, Truck, UsersRound, WalletCards } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, Stat, DataTable, Badge, Loading } from '../components'
import type { ViewKey } from '../App'

export default function Dashboard({currency,go}:{currency:string;go:(v:ViewKey)=>void}){
  const [d,setD]=useState<any>(null),[p,setP]=useState<any>(null),[a,setA]=useState<any[]>([]),[staff,setStaff]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([])
  useEffect(()=>{Promise.all([api('/dashboard'),api('/purchasing/overview'),api('/approvals?status=pending'),api('/staff').catch(()=>[]),api('/branches').catch(()=>[])]).then(([d,p,a,s,b])=>{setD(d);setP(p);setA(a);setStaff(s);setBranches(b)})},[])
  if(!d)return <Loading/>
  const flow=[
    {n:'01',title:'Users & Roles',sub:'Create staff, assign roles and branch access.',icon:UsersRound,go:'Staff' as ViewKey},
    {n:'02',title:'Products & Menu',sub:'Add products, prices, images and menu items.',icon:Boxes,go:'Products' as ViewKey},
    {n:'03',title:'Suppliers & Purchasing',sub:'Link suppliers, raise POs and receive stock.',icon:Truck,go:'Purchasing' as ViewKey},
    {n:'04',title:'Approvals',sub:'Approve purchases, discounts, voids and wastage.',icon:ShieldCheck,go:'Approvals' as ViewKey},
    {n:'05',title:'Reports',sub:'Review sales, expenses, inventory and reconciliation.',icon:BarChart3,go:'Reports' as ViewKey},
    {n:'06',title:'Branches & Terminals',sub:'Control locations and tills.',icon:Building2,go:'Branches' as ViewKey},
  ]
  return <div>
    <PageHeading eyebrow="Management" title="Business control centre" sub="Set up the business, control users and stock, approve transactions and review performance."/>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Revenue Today" value={money(d.revenueToday,currency)} sub={(d.salesToday||0)+' sales'} icon={WalletCards}/>
      <Stat label="Gross Profit Today" value={money(d.grossProfitToday,currency)} sub="Before operating expenses" icon={BarChart3} tone="blue"/>
      <Stat label="Open Purchase Orders" value={p?.openOrders||0} sub="Draft / approval / partial" icon={PackagePlus} tone="violet"/>
      <Stat label="Pending Approvals" value={a.length} sub="Management attention" icon={ShieldCheck} tone={a.length?'amber':'emerald'}/>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Management workflow" sub="Follow this order when setting up or managing a branch.">
        <div className="grid gap-2 md:grid-cols-2">{flow.map(x=><button key={x.n} onClick={()=>go(x.go)} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-[#22A53A]"><x.icon size={17}/></div>
          <div className="min-w-0"><div className="text-[10px] font-medium text-slate-400">{x.n}</div><div className="text-[13px] font-medium text-slate-800">{x.title}</div><div className="mt-0.5 text-[11px] leading-4 text-slate-400">{x.sub}</div></div>
        </button>)}</div>
      </Panel>

      <Panel title="Business setup" sub="Current administrative configuration.">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Users" value={staff.length}/>
          <Metric label="Branches" value={branches.length}/>
          <Metric label="Low stock" value={d.lowStock||0}/>
          <Metric label="Approvals" value={a.length}/>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={()=>go('Staff')} className="rounded-lg bg-slate-950 px-3 py-2.5 text-[11px] font-medium text-white">Manage Users</button>
          <button onClick={()=>go('Products')} className="rounded-lg border border-slate-200 px-3 py-2.5 text-[11px] font-medium text-slate-700">Add Products</button>
        </div>
      </Panel>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <Panel title="Recent sales"><DataTable head={['Receipt','Amount','Payment','Cashier']} rows={(d.recentSales||[]).map((x:any)=>[<span className="font-medium">{x.receipt_no}</span>,money(x.total,currency),<Badge>{x.payment_method}</Badge>,x.cashier||'—'])}/></Panel>
      <Panel title="Best sellers · 30 days"><DataTable head={['Item','Qty','Sales']} rows={(d.bestSellers||[]).map((x:any)=>[<span className="font-medium">{x.product_name}</span>,Number(x.qty),money(x.total,currency)])}/></Panel>
    </div>
  </div>
}
function Metric({label,value}:{label:string;value:any}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[18px] font-semibold text-slate-900">{value}</div><div className="mt-0.5 text-[10px] text-slate-400">{label}</div></div>}
