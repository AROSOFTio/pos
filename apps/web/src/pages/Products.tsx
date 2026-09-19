import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ImagePlus, Package, Pencil, Plus, ScanLine, X } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal, Badge } from '../components'
import BarcodeScanner from '../components/BarcodeScanner'

const blank={name:'',sku:'',barcode:'',category:'',cost:'',price:'',stock:'',reorderLevel:'',supplierIds:[] as number[]}

export default function Products({currency,allowScanning=false}:{currency:string;allowScanning?:boolean}){
 const [rows,setRows]=useState<any[]|null>(null),[suppliers,setSuppliers]=useState<any[]>([]),[open,setOpen]=useState(false),[form,setForm]=useState(blank)
 const [image,setImage]=useState<File|null>(null),[preview,setPreview]=useState(''),[saving,setSaving]=useState(false),[query,setQuery]=useState('')
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[createdId,setCreatedId]=useState<number|null>(null),[editing,setEditing]=useState<any>(null)
 const [categories,setCategories]=useState<any[]>([]),[scannerOpen,setScannerOpen]=useState(false),[categoryOpen,setCategoryOpen]=useState(false),[newCategory,setNewCategory]=useState('')
 const [requests,setRequests]=useState<any[]>([]),[sourceRequestId,setSourceRequestId]=useState<number|null>(null)
 const load=()=>Promise.all([api('/products'),api('/product-categories').catch(()=>[]),api('/product-requests').catch(()=>[])]).then(([r,c,q])=>{setRows(Array.isArray(r)?r:[]);setCategories(Array.isArray(c)?c:[]);setRequests(Array.isArray(q)?q:[])})
 useEffect(()=>{load()},[])
 useEffect(()=>()=>{if(preview.startsWith('blob:'))URL.revokeObjectURL(preview)},[preview])
 const shown=useMemo(()=>rows?.filter(x=>!query.trim()||[x.name,x.sku,x.barcode,x.category].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))||[],[rows,query])

 async function show(product?:any){
   setError('');setSuccess('');setCreatedId(null);setEditing(product||null);setSourceRequestId(null)
   try{const [s,c]=await Promise.all([api('/suppliers'),api('/product-categories')]);setSuppliers(Array.isArray(s)?s:[]);setCategories(Array.isArray(c)?c:[])}catch{setSuppliers([])}
   if(product){
     setForm({name:product.name||'',sku:product.sku||'',barcode:product.barcode||'',category:product.category||'',cost:product.cost!=null?String(product.cost):'',price:product.price!=null?String(product.price):'',stock:product.stock!=null?String(product.stock):'',reorderLevel:product.reorder_level!=null?String(product.reorder_level):'',supplierIds:(product.suppliers||[]).map((x:any)=>Number(x.id))})
     setPreview(product.image_url||'')
   }else{setForm({...blank,category:String(categories[0]?.name||'General')});setPreview('')}
   setImage(null);setOpen(true)
 }
 function close(){if(saving)return;setOpen(false);setError('');setSuccess('');setCreatedId(null);setEditing(null);setSourceRequestId(null)}
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
     let id=editing?.id?Number(editing.id):createdId
     if(editing?.id){
       await api('/products/'+editing.id,{method:'PUT',body:JSON.stringify({name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim()||'General',cost:Number(form.cost||0),price:Number(form.price||0),reorderLevel:Number(form.reorderLevel||0),supplierIds:form.supplierIds})})
     }else if(!id){
       const p=await api('/products',{method:'POST',body:JSON.stringify({name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim()||'General',cost:Number(form.cost||0),price:Number(form.price||0),stock:Number(form.stock||0),reorderLevel:Number(form.reorderLevel||0),supplierIds:form.supplierIds,requestId:sourceRequestId})})
       id=Number(p.id);setCreatedId(id)
     }
     if(image&&id)await uploadProductImage(id,image)
     await load()
     setSuccess(editing?'Product updated successfully.':'Product saved successfully.')
     setTimeout(()=>{setOpen(false);setSuccess('');setCreatedId(null);setEditing(null);setImage(null);setPreview('');setForm(blank)},180)
   }catch(e:any){
     setError(e?.message||'Product could not be saved. Please try again.')
     await load().catch(()=>{})
   }finally{setSaving(false)}
 }

 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Catalogue" title="Products" sub="Products, pricing, suppliers and product images." action={<button onClick={()=>show()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-slate-800"><Plus size={15}/>Add Product</button>}/>
  {requests.some(x=>x.status==='pending')&&<Panel title="Requested Items" sub={requests.filter(x=>x.status==='pending').length+' awaiting review'}>
    <DataTable head={['Requested item','Scanned code','Requested by','Action']} rows={requests.filter(x=>x.status==='pending').slice(0,20).map(r=>[
      <div><div className="font-medium text-slate-800">{r.name||'Unnamed item'}</div>{r.notes&&<div className="mt-0.5 text-[10px] text-slate-400">{r.notes}</div>}</div>,
      r.scanned_code||'-',r.requested_by_name||'-',
      <div className="flex gap-2"><button onClick={async()=>{setSourceRequestId(Number(r.id));setEditing(null);setError('');setSuccess('');setCreatedId(null);try{const [s,cats]=await Promise.all([api('/suppliers'),api('/product-categories')]);setSuppliers(Array.isArray(s)?s:[]);setCategories(Array.isArray(cats)?cats:[])}catch{}setForm({...blank,name:r.name||'',barcode:r.scanned_code||'',category:String(categories[0]?.name||'General')});setPreview('');setImage(null);setOpen(true)}} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[10px] font-medium text-white">Create Product</button><button onClick={async()=>{await api('/product-requests/'+r.id+'/status',{method:'PUT',body:JSON.stringify({status:'rejected'})});await load()}} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-medium text-slate-500">Reject</button></div>
    ])}/>
  </Panel>}
  <div className={requests.some(x=>x.status==='pending')?'mt-4':''}><Panel title="Product catalogue" sub={rows.length+' products'} action={<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="hidden w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10 sm:block"/>}>
    <div className="mb-3 sm:hidden"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="control mt-0"/></div>
    <DataTable head={['Product','Category','Stock','Cost','Price','Suppliers','']} rows={shown.map(x=>[
      <div className="flex items-center gap-3">
        {x.image_url?<div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-100 bg-white p-1"><img src={x.image_url} className="max-h-full max-w-full object-contain" alt={x.name}/></div>:<div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-300"><Package size={18}/></div>}
        <div className="min-w-0"><div className="max-w-[230px] truncate font-medium text-slate-800">{x.name}</div><div className="text-[10px] text-slate-400">{x.sku||x.barcode||'No SKU'}</div></div>
      </div>,
      x.category,<Badge tone={Number(x.stock)<=Number(x.reorder_level)?'amber':'green'}>{Number(x.stock)}</Badge>,money(x.cost,currency),money(x.price,currency),(x.suppliers||[]).map((s:any)=>s.name).join(', ')||'-',
      <button onClick={()=>show(x)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"><Pencil size={12}/>Edit</button>
    ])}/>
  </Panel></div>

  {open&&<Modal title={editing?'Edit product':'Add product'} onClose={close} size="xl">
    <div className="space-y-5">
      {error&&<div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-[12px] text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
      {success&&<div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-[12px] text-emerald-700"><CheckCircle2 size={16}/><span>{success}</span></div>}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[96px_1fr] sm:items-center">
        <div className="relative mx-auto sm:mx-0">
          <label className="grid h-24 w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-2 transition hover:border-[#22A53A] hover:bg-emerald-50/20">
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
        <Field label="Category"><div className="flex gap-2"><select className="control mt-0 flex-1" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Choose category</option>{categories.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select><button type="button" onClick={()=>setCategoryOpen(true)} className="rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600">+ Category</button></div></Field>
        <Field label="Product code / SKU"><input className="control" value={editing?(form.sku||editing.product_code||''):'Generated automatically after save'} disabled/></Field>
        {allowScanning&&<Field label="Barcode"><div className="flex gap-2"><input className="control mt-0 flex-1" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} placeholder="Scan or enter barcode"/><button type="button" onClick={()=>setScannerOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600"><ScanLine size={14}/>Scan</button></div></Field>}
        <Field label={'Cost ('+currency+')'}><input className="control" inputMode="decimal" type="text" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter cost"/></Field>
        <Field label={'Selling price ('+currency+')'}><input className="control" inputMode="decimal" type="text" value={form.price} onChange={e=>setForm({...form,price:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter selling price"/></Field>
        <Field label={editing?'Current stock':'Opening stock'}><input className="control" inputMode="decimal" type="text" disabled={!!editing} value={form.stock} onChange={e=>setForm({...form,stock:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter opening quantity"/>{editing&&<span className="mt-1 block text-[9.5px] font-normal text-slate-400">Adjust stock from Inventory to keep the movement ledger correct.</span>}</Field>
        <Field label="Reorder level"><input className="control" inputMode="decimal" type="text" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Optional"/></Field>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="text-[12px] font-semibold text-slate-700">Suppliers</div>
        <div className="mt-1 text-[10.5px] text-slate-400">Optional. Link this product to one or more approved suppliers.</div>
        {suppliers.length?<div className="mt-3 grid max-h-32 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{suppliers.map(s=><label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 transition hover:border-slate-200"><input type="checkbox" className="h-4 w-4 accent-[#22A53A]" checked={form.supplierIds.includes(Number(s.id))} onChange={e=>setForm({...form,supplierIds:e.target.checked?[...form.supplierIds,Number(s.id)]:form.supplierIds.filter(id=>id!==Number(s.id))})}/><span className="truncate">{s.name}</span></label>)}</div>:<div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] text-slate-400">No suppliers have been added yet.</div>}
      </div>

      <div className="sticky bottom-0 z-10 mt-2 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        <button type="button" onClick={close} disabled={saving} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">Cancel</button>
        <button onClick={save} disabled={saving||!form.name.trim()} className="w-full min-w-36 rounded-lg bg-[#22A53A] px-5 py-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#1d9132] disabled:opacity-40 sm:w-auto">{saving?(editing?'Updating product…':'Saving product…'):(editing?'Update Product':'Save Product')}</button>
      </div>
    </div>
  </Modal>}

  {allowScanning&&<BarcodeScanner open={scannerOpen} onClose={()=>setScannerOpen(false)} onDetected={code=>setForm({...form,barcode:code})} title="Scan product barcode"/>}

  {categoryOpen&&<Modal title="Add Product Category" onClose={()=>setCategoryOpen(false)} size="sm">
    <Field label="Category name" required><input className="control" autoFocus value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="e.g. Drinks"/></Field>
    <button onClick={async()=>{const name=newCategory.trim();if(!name)return;try{const out=await api('/product-categories',{method:'POST',body:JSON.stringify({name})});setCategories(v=>[...v.filter(x=>x.name!==out.name),out].sort((a,b)=>a.name.localeCompare(b.name)));setForm({...form,category:out.name});setNewCategory('');setCategoryOpen(false)}catch(e:any){setError(e.message)}}} disabled={!newCategory.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Category</button>
  </Modal>}
 </div>
}

function Field({label,children,required=false}:{label:string;children:any;required?:boolean}){
 return <label className="block text-[11.5px] font-medium text-slate-600">{label}{required&&<span className="ml-1 text-red-500">*</span>}{children}</label>
}
