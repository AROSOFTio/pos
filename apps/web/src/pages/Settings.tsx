import { useEffect, useState } from 'react'
import { api } from '../api'
import { PageHeading, Panel, Loading } from '../components'
export default function Settings(){
 const [s,setS]=useState<any>(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false)
 useEffect(()=>{api('/document-settings').then(setS)},[])
 async function save(){setSaving(true);setSaved(false);try{const next=await api('/document-settings',{method:'PUT',body:JSON.stringify({address:s.address,phone:s.phone,email:s.email,taxId:s.tax_id,logoUrl:s.logo_url,documentFooter:s.document_footer,documentAccent:s.document_accent,documentPaperSize:s.document_paper_size})});setS(next);setSaved(true)}finally{setSaving(false)}}
 if(!s)return <Loading/>
 const patch=(k:string,v:any)=>setS({...s,[k]:v})
 return <div><PageHeading eyebrow="Organisation" title="Document & Print Settings" sub="One organisation identity used across purchase orders, expenses, receipts and future reports."/><Panel title="Organisation document identity"><div className="grid sm:grid-cols-2 gap-4">
 <Field label="Organisation"><input className="control" value={s.name||''} disabled/></Field>
 <Field label="Address"><input className="control" value={s.address||''} onChange={e=>patch('address',e.target.value)}/></Field>
 <Field label="Phone"><input className="control" value={s.phone||''} onChange={e=>patch('phone',e.target.value)}/></Field>
 <Field label="Email"><input className="control" value={s.email||''} onChange={e=>patch('email',e.target.value)}/></Field>
 <Field label="TIN / Tax ID"><input className="control" value={s.tax_id||''} onChange={e=>patch('tax_id',e.target.value)}/></Field>
 <Field label="Logo URL"><input className="control" value={s.logo_url||''} onChange={e=>patch('logo_url',e.target.value)}/></Field>
 <Field label="Accent colour"><input type="color" className="control h-12" value={s.document_accent||'#101828'} onChange={e=>patch('document_accent',e.target.value)}/></Field>
 <Field label="Default paper"><select className="control" value={s.document_paper_size||'A4'} onChange={e=>patch('document_paper_size',e.target.value)}><option>A4</option><option>A5</option></select></Field>
 </div><label className="mt-4 block text-sm font-semibold text-slate-700">Footer / terms<textarea className="control min-h-28" value={s.document_footer||''} onChange={e=>patch('document_footer',e.target.value)}/></label><div className="mt-4 flex items-center gap-3"><button onClick={save} disabled={saving} className="rounded-xl bg-slate-950 text-white px-5 py-3 font-bold">{saving?'Saving…':'Save Settings'}</button>{saved&&<span className="text-sm font-semibold text-emerald-600">Saved</span>}</div></Panel></div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-semibold text-slate-700">{label}{children}</label>}
