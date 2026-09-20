import { useEffect, useMemo, useState } from 'react'
import { Building2, UtensilsCrossed, ReceiptText, Percent, ShieldCheck, ImagePlus, Pencil, Plus, Printer, LayoutGrid, MonitorSmartphone, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, Loading, DataTable, Badge, Modal } from '../components'

const asArray=(value:any):any[]=>Array.isArray(value)?value:Array.isArray(value?.rows)?value.rows:Array.isArray(value?.data)?value.data:[]
type Section='business'|'tables'|'menu'|'operations'|'documents'|'devices'|'tax'|'security'

const nav:Array<[Section,string,any,string]>=[
 ['business','Business Profile',Building2,'Name, logo and contact details'],
 ['tables','Floors & Tables',LayoutGrid,'Restaurant areas and table setup'],
 ['menu','Menu & Pricing',UtensilsCrossed,'Categories, prices and availability'],
 ['operations','Restaurant Policies',SlidersHorizontal,'Reservations, stock, loyalty and terminal behavior'],
 ['documents','Receipts & Printing',ReceiptText,'Bills, receipts, KOT and printers'],
 ['devices','Devices & Recovery',MonitorSmartphone,'Registered terminals and print recovery'],
 ['tax','Tax & Charges',Percent,'Tax and service charge defaults'],
 ['security','Security',ShieldCheck,'Password and account security'],
]

const themes=[
 {key:'green',name:'Green',primary:'#22A53A',soft:'#ECF8EF'},
 {key:'blue',name:'Blue',primary:'#2563EB',soft:'#EFF6FF'},
 {key:'maroon',name:'Maroon',primary:'#8B1E3F',soft:'#FBEFF3'},
 {key:'gold',name:'Gold',primary:'#B7791F',soft:'#FFF8E7'},
 {key:'dark',name:'Dark',primary:'#A3E635',soft:'#171D23'},
]

export default function Settings(){
 const [section,setSection]=useState<Section>('business')
 const [s,setS]=useState<any>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [profiles,setProfiles]=useState<any[]>([]),[profileName,setProfileName]=useState('Customer Receipt'),[profileType,setProfileType]=useState('receipt'),[paperSize,setPaperSize]=useState('80mm'),[printerName,setPrinterName]=useState(''),[stationId,setStationId]=useState<number|''>(''),[stations,setStations]=useState<any[]>([]),[printLogs,setPrintLogs]=useState<any[]>([])
 const [branches,setBranches]=useState<any[]>([]),[areas,setAreas]=useState<any[]>([]),[tables,setTables]=useState<any[]>([])
 const [categories,setCategories]=useState<any[]>([]),[menu,setMenu]=useState<any[]>([]),[products,setProducts]=useState<any[]>([])
 const [tableOpen,setTableOpen]=useState(false),[areaOpen,setAreaOpen]=useState(false),[categoryOpen,setCategoryOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false)
 const [editingTable,setEditingTable]=useState<any>(null),[editingMenu,setEditingMenu]=useState<any>(null)
 const [area,setArea]=useState({branchId:0,name:''})
 const [table,setTable]=useState({branchId:0,areaId:0,name:'',code:'',capacity:2,status:'available',cleanlinessStatus:'clean'})
 const [category,setCategory]=useState({name:'',defaultStationId:0})
 const [menuForm,setMenuForm]=useState({productId:0,categoryId:0,kitchenStationId:0,price:'',available:true,soldOut:false})
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[passwordMessage,setPasswordMessage]=useState(''),[passwordBusy,setPasswordBusy]=useState(false)
 const [policies,setPolicies]=useState<any>(null),[devices,setDevices]=useState<any[]>([]),[printJobs,setPrintJobs]=useState<any[]>([]),[policyBusy,setPolicyBusy]=useState(false)

 const load=()=>Promise.all([
   api('/document-settings'),
   api('/print/profiles').catch(()=>[]),
   api('/restaurant/stations').catch(()=>[]),
   api('/print/logs').catch(()=>[]),
   api('/branches').catch(()=>[]),
   api('/restaurant/areas').catch(()=>[]),
   api('/restaurant/tables').catch(()=>[]),
   api('/menu/categories').catch(()=>[]),
   api('/menu/items').catch(()=>[]),
   api('/products').catch(()=>[]),
   api('/restaurant/policies').catch(()=>({})),
   api('/devices').catch(()=>[]),
   api('/print-jobs').catch(()=>[])
 ]).then(([x,p,ks,logs,b,a,t,c,m,pr,pol,dev,jobs])=>{
   setS(x&&typeof x==='object'&&!Array.isArray(x)?x:{})
   setProfiles(asArray(p));setStations(asArray(ks));setPrintLogs(asArray(logs));setBranches(asArray(b));setAreas(asArray(a));setTables(asArray(t));setCategories(asArray(c));setMenu(asArray(m));setProducts(asArray(pr));setPolicies(pol&&typeof pol==='object'?pol:{});setDevices(asArray(dev));setPrintJobs(asArray(jobs))
 })

 useEffect(()=>{load().catch((e:any)=>setError(e.message||'Settings could not be loaded.'))},[])
 const patch=(k:string,v:any)=>setS((prev:any)=>({...prev,[k]:v}))
 const menuProductIds=useMemo(()=>new Set(menu.map(x=>Number(x.product_id))),[menu])
 const availableProducts=products.filter(p=>!menuProductIds.has(Number(p.id))||Number(editingMenu?.product_id)===Number(p.id))

 async function save(){
   setSaving(true);setMessage('');setError('')
   try{
     const next=await api('/document-settings',{method:'PUT',body:JSON.stringify({
       name:s.name,address:s.address,phone:s.phone,email:s.email,taxId:s.tax_id,logoUrl:s.logo_url,
       documentFooter:s.document_footer,documentAccent:s.document_accent,documentPaperSize:s.document_paper_size,
       defaultTaxRate:Number(s.default_tax_rate||0),taxInclusive:!!s.tax_inclusive,
       defaultServiceChargeRate:Number(s.default_service_charge_rate||0),
       receiptTitle:s.receipt_title,receiptPaymentOptions:s.receipt_payment_options,
       receiptHeaderNote:s.receipt_header_note,receiptShowLogo:true,receiptShowBusinessName:!!s.receipt_show_business_name,
       themeKey:s.theme_key||'green',themeMode:s.theme_mode||'light',themeBackground:s.theme_background||'clean',themeBackgroundScope:s.theme_background_scope||'operations',themeBackgroundImage:s.theme_background_image||null,themeBackgroundImageFit:s.theme_background_image_fit||'cover'
     })})
     setS(next);applyLocalTheme(next?.theme_key||'green',next?.document_accent||'',next?.theme_background||'clean',next?.theme_background_scope||'operations',next?.theme_background_image||'',next?.theme_background_image_fit||'cover');setMessage('Settings saved successfully.')
   }catch(e:any){setError(e.message||'Settings could not be saved.')}finally{setSaving(false)}
 }

 async function uploadLogo(file?:File){
   if(!file)return
   setMessage('');setError('')
   if(file.size>5*1024*1024){setError('Logo must be 5MB or smaller.');return}
   const fd=new FormData();fd.append('image',file)
   const token=localStorage.getItem('pos_token')
   const r=await fetch('/api/document-settings/logo',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd})
   const b=await r.json().catch(()=>({}))
   if(!r.ok){setError(b.error||'Logo upload failed.');return}
   patch('logo_url',b.logoUrl);setMessage('Logo uploaded.')
 }

 async function uploadBackground(file?:File){
   if(!file)return
   setMessage('');setError('')
   if(file.size>5*1024*1024){setError('Background image must be 5MB or smaller.');return}
   const fd=new FormData();fd.append('image',file)
   const token=localStorage.getItem('pos_token')
   const r=await fetch('/api/document-settings/background',{method:'POST',headers:{Authorization:'Bearer '+token},body:fd})
   const b=await r.json().catch(()=>({}))
   if(!r.ok){setError(b.error||'Background upload failed.');return}
   const next={...s,theme_background:'image',theme_background_image:b.backgroundImage}
   setS(next);applyLocalTheme(next.theme_key||'green',next.document_accent||'',next.theme_background,next.theme_background_scope||'operations',next.theme_background_image||'',next.theme_background_image_fit||'cover')
   setMessage('Background image uploaded.')
 }

 async function addArea(){setError('');try{await api('/restaurant/areas',{method:'POST',body:JSON.stringify(area)});setAreaOpen(false);setArea({branchId:0,name:''});await load()}catch(e:any){setError(e.message)}}
 async function saveTable(){setError('');try{
   if(editingTable)await api('/restaurant/tables/'+editingTable.id,{method:'PUT',body:JSON.stringify({...table,areaId:table.areaId||null,active:true})})
   else await api('/restaurant/tables',{method:'POST',body:JSON.stringify({...table,areaId:table.areaId||null})})
   setTableOpen(false);setEditingTable(null);setTable({branchId:0,areaId:0,name:'',code:'',capacity:2,status:'available',cleanlinessStatus:'clean'});await load()
 }catch(e:any){setError(e.message)}}
 function openTableEdit(t:any){setEditingTable(t);setTable({branchId:Number(t.branch_id),areaId:Number(t.area_id||0),name:t.name||'',code:t.code||'',capacity:Number(t.capacity||2),status:t.status||'available',cleanlinessStatus:t.cleanliness_status||'clean'});setTableOpen(true)}
 async function saveCategory(){setError('');try{await api('/menu/categories',{method:'POST',body:JSON.stringify({name:category.name,defaultStationId:category.defaultStationId||null})});setCategoryOpen(false);setCategory({name:'',defaultStationId:0});await load()}catch(e:any){setError(e.message)}}
 function openNewMenu(){const p=availableProducts[0];setEditingMenu(null);setMenuForm({productId:Number(p?.id||0),categoryId:Number(categories[0]?.id||0),kitchenStationId:0,price:p?.price!=null?String(p.price):'',available:true,soldOut:false});setMenuOpen(true)}
 function openMenuEdit(x:any){setEditingMenu(x);setMenuForm({productId:Number(x.product_id),categoryId:Number(x.category_id||0),kitchenStationId:Number(x.kitchen_station_id||0),price:x.base_price!=null?String(x.base_price):'',available:!!x.available,soldOut:!!x.sold_out});setMenuOpen(true)}
 async function saveMenu(){setError('');try{
   if(editingMenu){
     await api('/menu/items/'+editingMenu.id+'/config',{method:'PUT',body:JSON.stringify({categoryId:menuForm.categoryId||null,kitchenStationId:menuForm.kitchenStationId||null,price:Number(menuForm.price||0),available:menuForm.available,soldOut:menuForm.soldOut})})
   }else{
     await api('/menu/items',{method:'POST',body:JSON.stringify({productId:menuForm.productId,categoryId:menuForm.categoryId||null,kitchenStationId:menuForm.kitchenStationId||null,available:menuForm.available,soldOut:menuForm.soldOut})})
     const fresh=asArray(await api('/menu/items'))
     const created=fresh.find((x:any)=>Number(x.product_id)===Number(menuForm.productId))
     if(created)await api('/menu/items/'+created.id+'/config',{method:'PUT',body:JSON.stringify({categoryId:menuForm.categoryId||null,kitchenStationId:menuForm.kitchenStationId||null,price:Number(menuForm.price||0),available:menuForm.available,soldOut:menuForm.soldOut})})
   }
   setMenuOpen(false);setEditingMenu(null);await load()
 }catch(e:any){setError(e.message)}}

 async function changePassword(){setPasswordMessage('');if(newPassword.length<10){setPasswordMessage('New password must be at least 10 characters.');return}if(newPassword!==confirmPassword){setPasswordMessage('New passwords do not match.');return}setPasswordBusy(true);try{await api('/me/password',{method:'PUT',body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirmPassword('');setPasswordMessage('Password changed successfully.')}catch(e:any){setPasswordMessage(e.message)}finally{setPasswordBusy(false)}}
 async function savePolicies(){
   setPolicyBusy(true);setError('');setMessage('')
   try{
     const p=await api('/restaurant/policies',{method:'PUT',body:JSON.stringify({
       defaultReservationMinutes:Number(policies.default_reservation_minutes||120),
       defaultWaitMinutes:Number(policies.default_wait_minutes||15),
       autoDirtyOnClose:policies.auto_dirty_on_close!==false,
       requireShiftForPayment:policies.require_shift_for_payment!==false,
       allowNegativeStock:!!policies.allow_negative_stock,
       loyaltyPointsPerCurrency:Number(policies.loyalty_points_per_currency||0),
       loyaltyRedeemValue:Number(policies.loyalty_redeem_value||0),
       idleLockMinutes:Number(policies.idle_lock_minutes||5)
     })})
     setPolicies(p);setMessage('Restaurant policies saved.')
   }catch(e:any){setError(e.message)}finally{setPolicyBusy(false)}
 }
 async function revokeDevice(id:number){try{await api('/devices/'+id+'/revoke',{method:'PUT',body:'{}'});setDevices(asArray(await api('/devices')))}catch(e:any){setError(e.message)}}
 async function retryPrint(id:number){try{await api('/print-jobs/'+id+'/retry',{method:'POST',body:'{}'});setPrintJobs(asArray(await api('/print-jobs')))}catch(e:any){setError(e.message)}}

 if(!s)return <Loading/>
 const currency=s.currency||'UGX'
 const current=nav.find(x=>x[0]===section)!

 return <div>
  <PageHeading eyebrow="Management setup" title="Settings" sub="Business configuration"/>

  {(message||error)&&<div className={'mb-4 rounded-lg border px-3 py-2.5 text-[12px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

  <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="h-fit overflow-hidden rounded-xl border border-slate-200 bg-white lg:sticky lg:top-[78px]">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Settings Menu</div>
      </div>
      <nav className="p-2">{nav.map(([id,label,Icon,sub])=><button key={id} onClick={()=>{setSection(id);setMessage('');setError('')}} className={'mb-1 flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition '+(section===id?'bg-[var(--brand-soft)] text-[var(--brand-primary)]':'text-slate-600 hover:bg-slate-50')}>
        <Icon size={16} className="mt-0.5 shrink-0"/>
        <span className="min-w-0"><span className="block text-[12px] font-semibold">{label}</span><span className="mt-0.5 block text-[9.5px] leading-4 text-slate-400">{sub}</span></span>
      </button>)}</nav>
    </aside>

    <main className="min-w-0">
      <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-[15px] font-semibold text-slate-900">{current[1]}</div>
        <div className="mt-0.5 text-[10.5px] text-slate-400">{current[3]}</div>
      </div>

      {section==='business'&&<Panel title="Restaurant identity & branding" sub="Basic identity used across the POS and documents.">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">{s.logo_url?<img src={s.logo_url} className="max-h-full max-w-full object-contain" alt="Business logo"/>:<ImagePlus className="text-slate-300"/>}</div>
          <div className="flex-1"><div className="text-[12px] font-semibold text-slate-700">Restaurant logo</div><div className="mt-1 text-[10.5px] text-slate-400">Used on receipts, bills, invoices and reports.</div><label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>uploadLogo(e.target.files?.[0])}/></label></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Restaurant / business name"><input className="control" value={s.name||''} onChange={e=>patch('name',e.target.value)}/></Field>
          <Field label="Address"><input className="control" value={s.address||''} onChange={e=>patch('address',e.target.value)}/></Field>
          <Field label="Phone"><input className="control" value={s.phone||''} onChange={e=>patch('phone',e.target.value)}/></Field>
          <Field label="Email"><input className="control" value={s.email||''} onChange={e=>patch('email',e.target.value)}/></Field>
          <Field label="TIN / Tax ID"><input className="control" value={s.tax_id||''} onChange={e=>patch('tax_id',e.target.value)}/></Field>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="text-[12px] font-semibold text-slate-700">Interface theme</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {themes.map(t=><button key={t.key} type="button" onClick={()=>{setS((prev:any)=>({...prev,theme_key:t.key,theme_mode:t.key==='dark'?'dark':'light',document_accent:t.primary}));applyLocalTheme(t.key,t.primary,s.theme_background||'clean',s.theme_background_scope||'operations',s.theme_background_image||'',s.theme_background_image_fit||'cover')}} className={'rounded-xl border p-2.5 text-left transition '+((s.theme_key||'green')===t.key?'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/10':'border-slate-200 hover:border-slate-300')}>
              <div className="h-12 rounded-lg border border-black/5" style={{background:t.soft}}><div className="m-2 h-5 w-10 rounded-md" style={{background:t.primary}}/></div>
              <div className="mt-2 text-[11px] font-semibold text-slate-700">{t.name}</div>
            </button>)}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-[11.5px] font-medium text-slate-600">Workspace background</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[['clean','Clean'],['soft','Soft'],['rich','Rich'],['solid','Solid'],['image','Image']].map(([key,label])=><button key={key} type="button" onClick={()=>{const next={...s,theme_background:key};setS(next);applyLocalTheme(next.theme_key||'green',next.document_accent||'',key,next.theme_background_scope||'operations',next.theme_background_image||'',next.theme_background_image_fit||'cover')}} className={'rounded-lg border p-2 text-left '+((s.theme_background||'clean')===key?'border-[var(--brand-primary)]':'border-slate-200')}>
                  <div className="h-8 rounded-md border border-slate-200" style={{background:key==='clean'?'#EEF2F5':key==='solid'?(s.document_accent||themes.find(t=>t.key===(s.theme_key||'green'))?.primary||'#22A53A'):key==='image'&&s.theme_background_image?'url('+s.theme_background_image+') center/cover':key==='rich'?'color-mix(in srgb, '+(s.document_accent||themes.find(t=>t.key===(s.theme_key||'green'))?.primary||'#22A53A')+' 16%, #F5F7F9)':'color-mix(in srgb, '+(s.document_accent||themes.find(t=>t.key===(s.theme_key||'green'))?.primary||'#22A53A')+' 7%, #F5F7F9)'}}/>
                  <div className="mt-1.5 text-[10.5px] font-semibold text-slate-700">{label}</div>
                </button>)}
              </div>
            </div>
            <div>
              <div className="text-[11.5px] font-medium text-slate-600">Background image</div>
              <label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-600">Upload image<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>uploadBackground(e.target.files?.[0])}/></label>
              <div className="mt-1 text-[9.5px] text-slate-400">PNG, JPG or WebP · max 5MB</div>
              {s.theme_background_image&&<div className="mt-2 flex items-center gap-2">
                <div className="h-12 w-20 rounded-md border border-slate-200 bg-cover bg-center" style={{backgroundImage:'url('+s.theme_background_image+')'}}/>
                <select className="control max-w-[130px]" value={s.theme_background_image_fit||'cover'} onChange={e=>{const fit=e.target.value;const next={...s,theme_background:'image',theme_background_image_fit:fit};setS(next);applyLocalTheme(next.theme_key||'green',next.document_accent||'',next.theme_background,next.theme_background_scope||'operations',next.theme_background_image||'',fit)}}>
                  <option value="cover">Cover</option><option value="contain">Contain</option><option value="repeat">Repeat</option>
                </select>
              </div>}
            </div>
            <Field label="Apply background to"><select className="control" value={s.theme_background_scope||'operations'} onChange={e=>{const scope=e.target.value;const next={...s,theme_background_scope:scope};setS(next);applyLocalTheme(next.theme_key||'green',next.document_accent||'',next.theme_background||'clean',scope,next.theme_background_image||'',next.theme_background_image_fit||'cover')}}><option value="operations">Operations only</option><option value="all">Entire system</option></select></Field>
          </div>
          <div className="mt-3 max-w-xs"><Field label="Custom primary colour"><input type="color" className="control h-11 p-1" value={s.document_accent||'#22A53A'} onChange={e=>{const v=e.target.value;setS((prev:any)=>({...prev,document_accent:v}));applyLocalTheme(s.theme_key||'green',v,s.theme_background||'clean',s.theme_background_scope||'operations',s.theme_background_image||'',s.theme_background_image_fit||'cover')}}/></Field></div>
        </div>
        <SaveButton saving={saving} onClick={save}/>
      </Panel>}

      {section==='tables'&&<div className="space-y-4">
        <Panel title="Floors / Restaurant Areas" sub="Create physical service areas." action={<button onClick={()=>{setArea({...area,branchId:Number(branches[0]?.id||0)});setAreaOpen(true)}} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium"><Plus size={13} className="mr-1 inline"/>Add Floor</button>}>
          <DataTable head={['Area / Floor','Branch','Tables']} rows={areas.map(a=>[<b>{a.name}</b>,a.branch_name,a.table_count])}/>
        </Panel>
        <Panel title="Restaurant Tables" sub="Manage table names, seating, occupancy and cleanliness." action={<button onClick={()=>{setEditingTable(null);setTable({branchId:Number(branches[0]?.id||0),areaId:0,name:'',code:'',capacity:2,status:'available',cleanlinessStatus:'clean'});setTableOpen(true)}} className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-medium text-white"><Plus size={13} className="mr-1 inline"/>Add Table</button>}>
          <DataTable head={['Table','Floor','Seats','Occupancy','Cleanliness','']} rows={tables.map(t=>[<b>{t.name}</b>,t.area_name||'Main Floor',t.capacity,<Badge tone={t.status==='occupied'?'red':t.status==='reserved'?'amber':'green'}>{t.status==='available'?'vacant':t.status}</Badge>,<Badge tone={t.cleanliness_status==='dirty'?'red':'green'}>{t.cleanliness_status||'clean'}</Badge>,<button onClick={()=>openTableEdit(t)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600"><Pencil size={12}/>Edit</button>])}/>
        </Panel>
      </div>}

      {section==='menu'&&<div className="space-y-4">
        <Panel title="Menu Categories" sub="Breakfast, meals, drinks, desserts, bar and other groups." action={<button onClick={()=>setCategoryOpen(true)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium"><Plus size={13} className="mr-1 inline"/>Add Category</button>}>
          <DataTable head={['Category','Kitchen station']} rows={categories.map(c=>[<b>{c.name}</b>,c.station_name||'-'])}/>
        </Panel>
        <Panel title="Menu & Pricing" sub="Control menu visibility, selling price and kitchen routing." action={<button onClick={openNewMenu} disabled={!availableProducts.length} className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-medium text-white disabled:opacity-40"><Plus size={13} className="mr-1 inline"/>Add Menu Item</button>}>
          <DataTable head={['Menu item','Category','Station','Price','Availability','']} rows={menu.map(x=>[<b>{x.product_name}</b>,x.category_name||'Other',x.station_name||'-',money(x.base_price,currency),x.sold_out?<Badge tone="red">Sold out</Badge>:x.available?<Badge tone="green">Available</Badge>:<Badge>Hidden</Badge>,<button onClick={()=>openMenuEdit(x)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600"><Pencil size={12}/>Edit</button>])}/>
        </Panel>
      </div>}

      {section==='operations'&&<Panel title="Restaurant Policies" sub="Default operating rules for service, stock, loyalty and shared terminals.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default reservation duration (minutes)"><input className="control" type="number" min="15" value={Number(policies?.default_reservation_minutes||120)} onChange={e=>setPolicies({...policies,default_reservation_minutes:Number(e.target.value)})}/></Field>
          <Field label="Default wait quote (minutes)"><input className="control" type="number" min="0" value={Number(policies?.default_wait_minutes||15)} onChange={e=>setPolicies({...policies,default_wait_minutes:Number(e.target.value)})}/></Field>
          <Field label="Idle auto-lock (minutes)"><input className="control" type="number" min="1" value={Number(policies?.idle_lock_minutes||5)} onChange={e=>setPolicies({...policies,idle_lock_minutes:Number(e.target.value)})}/></Field>
          <Field label="Loyalty points per currency unit"><input className="control" type="number" min="0" step="0.000001" value={Number(policies?.loyalty_points_per_currency||0)} onChange={e=>setPolicies({...policies,loyalty_points_per_currency:Number(e.target.value)})}/></Field>
          <Field label="Value per redeemed point"><input className="control" type="number" min="0" step="0.01" value={Number(policies?.loyalty_redeem_value||0)} onChange={e=>setPolicies({...policies,loyalty_redeem_value:Number(e.target.value)})}/></Field>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Toggle label="Mark table dirty after close" checked={policies?.auto_dirty_on_close!==false} onChange={v=>setPolicies({...policies,auto_dirty_on_close:v})}/>
          <Toggle label="Require open shift for payment" checked={policies?.require_shift_for_payment!==false} onChange={v=>setPolicies({...policies,require_shift_for_payment:v})}/>
          <Toggle label="Allow negative stock" checked={!!policies?.allow_negative_stock} onChange={v=>setPolicies({...policies,allow_negative_stock:v})}/>
        </div>
        <div className="mt-5 flex justify-end"><button onClick={savePolicies} disabled={policyBusy} className="rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40">{policyBusy?'Saving…':'Save Policies'}</button></div>
      </Panel>}

      {section==='documents'&&<div className="space-y-4">
        <Panel title="Receipt & Bill Template" sub="Running bills and final receipts.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Receipt / bill title"><input className="control" value={s.receipt_title||''} onChange={e=>patch('receipt_title',e.target.value)}/></Field>
            <Field label="Default paper"><select className="control" value={s.document_paper_size||'80mm'} onChange={e=>patch('document_paper_size',e.target.value)}><option>58mm</option><option>80mm</option><option>A5</option><option>A4</option></select></Field>
            <div className="md:col-span-2"><Field label="Header note"><input className="control" value={s.receipt_header_note||''} onChange={e=>patch('receipt_header_note',e.target.value)}/></Field></div>
            <div className="md:col-span-2"><Field label="Payment options shown"><input className="control" value={s.receipt_payment_options||''} onChange={e=>patch('receipt_payment_options',e.target.value)}/></Field></div>
            <div className="md:col-span-2"><Field label="Footer / message"><textarea className="control min-h-24" value={s.document_footer||''} onChange={e=>patch('document_footer',e.target.value)}/></Field></div>
          </div>
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-3">
            <div className="text-[10.5px] text-slate-500">The uploaded logo is used automatically on printed documents.</div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600"><input type="checkbox" checked={!!s.receipt_show_business_name} onChange={e=>patch('receipt_show_business_name',e.target.checked)} className="accent-[var(--brand-primary)]"/>Also show business name with the logo</label>
          </div>
          <SaveButton saving={saving} onClick={save}/>
        </Panel>
        <Panel title="Printer Profiles" sub="Receipt, KOT and report printer mapping.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Profile name"><input className="control" value={profileName} onChange={e=>setProfileName(e.target.value)}/></Field>
            <Field label="Document"><select className="control" value={profileType} onChange={e=>setProfileType(e.target.value)}><option value="receipt">Receipt</option><option value="kot">Kitchen Ticket</option><option value="invoice">Invoice</option><option value="z_report">Shift Report</option></select></Field>
            <Field label="Paper"><select className="control" value={paperSize} onChange={e=>setPaperSize(e.target.value)}><option>58mm</option><option>80mm</option><option>A5</option><option>A4</option></select></Field>
            <Field label="Kitchen station"><select className="control" value={stationId} onChange={e=>setStationId(Number(e.target.value)||'')}><option value="">Any / none</option>{stations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="Printer name"><input className="control" value={printerName} onChange={e=>setPrinterName(e.target.value)} placeholder="Optional"/></Field>
          </div>
          <button onClick={async()=>{try{if(!profileName.trim())return;await api('/print/profiles',{method:'POST',body:JSON.stringify({name:profileName,documentType:profileType,paperSize,printerName:printerName||null,stationId:stationId||null})});setProfiles(asArray(await api('/print/profiles')));setMessage('Printer profile added.')}catch(e:any){setError(e.message)}}} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white"><Printer size={13} className="mr-1 inline"/>Add Printer Profile</button>
          <div className="mt-4"><DataTable head={['Profile','Document','Paper','Printer','Station','Status']} rows={profiles.map(p=>[p.name,p.document_type,p.paper_size,p.printer_name||'Browser / PDF',p.station_name||'-',<Badge tone={p.active?'green':'red'}>{p.active?'Active':'Inactive'}</Badge>])}/></div>
        </Panel>
        <Panel title="Print / Reprint Audit" sub="Recent receipts, KOTs and reports generated from the system.">
          <DataTable head={['When','Document','Reference','Paper','By','Type']} rows={printLogs.slice(0,50).map(x=>[new Date(x.created_at).toLocaleString(),x.document_type,x.document_no||x.entity_type+' #'+x.entity_id,x.paper_size||'-',x.printed_by||'-',<Badge tone={x.reprint?'amber':'green'}>{x.reprint?'Reprint':'First print'}</Badge>])}/>
        </Panel>
        <Panel title="Direct Print Queue" sub="Jobs for configured local/direct printer bridges.">
          {printJobs.length?<DataTable head={['When','Document','Entity','Printer','Status','']} rows={printJobs.slice(0,50).map(x=>[new Date(x.created_at).toLocaleString(),x.document_type,x.entity_type+' #'+x.entity_id,x.printer_profile||'Default',<Badge tone={x.status==='printed'?'green':x.status==='failed'?'red':'amber'}>{x.status}</Badge>,x.status==='failed'?<button onClick={()=>retryPrint(Number(x.id))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px]"><RefreshCw size={11}/>Retry</button>:''])}/>:<div className="py-8 text-center text-[10.5px] text-slate-400">No direct print jobs queued.</div>}
        </Panel>
      </div>}

      {section==='devices'&&<div className="space-y-4">
        <Panel title="Registered Devices" sub="Browsers and terminals that have connected to this business.">
          {devices.length?<DataTable head={['Device','Branch','Terminal','Last Seen','Status','']} rows={devices.map(d=>[<b>{d.name}</b>,d.branch_name||'-',d.terminal_name||'-',d.last_seen_at?new Date(d.last_seen_at).toLocaleString():'-',<Badge tone={d.active?'green':'red'}>{d.active?'Active':'Revoked'}</Badge>,d.active?<button onClick={()=>revokeDevice(Number(d.id))} className="rounded-lg border border-red-100 px-2.5 py-1.5 text-[9.5px] text-red-600">Revoke</button>:''])}/>:<div className="py-8 text-center text-[10.5px] text-slate-400">This browser registers automatically after sign-in.</div>}
        </Panel>
        <Panel title="Terminal Safety" sub="Revoked devices must sign in again and can be reassigned to branch/terminal from the device registry.">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-[10.5px] leading-5 text-slate-500">For shared restaurant terminals, configure staff Quick PINs under Staff. Use a separate registered device for each physical counter or service terminal.</div>
        </Panel>
      </div>}

      {section==='tax'&&<Panel title="Tax & Service Charge" sub="Defaults used on new orders and sales.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default tax rate (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_tax_rate||0)} onChange={e=>patch('default_tax_rate',Number(e.target.value))}/></Field>
          <Field label="Tax mode"><select className="control" value={s.tax_inclusive?'inclusive':'exclusive'} onChange={e=>patch('tax_inclusive',e.target.value==='inclusive')}><option value="exclusive">Tax exclusive</option><option value="inclusive">Tax inclusive</option></select></Field>
          <Field label="Default service charge (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_service_charge_rate||0)} onChange={e=>patch('default_service_charge_rate',Number(e.target.value))}/></Field>
        </div>
        <SaveButton saving={saving} onClick={save}/>
      </Panel>}

      {section==='security'&&<Panel title="Account Security" sub="Change the password for the current account.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Current password"><input className="control" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></Field>
          <Field label="New password"><input className="control" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Field>
          <Field label="Confirm new password"><input className="control" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></Field>
        </div>
        {passwordMessage&&<div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">{passwordMessage}</div>}
        <button onClick={changePassword} disabled={passwordBusy||!currentPassword||!newPassword||!confirmPassword} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-40">{passwordBusy?'Changing…':'Change Password'}</button>
      </Panel>}
    </main>
  </div>

  {areaOpen&&<Modal title="Add Floor / Area" onClose={()=>setAreaOpen(false)}><div className="grid gap-3"><Field label="Branch"><select className="control" value={area.branchId} onChange={e=>setArea({...area,branchId:Number(e.target.value)})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Floor / area name"><input className="control" value={area.name} onChange={e=>setArea({...area,name:e.target.value})}/></Field><button onClick={addArea} disabled={!area.branchId||!area.name.trim()} className="rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Floor / Area</button></div></Modal>}

  {tableOpen&&<Modal title={editingTable?'Edit Table':'Add Table'} onClose={()=>setTableOpen(false)} size="lg"><div className="grid gap-4 md:grid-cols-2">
    <Field label="Branch"><select className="control" value={table.branchId} onChange={e=>setTable({...table,branchId:Number(e.target.value),areaId:0})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
    <Field label="Floor / area"><select className="control" value={table.areaId} onChange={e=>setTable({...table,areaId:Number(e.target.value)})}><option value="0">Main Floor / none</option>{areas.filter(a=>Number(a.branch_id)===Number(table.branchId)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
    <Field label="Table name"><input className="control" value={table.name} onChange={e=>setTable({...table,name:e.target.value})}/></Field>
    <Field label="Code"><input className="control" value={table.code} onChange={e=>setTable({...table,code:e.target.value})}/></Field>
    <Field label="Seats"><input className="control" type="number" min="1" value={table.capacity} onChange={e=>setTable({...table,capacity:Math.max(1,Number(e.target.value))})}/></Field>
    <Field label="Occupancy"><select className="control" value={table.status} onChange={e=>setTable({...table,status:e.target.value})}><option value="available">Vacant</option><option value="reserved">Reserved</option><option value="occupied">Occupied</option></select></Field>
    <Field label="Cleanliness"><select className="control" value={table.cleanlinessStatus} onChange={e=>setTable({...table,cleanlinessStatus:e.target.value})}><option value="clean">Clean</option><option value="dirty">Dirty</option></select></Field>
  </div><button onClick={saveTable} disabled={!table.branchId||!table.name.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Table</button></Modal>}

  {categoryOpen&&<Modal title="Add Menu Category" onClose={()=>setCategoryOpen(false)}><div className="grid gap-3"><Field label="Category name"><input className="control" value={category.name} onChange={e=>setCategory({...category,name:e.target.value})}/></Field><Field label="Default kitchen station"><select className="control" value={category.defaultStationId} onChange={e=>setCategory({...category,defaultStationId:Number(e.target.value)})}><option value="0">None</option>{stations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><button onClick={saveCategory} disabled={!category.name.trim()} className="rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Category</button></div></Modal>}

  {menuOpen&&<Modal title={editingMenu?'Edit Menu Item':'Add Menu Item'} onClose={()=>setMenuOpen(false)} size="lg"><div className="grid gap-4 md:grid-cols-2">
    <Field label="Product / item"><select className="control" value={menuForm.productId} disabled={!!editingMenu} onChange={e=>{const id=Number(e.target.value),p=products.find(x=>Number(x.id)===id);setMenuForm({...menuForm,productId:id,price:p?.price!=null?String(p.price):''})}}><option value="0">Choose product</option>{availableProducts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Menu category"><select className="control" value={menuForm.categoryId} onChange={e=>setMenuForm({...menuForm,categoryId:Number(e.target.value)})}><option value="0">Other / uncategorised</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    <Field label="Selling price"><input className="control" inputMode="decimal" value={menuForm.price} onChange={e=>setMenuForm({...menuForm,price:e.target.value.replace(/[^0-9.]/g,'')})} placeholder="Enter price"/></Field>
    <Field label="Kitchen station"><select className="control" value={menuForm.kitchenStationId} onChange={e=>setMenuForm({...menuForm,kitchenStationId:Number(e.target.value)})}><option value="0">Use category/default</option>{stations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
  </div><div className="mt-3 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-[12px] text-slate-600"><input type="checkbox" checked={menuForm.available} onChange={e=>setMenuForm({...menuForm,available:e.target.checked})}/>Available</label><label className="flex items-center gap-2 text-[12px] text-slate-600"><input type="checkbox" checked={menuForm.soldOut} onChange={e=>setMenuForm({...menuForm,soldOut:e.target.checked})}/>Sold out</label></div><button onClick={saveMenu} disabled={!menuForm.productId} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Menu Item</button></Modal>}
 </div>
}

function applyLocalTheme(key:string,primary:string,background='clean',scope='operations',backgroundImage='',backgroundFit='cover'){
 const map:any={
  green:{soft:'#ECF8EF',border:'#BDE7C5',bg:'#F7F9F7',surface:'#FFFFFF',text:'#172033',muted:'#64748B',sidebar:'#FBFCFB'},
  blue:{soft:'#EFF6FF',border:'#BFDBFE',bg:'#F6F8FC',surface:'#FFFFFF',text:'#172033',muted:'#64748B',sidebar:'#FAFBFD'},
  maroon:{soft:'#FBEFF3',border:'#E9BAC8',bg:'#FAF7F8',surface:'#FFFFFF',text:'#23171B',muted:'#74636A',sidebar:'#FDFBFC'},
  gold:{soft:'#FFF8E7',border:'#EED7A2',bg:'#FAF9F5',surface:'#FFFFFF',text:'#211D15',muted:'#716856',sidebar:'#FEFDF9'},
  dark:{soft:'#263119',border:'#3F4B2C',bg:'#0F1419',surface:'#171D23',text:'#F8FAFC',muted:'#94A3B8',sidebar:'#11171C'}
 }[key]||{}
 const r=document.documentElement
 const p=primary||'#22A53A'
 r.style.setProperty('--brand-primary',p)
 r.style.setProperty('--brand-soft',key==='dark'?(map.soft||'#263119'):'color-mix(in srgb, '+p+' 9%, white)')
 r.style.setProperty('--brand-border',key==='dark'?(map.border||'#3F4B2C'):'color-mix(in srgb, '+p+' 28%, white)')
 r.style.setProperty('--app-surface',map.surface||'#fff')
 r.style.setProperty('--app-text',map.text||'#172033')
 r.style.setProperty('--app-muted',map.muted||'#64748B')
 r.style.setProperty('--app-sidebar',map.sidebar||'#FBFCFB')
 const cleanBg=key==='dark'?(map.bg||'#0F1419'):'#EEF2F5'
 const tinted=key==='dark'?(background==='solid'?'#202B1B':background==='rich'?'#182018':background==='soft'?'#131A15':cleanBg):(background==='solid'?p:background==='rich'?'color-mix(in srgb, '+p+' 16%, #F5F7F9)':background==='soft'?'color-mix(in srgb, '+p+' 7%, #F5F7F9)':cleanBg)
 r.style.setProperty('--theme-workspace-bg',tinted)
 r.style.setProperty('--theme-workspace-image',background==='image'&&backgroundImage?'url("'+backgroundImage+'")':'none')
 r.style.setProperty('--theme-workspace-image-size',backgroundFit==='contain'?'contain':backgroundFit==='repeat'?'auto':'cover')
 r.style.setProperty('--theme-workspace-image-repeat',backgroundFit==='repeat'?'repeat':'no-repeat')
 r.style.setProperty('--app-bg',scope==='all'&&background!=='image'?tinted:cleanBg)
 r.dataset.theme=key
 r.dataset.background=background
 r.dataset.backgroundScope=scope
}

function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className={'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 text-[11px] font-medium '+(checked?'border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]':'border-slate-200 text-slate-600')}><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="accent-[var(--brand-primary)]"/></label>}
function SaveButton({saving,onClick}:{saving:boolean;onClick:()=>void}){return <div className="mt-5 flex justify-end"><button onClick={onClick} disabled={saving} className="rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40">{saving?'Saving…':'Save Changes'}</button></div>}
function Field({label,children}:{label:string;children:any}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{children}</label>}
