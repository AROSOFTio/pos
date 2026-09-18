import { useEffect, useState } from 'react'
import { api, money, nice } from '../api'
import { PageHeading, Panel, DataTable, Badge, Loading } from '../components'
export default function Expenses({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null)
 useEffect(()=>{api('/expenses').then(setRows)},[])
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Financial control" title="Expenses & Cost Register" sub="Manual operating expenses and automatically reconciled system costs."/>
 <Panel title="Expense register" sub={rows.length+' recent entries'}><DataTable head={['Reference','Date','Category','Description','Source','Treatment','Amount']} rows={rows.map(x=>[<b>{x.reference_no||'EXP-'+x.id}</b>,String(x.expense_date).slice(0,10),x.category,x.description,x.auto_generated?<Badge tone="blue">Auto · {x.source_type}</Badge>:<Badge>Manual</Badge>,nice(x.accounting_treatment),<b>{money(x.amount,currency)}</b>])}/></Panel>
 </div>
}
