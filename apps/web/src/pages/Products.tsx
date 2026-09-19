import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ImagePlus, Package, Plus, Search, X } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal, Badge } from '../components'

const blank={name:'',sku:'',barcode:'',category:'',cost:'',price:'',stock:'',reorderLevel:'',supplierIds:[] as number[]}

export default function Products({currency}:{currency:string}){
 const [rows,setRows]=useState<any[]|null>(null),[suppliers,setSuppliers]=useState<any[]>([]),[open,setOpen]=useState(false),[form,setForm]=useState(blank)
 const [image,setImage]=useState<File|null>(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false),[query,setQuery]=useState('')
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[createdId,setCreatedId]=useState<number|null>(null)
 const load=()=>api('/products').then(setRows)
 useEffect(()=>{load()},[])
 useEffect(()=>()=>{if(preview.startsWith('blob:'))URL.revokeObjectURL(preview)},[preview])
 const shown=useMemo(()=>rows?.filter(x=>!query.trim()||[x.name,x.sku,x.barcode,x.category].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))||[],[rows,query])

 async function show(){
   setError('');setSuccess('');setCreatedId(null)
   try{setSuppliers(await api('/suppliers'))}catch{setSuppliers([])}
   setForm(blank);setImage(null);setPreview('');setOpen(true)
 }
 function close(){if(saving)return;setOpen(false);setError('');setSuccess('');setCreatedId(null)}
 function chooseImage(file?:File){
   setError('')
   if(!file)return
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Use a PNG, JPG or WebP image.');return}
   if(file.size>5*1024*1024){setError('Image must be 5MB or smaller.');return}
   if(preview.startsWith('blob:'))URL.revokeObjectURL(preview)
   setImage(file);setPreview(URL.createObjectURL(file))
 }
 function removeImage(){if(preview.startsWith('blob:'))URL.revokeObjectURL(preview);setImage(null);setPreview('')}
 async function uploadProductImage(id:number,file:File){
   const fd=new FormData();fd.append('image',file)
   const token=localStorage.getItem('pos_token')
   const r=await fetch('/api/products/'+id+'/image',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd})
   const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Image upload failed')
   return b
 }
 async function save(){
   setError('');setSuccess('')
   if(!form.name.trim()){setError('Product name is required.');return}
   if([form.cost,form.price,form.stock,form.reorderLevel].some(v=>v!==''&&Number(v)<0)){setError('Cost, price and stock values cannot be negative.');return}
   setSaving(true)
   try{
     let id=createdId
     if(!id){
       const p=await api('/products',{method:'POST',body:JSON.stringify({...form,name:form.name.trim(),sku:form.sku.trim(),barcode:form.barcode.trim(),category:form.category.trim()||'General',cost:Number(form.cost||0),price:Number(form.price||0),stock:Number(form.stock||0),reorderLevel:Number(form.reorderLevel||0)})})
       id=Number(p.id);setCreatedId(id)
     }
     if(image)await uploadProductImage(id,image)
     await load()
     setSuccess('Product saved successfully.')
     setTimeout(()=>{setOpen(false);setSuccess('');setCreatedId(null)},450)
   }catch(e:any){
     setError(e?.message||'Product could not be saved. Please try again.')
     await load().catch(()=>{})
   }finally{setSaving(false)}
 }

 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Catalogue" title="Products" sub="Products, pricing, suppliers and product images." action={<button onClick={show} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800"><Plus size={15}/>Add Product</button>}/>
  <Panel title="Product catalogue" sub={rows.length+' products'} action={<div className="relative hidden sm:block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[12px] outline-none transition focus:border-[#22A53A] focus:ring-2 focus:ring-[#22A53A]/10"/></div>}>
    <div className="mb-3 sm:hidden"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="control mt-0 pl-9"/></div></div>
    <DataTable head={['Product','Category','Stock','Cost','Price','Suppliers']} rows={shown.map(x=>[
      <div className="flex items-center gap-3">
        {x.image_url?<div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-100 bg-white p-1"><img src={x.image_url} className="max-h-full max-w-full object-contain" alt={x.name}/></div>:<div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-300"><Package size={18}/></div>}
        <div className="min-w-0"><div className="max-w-[230px] truncate font-medium text-slate-800">{x.name}</div><div className="text-[10px] text-slate-400">{x.sku||x.barcode||'No SKU'}</div></div>
      </div>,
      x.category,<Badge tone={Number(x.stock)<=Number(x.reorder_level)?'amber':'green'}>{Number(x.stock)}</Badge>,money(x.cost,currency),money(x.price,currency),(x.suppliers||[]).map((s:any)=>s.name).join(', ')||'-'
    ])}/>
  </Panel>

  {open&&<Modal title="Add product" onClose={close} size="lg">
    <div className="space-y-5">
      {error&&<div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-[12px] text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
      {success&&<div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-[12px] text-emerald-700"><CheckCircle2 size={16}/><span>{success}</span></div>}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-[132px_1fr] sm:items-center">
        <div className="relative mx-auto sm:mx-0">
          <label className="grid h-32 w-32 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-2 transition hover:border-[#22A53A] hover:bg-emerald-50/20">
            {preview?<img src={preview} className="max-h-full max-w-full object-contain" alt="Product preview"/>:<div className="text-center text-slate-400"><ImagePlus size={24} className="mx-auto"/><span className="mt-1.5 block text-[10px]">Add image</span></div>}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>chooseImage(e.target.files?.[0])}/>
          </label>
          {preview&&<button type="button" onClick={removeImage} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-red-600" title="Remove image"><X size={13}/></button>}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-slate-800">Product image</div>
          <div className="mt-1 max-w-md text-[11px] leading-5 text-slate-500">The full image is kept visible without cropping. PNG, JPG or WebP, maximum 5MB. Square images work best on POS cards.</div>
          {image&&<div className="mt-2 inline-flex max-w-full rounded-lg bg-white px-2.5 py-1.5 text-[10px] text-emerald-700 shadow-sm ring-1 ring-slate-100"><span className="truncate">{image.name}</span></div>}
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
        <Field label="Product name" required><input className="control" autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Chicken Burger"/></Field>
        <Field label="Category"><input className="control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Burgers, Drinks, General"/></Field>
        <Field label="SKU"><input className="control" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="Optional"/></Field>
        <Field label="Barcode"><input className="control" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} placeholder="Optional"/></Field>
        <Field label={'Cost ('+currency+')'}><input className="control" inputMode="decimal" type="text" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter cost"/></Field>
        <Field label={'Selling price ('+currency+')'}><input className="control" inputMode="decimal" type="text" value={form.price} onChange={e=>setForm({...form,price:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter selling price"/></Field>
        <Field label="Opening stock"><input className="control" inputMode="decimal" type="text" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter opening quantity"/></Field>
        <Field label="Reorder level"><input className="control" inputMode="decimal" type="text" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Optional"/></Field>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="text-[12px] font-semibold text-slate-700">Suppliers</div>
        <div className="mt-1 text-[10.5px] text-slate-400">Optional. Link this product to one or more approved suppliers.</div>
        {suppliers.length?<div className="mt-3 grid max-h-32 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{suppliers.map(s=><label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 transition hover:border-slate-200"><input type="checkbox" className="h-4 w-4 accent-[#22A53A]" checked={form.supplierIds.includes(Number(s.id))} onChange={e=>setForm({...form,supplierIds:e.target.checked?[...form.supplierIds,Number(s.id)]:form.supplierIds.filter(id=>id!==Number(s.id))})}/><span className="truncate">{s.name}</span></label>)}</div>:<div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-400">No suppliers have been added yet.</div>}
      </div>

      <div className="sticky bottom-0 z-10 mt-2 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <button type="button" onClick={close} disabled={saving} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">Cancel</button>
        <button onClick={save} disabled={saving||!form.name.trim()} className="w-full min-w-36 rounded-lg bg-[#22A53A] px-5 py-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1d9132] disabled:opacity-40 sm:w-auto">{saving?'Saving product…':'Save Product'}</button>
      </div>
    </div>
  </Modal>}
 </div>
}

function Field({label,children,required=false}:{label:string;children:any;required?:boolean}){
 return <label className="block text-[11.5px] font-medium text-slate-600">{label}{required&&<span className="ml-1 text-red-500">*</span>}{children}</label>
}
