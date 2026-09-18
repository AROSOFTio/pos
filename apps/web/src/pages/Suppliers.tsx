import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal } from '../components'

export default function Suppliers({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[products,setProducts]=useState<any[]>([]),[open,setOpen]=useState(false)
 const [form,setForm]=useState({name:'',phone:'',email:'',productIds:[] as number[]})
 const load=()=>api('/suppliers').then(setRows)
 useEffect(()=>{load()},[])
 async function show(){setProducts(await api('/inventory/items'));setOpen(true)}
 async function save(){if(!form.name.trim())return;await api('/suppliers',{method:'POST',body:JSON.stringify(form)});setOpen(false);setForm({name:'',phone:'',email:'',productIds:[]});await load()}
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Procurement master" title="Suppliers" sub="Supplier contacts and exactly which products each supplier provides." action={<button onClick={show} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>New Supplier</button>}/>
 <Panel title="Suppliers" sub={rows.length+' registered suppliers'}><DataTable head={['Supplier','Contact','Products','Indicative value']} rows={rows.map(x=>[<b>{x.name}</b>,<div><div>{x.phone||'-'}</div><div className="text-[11px] text-slate-400">{x.email||''}</div></div>,(x.products||[]).map((p:any)=>p.name).join(', ')||'-',money((x.products||[]).reduce((n:number,p:any)=>n+Number(p.supplierPrice||p.price||0),0),currency)])}/></Panel>
 {open&&<Modal title="New Supplier" onClose={()=>setOpen(false)}><div className="grid sm:grid-cols-2 gap-3"><Field label="Supplier name"><input className="control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Phone"><input className="control" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Email"><input className="control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field></div><div className="mt-4"><div className="text-sm font-semibold text-slate-700">Products this supplier provides</div><div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">{products.map(p=><label key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"><input type="checkbox" checked={form.productIds.includes(Number(p.id))} onChange={e=>setForm({...form,productIds:e.target.checked?[...form.productIds,Number(p.id)]:form.productIds.filter(id=>id!==Number(p.id))})}/>{p.name}</label>)}</div></div><button onClick={save} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold">Save Supplier</button></Modal>}</div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
