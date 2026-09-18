import { useEffect, useState } from 'react'
import { api } from '../api'
import { PageHeading, Panel, Loading } from '../components'

export default function Settings(){
 const [s,setS]=useState<any>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false)
 useEffect(()=>{api('/document-settings').then(setS)},[])
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

   <div className="mt-4 flex items-center gap-3">
     <button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 text-white px-5 py-3 font-bold">{saving?'Saving…':'Save Settings'}</button>
     {saved&&<span className="text-sm font-semibold text-emerald-600">Saved</span>}
   </div>
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
