import { useEffect, useState } from 'react'
import { Boxes, Building2, AlertTriangle, ClipboardList } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Stat, Panel, DataTable, Loading } from '../components'
export default function Inventory({currency}:{currency:string}){
 const [o,setO]=useState<any>(null),[loc,setLoc]=useState<any[]>([]),[bal,setBal]=useState<any[]>([])
 useEffect(()=>{Promise.all([api('/inventory/overview'),api('/inventory/locations'),api('/inventory/balances')]).then(([o,l,b])=>{setO(o);setLoc(l);setBal(b)})},[])
 if(!o)return <Loading/>
 return <div><PageHeading eyebrow="Stock control" title="Inventory" sub="Multi-location stock, valuation and restaurant-ready inventory control."/>
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"><Stat label="Stock Value" value={money(o.stockValue,currency)} sub="Across all locations" icon={Boxes}/><Stat label="Locations" value={o.locations} sub="Stores & stations" icon={Building2} tone="blue"/><Stat label="Low Stock" value={o.lowStock} sub="Needs attention" icon={AlertTriangle} tone={o.lowStock?'amber':'emerald'}/><Stat label="Open Counts" value={o.openCounts} sub="Physical stock counts" icon={ClipboardList} tone="violet"/></div>
 <div className="grid xl:grid-cols-[.7fr_1.3fr] gap-4 mt-4"><Panel title="Locations"><DataTable head={['Location','Branch','Units','Value']} rows={loc.map(x=>[<b>{x.name}</b>,x.branch_name,Number(x.total_units),money(x.stock_value,currency)])}/></Panel><Panel title="Location balances"><DataTable head={['Product','Location','Qty','Avg Cost','Value']} rows={bal.slice(0,35).map(x=>[<b>{x.product_name}</b>,x.location_name,Number(x.qty),money(x.avg_cost,currency),money(Number(x.qty)*Number(x.avg_cost),currency)])}/></Panel></div>
 </div>
}
