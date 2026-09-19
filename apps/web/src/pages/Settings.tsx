import { useEffect, useState } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
import { api } from '../api'
import { PageHeading, Panel, Loading, DataTable, Badge, Modal } from '../components'

export default function Settings(){
 const [s,setS]=useState<any>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 const [profiles,setProfiles]=useState<any[]>([]),[profileName,setProfileName]=useState('Customer Receipt'),[profileType,setProfileType]=useState('receipt'),[paperSize,setPaperSize]=useState('80mm'),[printerName,setPrinterName]=useState(''),[stationId,setStationId]=useState<number|''>(''),[stations,setStations]=useState<any[]>([]),[printLogs,setPrintLogs]=useState<any[]>([])
 const [branches,setBranches]=useState<any[]>([]),[areas,setAreas]=useState<any[]>([]),[tables,setTables]=useState<any[]>([])
 const [tableOpen,setTableOpen]=useState(false),[areaOpen,setAreaOpen]=useState(false),[area,setArea]=useState({branchId:0,name:''}),[table,setTable]=useState({branchId:0,areaId:0,name:'',code:'',capacity:2})
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[passwordMessage,setPasswordMessage]=useState(''),[passwordBusy,setPasswordBusy]=useState(false)

 const load=()=>Promise.all([
   api('/document-settings'),
   api('/print/profiles').catch(()=>[]),
   api('/kitchen/stations').catch(()=>[]),
   api('/print/logs').catch(()=>[]),
   api('/branches').catch(()=>[]),
   api('/restaurant/areas').catch(()=>[]),
   api('/restaurant/tables').catch(()=>[])
 ]).then(([x,p,ks,logs,b,a,t])=>{setS(x);setProfiles(p);setStations(ks);setPrintLogs(logs);setBranches(b);setAreas(a);setTables(t)})

 useEffect(()=>{load().catch((e:any)=>setError(e.message||'Settings could not be loaded.'))},[])
 const patch=(k:string,v:any)=>setS({...s,[k]:v})

 async function save(){
   setSaving(true);setMessage('');setError('')
   try{
     const next=await api('/document-settings',{method:'PUT',body:JSON.stringify({
       address:s.address,phone:s.phone,email:s.email,taxId:s.tax_id,logoUrl:s.logo_url,
       documentFooter:s.document_footer,documentAccent:s.document_accent,documentPaperSize:s.document_paper_size,
       defaultTaxRate:Number(s.default_tax_rate||0),taxInclusive:!!s.tax_inclusive,
       defaultServiceChargeRate:Number(s.default_service_charge_rate||0),
       receiptTitle:s.receipt_title,receiptPaymentOptions:s.receipt_payment_options,
       receiptHeaderNote:s.receipt_header_note,receiptShowLogo:s.receipt_show_logo!==false
     })})
     setS(next);setMessage('Settings saved successfully.')
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
   patch('logo_url',b.logoUrl);setMessage('Logo uploaded. Save settings to keep the rest of your branding changes.')
 }

 async function addArea(){setError('');try{await api('/restaurant/areas',{method:'POST',body:JSON.stringify(area)});setAreaOpen(false);setArea({branchId:0,name:''});await load()}catch(e:any){setError(e.message)}}
 async function addTable(){setError('');try{await api('/restaurant/tables',{method:'POST',body:JSON.stringify({...table,areaId:table.areaId||null})});setTableOpen(false);setTable({branchId:0,areaId:0,name:'',code:'',capacity:2});await load()}catch(e:any){setError(e.message)}}

 async function changePassword(){setPasswordMessage('');if(newPassword.length<10){setPasswordMessage('New password must be at least 10 characters.');return}if(newPassword!==confirmPassword){setPasswordMessage('New passwords do not match.');return}setPasswordBusy(true);try{await api('/me/password',{method:'PUT',body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirmPassword('');setPasswordMessage('Password changed successfully.')}catch(e:any){setPasswordMessage(e.message)}finally{setPasswordBusy(false)}}

 if(!s)return <Loading/>

 return <div>
  <PageHeading eyebrow="Organisation" title="Settings" sub="Control business branding, receipt design, tables, printers, tax rules and account security."/>

  {(message||error)&&<div className={'mb-4 rounded-lg border px-3 py-2.5 text-[12px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

  <div className="grid gap-4 xl:grid-cols-2">
   <Panel title="Business identity & branding" sub="Used on receipts, bills, invoices and reports.">
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
        {s.logo_url?<img src={s.logo_url} className="max-h-full max-w-full object-contain" alt="Business logo"/>:<ImagePlus className="text-slate-300"/>}
      </div>
      <div className="flex-1"><div className="text-[12px] font-semibold text-slate-700">Business logo</div><div className="mt-1 text-[10.5px] leading-4 text-slate-400">PNG, JPG or WebP. This is used on printable documents where space allows.</div><label className="mt-2 inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>uploadLogo(e.target.files?.[0])}/></label></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Organisation"><input className="control" value={s.name||''} disabled/></Field>
      <Field label="Address"><input className="control" value={s.address||''} onChange={e=>patch('address',e.target.value)}/></Field>
      <Field label="Phone"><input className="control" value={s.phone||''} onChange={e=>patch('phone',e.target.value)}/></Field>
      <Field label="Email"><input className="control" value={s.email||''} onChange={e=>patch('email',e.target.value)}/></Field>
      <Field label="TIN / Tax ID"><input className="control" value={s.tax_id||''} onChange={e=>patch('tax_id',e.target.value)}/></Field>
      <Field label="Accent colour"><input type="color" className="control h-11 p-1" value={s.document_accent||'#22A53A'} onChange={e=>patch('document_accent',e.target.value)}/></Field>
    </div>
   </Panel>

   <Panel title="Receipt & bill template" sub="Thermal receipts can follow your own wording, payment methods and footer.">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Receipt / bill title"><input className="control" value={s.receipt_title||'ORDER BILL'} onChange={e=>patch('receipt_title',e.target.value)}/></Field>
      <Field label="Default document paper"><select className="control" value={s.document_paper_size||'80mm'} onChange={e=>patch('document_paper_size',e.target.value)}><option>58mm</option><option>80mm</option><option>A5</option><option>A4</option></select></Field>
      <div className="sm:col-span-2"><Field label="Header note"><input className="control" value={s.receipt_header_note||''} onChange={e=>patch('receipt_header_note',e.target.value)} placeholder="MAIN BRANCH - RESTAURANT"/></Field></div>
      <div className="sm:col-span-2"><Field label="Payment options shown"><input className="control" value={s.receipt_payment_options||''} onChange={e=>patch('receipt_payment_options',e.target.value)} placeholder="CASH | MTN MOMO | AIRTEL MONEY | CARD"/></Field></div>
      <div className="sm:col-span-2"><Field label="Footer / message"><textarea className="control min-h-20" value={s.document_footer||''} onChange={e=>patch('document_footer',e.target.value)} placeholder="Thank you for your business."/></Field></div>
    </div>
    <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-600"><input type="checkbox" checked={s.receipt_show_logo!==false} onChange={e=>patch('receipt_show_logo',e.target.checked)} className="accent-[#22A53A]"/>Show logo on printable documents</label>
   </Panel>
  </div>

  <div className="mt-4 grid gap-4 xl:grid-cols-2">
   <Panel title="Restaurant tables" sub="Set up floors/areas and tables used by dine-in orders." action={<div className="flex gap-2"><button onClick={()=>{setArea({...area,branchId:Number(branches[0]?.id||0)});setAreaOpen(true)}} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium"><Plus size={13} className="mr-1 inline"/>Area</button><button onClick={()=>{setTable({...table,branchId:Number(branches[0]?.id||0)});setTableOpen(true)}} className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-medium text-white"><Plus size={13} className="mr-1 inline"/>Table</button></div>}>
     <DataTable head={['Table','Area','Branch','Seats','Status']} rows={tables.map(t=>[<b>{t.name}</b>,t.area_name||'Main Floor',t.branch_name,t.capacity,<Badge tone={t.status==='occupied'?'red':t.status==='reserved'?'amber':'green'}>{t.status}</Badge>])}/>
   </Panel>

   <Panel title="Tax & service charge" sub="Defaults for new sales and restaurant orders.">
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Default tax rate (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_tax_rate||0)} onChange={e=>patch('default_tax_rate',Number(e.target.value))}/></Field>
      <Field label="Tax mode"><select className="control" value={s.tax_inclusive?'inclusive':'exclusive'} onChange={e=>patch('tax_inclusive',e.target.value==='inclusive')}><option value="exclusive">Tax exclusive</option><option value="inclusive">Tax inclusive</option></select></Field>
      <Field label="Default service charge (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_service_charge_rate||0)} onChange={e=>patch('default_service_charge_rate',Number(e.target.value))}/></Field>
    </div>
   </Panel>
  </div>

  <div className="mt-4"><Panel title="Printing" sub="Receipt, kitchen ticket, invoice and shift-report printer profiles.">
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
    <Field label="Profile name"><input className="control" value={profileName} onChange={e=>setProfileName(e.target.value)}/></Field>
    <Field label="Document"><select className="control" value={profileType} onChange={e=>setProfileType(e.target.value)}><option value="receipt">Receipt</option><option value="kot">Kitchen Ticket</option><option value="invoice">Invoice</option><option value="z_report">Shift Report</option></select></Field>
    <Field label="Paper"><select className="control" value={paperSize} onChange={e=>setPaperSize(e.target.value)}><option>58mm</option><option>80mm</option><option>A5</option><option>A4</option></select></Field>
    <Field label="Printer name"><input className="control" value={printerName} onChange={e=>setPrinterName(e.target.value)} placeholder="Optional"/></Field>
    <Field label="Kitchen station"><select className="control" value={stationId} onChange={e=>setStationId(Number(e.target.value)||'')}><option value="">Any / none</option>{stations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <button onClick={async()=>{try{if(!profileName.trim())return;await api('/print/profiles',{method:'POST',body:JSON.stringify({name:profileName,documentType:profileType,paperSize,printerName:printerName||null,stationId:stationId||null})});setProfiles(await api('/print/profiles'));setMessage('Printer profile added.')}catch(e:any){setError(e.message)}}} className="mt-6 rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white">Add Profile</button>
   </div>
   <div className="mt-4"><DataTable head={['Profile','Document','Paper','Printer','Station','Status']} rows={profiles.map(p=>[p.name,p.document_type,p.paper_size,p.printer_name||'Browser / PDF',p.station_name||'-',<Badge tone={p.active?'green':'red'}>{p.active?'Active':'Inactive'}</Badge>])}/></div>
  </Panel></div>

  <div className="mt-4"><Panel title="Print / reprint audit" sub="Every generated receipt, KOT and shift report is recorded."><DataTable head={['When','Document','Reference','Paper','By','Type']} rows={printLogs.slice(0,80).map(x=>[new Date(x.created_at).toLocaleString(),x.document_type,x.document_no||x.entity_type+' #'+x.entity_id,x.paper_size||'-',x.printed_by||'-',<Badge tone={x.reprint?'amber':'green'}>{x.reprint?'Reprint':'First print'}</Badge>])}/></Panel></div>

  <div className="mt-4"><Panel title="Account security">
   <div className="grid gap-3 sm:grid-cols-3"><Field label="Current password"><input className="control" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></Field><Field label="New password"><input className="control" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Field><Field label="Confirm new password"><input className="control" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></Field></div>
   {passwordMessage&&<div className="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">{passwordMessage}</div>}
   <button onClick={changePassword} disabled={passwordBusy||!currentPassword||!newPassword||!confirmPassword} className="mt-3 rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-40">{passwordBusy?'Changing…':'Change Password'}</button>
  </Panel></div>

  <div className="sticky bottom-3 z-20 mt-4 flex justify-end"><button onClick={save} disabled={saving} className="rounded-lg bg-[#22A53A] px-6 py-3 text-[13px] font-semibold text-white shadow-lg disabled:opacity-40">{saving?'Saving settings…':'Save All Settings'}</button></div>

  {areaOpen&&<Modal title="Add Area / Floor" onClose={()=>setAreaOpen(false)}><div className="grid gap-3"><Field label="Branch"><select className="control" value={area.branchId} onChange={e=>setArea({...area,branchId:Number(e.target.value)})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Area / floor name"><input className="control" value={area.name} onChange={e=>setArea({...area,name:e.target.value})}/></Field><button onClick={addArea} disabled={!area.branchId||!area.name.trim()} className="rounded-lg bg-[#22A53A] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Area</button></div></Modal>}
  {tableOpen&&<Modal title="Add Table" onClose={()=>setTableOpen(false)}><div className="grid gap-3 sm:grid-cols-2"><Field label="Branch"><select className="control" value={table.branchId} onChange={e=>setTable({...table,branchId:Number(e.target.value),areaId:0})}><option value="0">Choose branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Area"><select className="control" value={table.areaId} onChange={e=>setTable({...table,areaId:Number(e.target.value)})}><option value="0">Main Floor / none</option>{areas.filter(a=>Number(a.branch_id)===Number(table.branchId)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="Table name"><input className="control" value={table.name} onChange={e=>setTable({...table,name:e.target.value})}/></Field><Field label="Code"><input className="control" value={table.code} onChange={e=>setTable({...table,code:e.target.value})}/></Field><Field label="Seats"><input className="control" type="number" min="1" value={table.capacity} onChange={e=>setTable({...table,capacity:Math.max(1,Number(e.target.value))})}/></Field></div><button onClick={addTable} disabled={!table.branchId||!table.name.trim()} className="mt-4 w-full rounded-lg bg-[#22A53A] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Table</button></Modal>}
 </div>
}

function Field({label,children}:{label:string;children:any}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{children}</label>}
