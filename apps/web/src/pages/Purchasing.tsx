import { useEffect, useState } from 'react'
import { Truck, WalletCards, ClipboardList, AlertTriangle, Plus } from 'lucide-react'
import { api, money, nice } from '../api'
import { PageHeading, Stat, Panel, DataTable, Badge, Loading } from '../components'
export default function Purchasing({currency}:{currency:string}){
 const [o,setO]=useState<any>(null),[pos,setPos]=useState<any[]>([]),[grns,setGrns]=useState<any[]>([])
 useEffect(()=>{Promise.all([api('/purchasing/overview'),api('/purchase-orders'),api('/grns')]).then(([o,p,g])=>{setO(o);setPos(p);setGrns(g)})},[])
 if(!o)return <Loading/>
 return <div><PageHeading eyebrow="Procurement" title="Purchasing & Receiving" sub="Supplier-controlled purchase orders, approval status and goods receiving." action={<button className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>New Purchase Order</button>}/>
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"><Stat label="Open POs" value={o.openOrders} sub="Draft / approval / partial" icon={Truck}/><Stat label="Month Purchases" value={money(o.purchaseValueMonth,currency)} sub="Purchase order value" icon={WalletCards} tone="blue"/><Stat label="GRNs Today" value={o.receiptsToday} sub="Goods received" icon={ClipboardList} tone="emerald"/><Stat label="Low Stock" value={o.lowStock} sub="Needs attention" icon={AlertTriangle} tone={o.lowStock?'amber':'emerald'}/></div>
 <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4 mt-4"><Panel title="Purchase Orders"><DataTable head={['PO','Supplier','Status','Received','Total']} rows={pos.map(x=>[<div><b>{x.po_no}</b><div className="text-[11px] text-slate-400">{x.branch_name}</div></div>,x.supplier_name,<Badge tone={x.status==='rejected'?'red':x.status==='ordered'||x.status==='received'?'green':x.status==='pending_approval'?'amber':'slate'}>{nice(x.status)}</Badge>,Number(x.received_qty)+'/'+Number(x.total_qty),money(x.total,currency)])}/></Panel><Panel title="Recent GRNs"><DataTable head={['GRN','Supplier','Total']} rows={grns.slice(0,12).map(x=>[<b>{x.grn_no}</b>,x.supplier_name,money(x.total,currency)])}/></Panel></div>
 </div>
}
