import { useEffect, useState } from 'react'
import { api } from '../api'
import { PageHeading, Panel, Loading } from '../components'

export default function Settings(){
 const [s,setS]=useState<any>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[profiles,setProfiles]=useState<any[]>([]),[profileName,setProfileName]=useState('Customer Receipt'),[profileType,setProfileType]=useState('receipt'),[paperSize,setPaperSize]=useState('80mm')
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[passwordMessage,setPasswordMessage]=useState(''),[passwordBusy,setPasswordBusy]=useState(false)
 useEffect(()=>{Promise.all([api('/document-settings'),api('/print/profiles')]).then(([x,p])=>{setS(x);setProfiles(p)})},[])
 async function save(){
   setSaving(true);setSaved(false)
   try{
     const next=await api('/document-settings',{method:'PUT',body:JSON.stringify({
       address:s.address,phone:s.phone,email:s.email,taxId:s.tax_id,logoUrl:s.logo_url,
       documentFooter:s.document_footer,documentAccent:s.document_accent,documentPaperSize:s.document_paper_size,
       defaultTaxRate:Number(s.default_tax_rate||0),taxInclusive:!!s.tax_inclusive,
       defaultServiceChargeRate:Number(s.default_service_charge_rate||0)
     })})
     setS(next);setSaved(true)
   }finally{setSaving(false)}
 }
 async function changePassword(){setPasswordMessage('');if(newPassword.length<10){setPasswordMessage('New password must be at least 10 characters.');return}if(newPassword!==confirmPassword){setPasswordMessage('New passwords do not match.');return}setPasswordBusy(true);try{await api('/me/password',{method:'PUT',body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirmPassword('');setPasswordMessage('Password changed successfully.')}catch(e:any){setPasswordMessage(e.message)}finally{setPasswordBusy(false)}}
 if(!s)return <Loading/>
 const patch=(k:string,v:any)=>setS({...s,[k]:v})
 return <div>
   <PageHeading eyebrow="Organisation" title="Settings" sub="Organisation identity, document design and default transaction charging policy."/>
   <div className="grid xl:grid-cols-2 gap-4">
     <Panel title="Organisation & Documents">
       <div className="grid sm:grid-cols-2 gap-4">
         <Field label="Organisation"><input className="control" value={s.name||''} disabled/></Field>
         <Field label="Address"><input className="control" value={s.address||''} onChange={e=>patch('address',e.target.value)}/></Field>
         <Field label="Phone"><input className="control" value={s.phone||''} onChange={e=>patch('phone',e.target.value)}/></Field>
         <Field label="Email"><input className="control" value={s.email||''} onChange={e=>patch('email',e.target.value)}/></Field>
         <Field label="TIN / Tax ID"><input className="control" value={s.tax_id||''} onChange={e=>patch('tax_id',e.target.value)}/></Field>
         <Field label="Logo URL"><input className="control" value={s.logo_url||''} onChange={e=>patch('logo_url',e.target.value)}/></Field>
         <Field label="Accent colour"><input type="color" className="control h-12" value={s.document_accent||'#101828'} onChange={e=>patch('document_accent',e.target.value)}/></Field>
         <Field label="Default paper"><select className="control" value={s.document_paper_size||'A4'} onChange={e=>patch('document_paper_size',e.target.value)}><option>A4</option><option>A5</option></select></Field>
       </div>
       <label className="mt-4 block text-sm font-semibold text-slate-700">Footer / terms<textarea className="control min-h-28" value={s.document_footer||''} onChange={e=>patch('document_footer',e.target.value)}/></label>
     </Panel>

     <Panel title="Tax & Service Charge" sub="Used as defaults for new POS sales and restaurant orders. Cashiers can see the values; discounts/FOC still require approval.">
       <div className="grid sm:grid-cols-2 gap-4">
         <Field label="Default tax rate (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_tax_rate||0)} onChange={e=>patch('default_tax_rate',Number(e.target.value))}/></Field>
         <Field label="Tax mode"><select className="control" value={s.tax_inclusive?'inclusive':'exclusive'} onChange={e=>patch('tax_inclusive',e.target.value==='inclusive')}><option value="exclusive">Tax exclusive (added)</option><option value="inclusive">Tax inclusive (already in price)</option></select></Field>
         <Field label="Default service charge (%)"><input className="control" type="number" min="0" step="0.01" value={Number(s.default_service_charge_rate||0)} onChange={e=>patch('default_service_charge_rate',Number(e.target.value))}/></Field>
       </div>
       <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
         MauzoPOS recalculates percentage tax and service charge after an approved discount so totals remain mathematically consistent.
       </div>
     </Panel>
   </div>

   <Panel title="Printing" sub="Receipt, kitchen and document printer profiles.">
     <div className="grid gap-3 sm:grid-cols-4"><Field label="Profile name"><input className="control" value={profileName} onChange={e=>setProfileName(e.target.value)}/></Field><Field label="Document"><select className="control" value={profileType} onChange={e=>setProfileType(e.target.value)}><option value="receipt">Receipt</option><option value="kot">Kitchen Ticket</option><option value="invoice">Invoice</option><option value="z_report">Z Report</option></select></Field><Field label="Paper"><select className="control" value={paperSize} onChange={e=>setPaperSize(e.target.value)}><option>58mm</option><option>80mm</option><option>A5</option><option>A4</option></select></Field><button onClick={async()=>{if(!profileName.trim())return;await api('/print/profiles',{method:'POST',body:JSON.stringify({name:profileName,documentType:profileType,paperSize})});setProfiles(await api('/print/profiles'))}} className="mt-6 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Add Profile</button></div>
     <div className="mt-4 flex flex-wrap gap-2">{profiles.map(p=><span key={p.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{p.name} · {p.paper_size}</span>)}</div>
   </Panel>

   <Panel title="Account Security" sub="Change your MauzoPOS login password without leaving the workspace.">
     <div className="grid sm:grid-cols-3 gap-4">
       <Field label="Current password"><input className="control" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></Field>
       <Field label="New password"><input className="control" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></Field>
       <Field label="Confirm new password"><input className="control" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password"/></Field>
     </div>
     {passwordMessage&&<div className={'mt-3 rounded-xl p-3 text-sm font-semibold '+(passwordMessage.includes('success')?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800')}>{passwordMessage}</div>}
     <button onClick={changePassword} disabled={passwordBusy||!currentPassword||!newPassword||!confirmPassword} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-40">{passwordBusy?'Changing…':'Change Password'}</button>
   </Panel>

   <div className="mt-4 flex items-center gap-3">
     <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 text-white px-5 py-3 font-bold">{saving?'Saving…':'Save Settings'}</button>
     {saved&&<span className="text-sm font-semibold text-emerald-600">Saved</span>}
   </div>
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
