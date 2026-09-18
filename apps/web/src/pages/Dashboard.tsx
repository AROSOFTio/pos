import { useEffect, useState } from 'react'
import { WalletCards, BarChart3, Truck, ShieldCheck, Store, AlertTriangle, ReceiptText } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, Stat, DataTable, Badge, Loading } from '../components'
import type { ViewKey } from '../App'

export default function Dashboard({currency,go}:{currency:string;go:(v:ViewKey)=>void}){
  const [d,setD]=useState<any>(null),[r,setR]=useState<any>(null),[p,setP]=useState<any>(null),[a,setA]=useState<any[]>([])
  useEffect(()=>{Promise.all([api('/dashboard'),api('/restaurant/overview'),api('/purchasing/overview'),api('/approvals?status=pending')]).then(([d,r,p,a])=>{setD(d);setR(r);setP(p);setA(a)})},[])
  if(!d)return <Loading/>
  return <div>
    <PageHeading eyebrow="Live overview" title="Good evening, your operation is live." sub="A clean real-time view of sales, restaurant service, stock and approvals."/>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Stat label="Revenue Today" value={money(d.revenueToday,currency)} sub={(d.salesToday||0)+' completed sales'} icon={WalletCards}/>
      <Stat label="Gross Profit Today" value={money(d.grossProfitToday,currency)} sub="Before operating expenses" icon={BarChart3} tone="blue"/>
      <Stat label="Open Purchase Orders" value={p?.openOrders||0} sub="Draft / approval / partial" icon={Truck} tone="violet"/>
      <Stat label="Pending Approvals" value={a.length} sub="Management attention" icon={ShieldCheck} tone={a.length?'amber':'emerald'}/>
    </div>
    <div className="grid xl:grid-cols-[1.25fr_.75fr] gap-4 mt-4">
      <Panel title="Restaurant pulse" sub="Floor and menu status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Tables',r?.tables||0],['Occupied',r?.occupied||0],['Available menu',r?.availableMenu||0],['Sold out',r?.soldOut||0]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-slate-50 p-4"><div className="text-xl font-black">{v}</div><div className="text-xs text-slate-500 mt-1">{k}</div></div>)}
        </div>
        <div className="mt-5 flex gap-2 flex-wrap"><button onClick={()=>go('POS')} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold">Open POS</button><button onClick={()=>go('Orders')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Restaurant Orders</button><button onClick={()=>go('Kitchen')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Kitchen Display</button></div>
      </Panel>
      <Panel title="Attention" sub="What needs action now">
        <div className="space-y-3">
          <Mini icon={ShieldCheck} title={a.length+' approval request'+(a.length===1?'':'s')} sub="Review management controls"/>
          <Mini icon={AlertTriangle} title={(d.lowStock||0)+' low-stock item'+(d.lowStock===1?'':'s')} sub="Reorder or transfer stock"/>
          <Mini icon={ReceiptText} title={money(d.expensesToday,currency)} sub="Operating expenses today"/>
        </div>
      </Panel>
    </div>
    <div className="grid xl:grid-cols-2 gap-4 mt-4">
      <Panel title="Recent sales"><DataTable head={['Receipt','Amount','Payment','Cashier']} rows={(d.recentSales||[]).map((x:any)=>[<b>{x.receipt_no}</b>,money(x.total,currency),<Badge>{x.payment_method}</Badge>,x.cashier])}/></Panel>
      <Panel title="Best sellers · 30 days"><DataTable head={['Item','Qty','Sales']} rows={(d.bestSellers||[]).map((x:any)=>[<b>{x.product_name}</b>,Number(x.qty),money(x.total,currency)])}/></Panel>
    </div>
  </div>
}
function Mini({icon:Icon,title,sub}:{icon:any;title:string;sub:string}){return <div className="flex gap-3 items-center rounded-xl border border-slate-100 p-3"><div className="h-9 w-9 rounded-lg bg-slate-100 grid place-items-center text-slate-600"><Icon size={16}/></div><div><div className="text-sm font-bold">{title}</div><div className="text-xs text-slate-400 mt-0.5">{sub}</div></div></div>}
