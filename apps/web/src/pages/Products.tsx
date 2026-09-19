import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Package, Plus, Search } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal, Badge } from '../components'

const blank={name:'',sku:'',barcode:'',category:'General',cost:0,price:0,stock:0,reorderLevel:0,supplierIds:[] as number[]}

export default function Products({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[suppliers,setSuppliers]=useState<any[]>([]),[open,setOpen]=useState(false),[form,setForm]=useState(blank)
 const [image,setImage]=useState<File|null>(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false),[query,setQuery]=useState('')
 const load=()=>api('/products').then(setRows)
 useEffect(()=>{load()},[])
 const shown=useMemo(()=>rows?.filter(x=>!query.trim()||[x.name,x.sku,x.barcode,x.category].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))||[],[rows,query])
 async function show(){setSuppliers(await api('/suppliers'));setForm(blank);setImage(null);setPreview('');setOpen(true)}
 function chooseImage(file?:File){if(!file)return;setImage(file);setPreview(URL.createObjectURL(file))}
 async function uploadProductImage(id:number,file:File){
   const fd=new FormData();fd.append('image',file)
   const token=localStorage.getItem('pos_token')
   const r=await fetch('/api/products/'+id+'/image',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd})
   const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Image upload failed')
 }
 async function save(){if(!form.name.trim())return;setSaving(true);try{const p=await api('/products',{method:'POST',body:JSON.stringify(form)});if(image)await uploadProductImage(Number(p.id),image);setOpen(false);await load()}finally{setSaving(false)}}
 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Catalogue" title="Products" sub="Products, pricing, suppliers and product images." action={<button onClick={show} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white"><Plus size={15}/>Add Product</button>}/>
  <Panel title="Product catalogue" sub={rows.length+' products'} action={<div className="relative hidden sm:block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-[12px] outline-none focus:border-emerald-400"/></div>}>
    <DataTable head={['Product','Category','Stock','Cost','Price','Suppliers']} rows={shown.map(x=>[
      <div className="flex items-center gap-3">
        {x.image_url?<img src={x.image_url} className="h-11 w-11 rounded-lg border border-slate-100 object-cover" alt=""/>:<div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-50 text-slate-300"><Package size={18}/></div>}
        <div><div className="font-medium text-slate-800">{x.name}</div><div className="text-[10px] text-slate-400">{x.sku||x.barcode||'No SKU'}</div></div>
      </div>,
      x.category,<Badge tone={Number(x.stock)<=Number(x.reorder_level)?'amber':'green'}>{Number(x.stock)}</Badge>,money(x.cost,currency),money(x.price,currency),(x.suppliers||[]).map((s:any)=>s.name).join(', ')||'-'
    ])}/>
  </Panel>

  {open&&<Modal title="Add product" onClose={()=>setOpen(false)}>
    <div className="mb-4 grid grid-cols-[96px_1fr] gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <label className="grid h-24 w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
        {preview?<img src={preview} className="h-full w-full object-cover" alt="Preview"/>:<div className="text-center text-slate-400"><ImagePlus size={20} className="mx-auto"/><span className="mt-1 block text-[10px]">Add image</span></div>}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>chooseImage(e.target.files?.[0])}/>
      </label>
      <div className="self-center"><div className="text-[13px] font-medium text-slate-700">Product image</div><div className="mt-1 text-[11px] leading-5 text-slate-400">PNG, JPG or WebP. Max 5MB. Shown in POS and menu cards.</div>{image&&<div className="mt-2 text-[11px] text-emerald-700">{image.name}</div>}</div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Product name"><input className="control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
      <Field label="Category"><input className="control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></Field>
      <Field label="SKU"><input className="control" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></Field>
      <Field label="Barcode"><input className="control" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></Field>
      <Field label="Cost"><input className="control" type="number" min="0" value={form.cost} onChange={e=>setForm({...form,cost:Number(e.target.value)})}/></Field>
      <Field label="Selling price"><input className="control" type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></Field>
      <Field label="Opening stock"><input className="control" type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/></Field>
      <Field label="Reorder level"><input className="control" type="number" min="0" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:Number(e.target.value)})}/></Field>
    </div>

    <div className="mt-4"><div className="text-[12px] font-medium text-slate-600">Suppliers</div><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2">{suppliers.map(s=><label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px]"><input type="checkbox" checked={form.supplierIds.includes(Number(s.id))} onChange={e=>setForm({...form,supplierIds:e.target.checked?[...form.supplierIds,Number(s.id)]:form.supplierIds.filter(id=>id!==Number(s.id))})}/>{s.name}</label>)}</div></div>
    <button onClick={save} disabled={saving||!form.name.trim()} className="mt-4 w-full rounded-lg bg-[#22A53A] py-3 text-[13px] font-medium text-white disabled:opacity-40">{saving?'Saving…':'Save Product'}</button>
  </Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-[12px] font-medium text-slate-600">{label}{children}</label>}
