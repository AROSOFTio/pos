import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal } from '../components'

export default function Products({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[suppliers,setSuppliers]=useState<any[]>([]),[open,setOpen]=useState(false)
 const [form,setForm]=useState({name:'',sku:'',barcode:'',category:'General',cost:0,price:0,stock:0,reorderLevel:0,supplierIds:[] as number[]})
 const load=()=>api('/products').then(setRows)
 useEffect(()=>{load()},[])
 async function show(){setSuppliers(await api('/suppliers'));setOpen(true)}
 async function save(){if(!form.name.trim())return;await api('/products',{method:'POST',body:JSON.stringify(form)});setOpen(false);setForm({name:'',sku:'',barcode:'',category:'General',cost:0,price:0,stock:0,reorderLevel:0,supplierIds:[]});await load()}
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Catalogue" title="Products" sub="Sellable products, prices, stock thresholds and supplier links." action={<button onClick={show} className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"><Plus size={16} className="inline mr-1"/>New Product</button>}/>
 <Panel title="Product catalogue" sub={rows.length+' active products'}><DataTable head={['Product','Category','Stock','Cost','Price','Suppliers']} rows={rows.map(x=>[<div><b>{x.name}</b><div className="text-[11px] text-slate-400">{x.sku||x.barcode||''}</div></div>,x.category,Number(x.stock),money(x.cost,currency),money(x.price,currency),(x.suppliers||[]).map((s:any)=>s.name).join(', ')||'-'])}/></Panel>
 {open&&<Modal title="New Product" onClose={()=>setOpen(false)}><div className="grid sm:grid-cols-2 gap-3">
  <Field label="Name"><input className="control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
  <Field label="Category"><input className="control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></Field>
  <Field label="SKU"><input className="control" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></Field>
  <Field label="Barcode"><input className="control" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></Field>
  <Field label="Cost"><input className="control" type="number" min="0" value={form.cost} onChange={e=>setForm({...form,cost:Number(e.target.value)})}/></Field>
  <Field label="Selling price"><input className="control" type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></Field>
  <Field label="Opening stock"><input className="control" type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/></Field>
  <Field label="Reorder level"><input className="control" type="number" min="0" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:Number(e.target.value)})}/></Field>
 </div><div className="mt-4"><div className="text-[13px] font-medium text-slate-700">Suppliers</div><div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">{suppliers.map(s=><label key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"><input type="checkbox" checked={form.supplierIds.includes(Number(s.id))} onChange={e=>setForm({...form,supplierIds:e.target.checked?[...form.supplierIds,Number(s.id)]:form.supplierIds.filter(id=>id!==Number(s.id))})}/>{s.name}</label>)}</div></div><button onClick={save} className="mt-4 w-full rounded-xl bg-slate-900 text-white py-3 font-medium">Save Product</button></Modal>}</div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-[13px] font-medium text-slate-700">{label}{children}</label>}
