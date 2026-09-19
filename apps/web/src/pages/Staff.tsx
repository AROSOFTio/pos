import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, ShieldCheck, UserRound } from 'lucide-react'
import { api, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

const roleHelp:Record<string,string>={
 owner:"Full business control",
 administrator:"Full management except platform controls",
 branch_manager:"Manages one or more branches",
 restaurant_manager:"Restaurant floor, orders, tables and approvals",
 cashier:"POS, payments and cashier shift",
 waiter:"Tables and restaurant orders",
 kitchen:"Kitchen display and ticket status",
 bar:"Bar station tickets",
 storekeeper:"Stock, suppliers and receiving",
 accountant:"Expenses, reconciliation and reports",
 auditor:"Read-only review and reports"
}
const roles=['owner','administrator','branch_manager','restaurant_manager','cashier','waiter','kitchen','bar','storekeeper','accountant','auditor']

export default function Staff(){
 const [rows,setRows]=useState<any[]|null>(null),[branches,setBranches]=useState<any[]>([]),[permissions,setPermissions]=useState<any[]>([])
 const [open,setOpen]=useState(false),[editing,setEditing]=useState<any>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[selectedRoles,setSelectedRoles]=useState<string[]>(['cashier']),[branchIds,setBranchIds]=useState<number[]>([])
 const [permRole,setPermRole]=useState('cashier'),[selected,setSelected]=useState<string[]>([]),[savingPerms,setSavingPerms]=useState(false)

 const load=()=>Promise.all([api('/staff'),api('/branches'),api('/permissions')]).then(([u,b,p])=>{setRows(u);setBranches(b);setPermissions(p)})
 useEffect(()=>{load()},[])
 useEffect(()=>{if(!permissions.length)return;setSelected(permissions.filter((x:any)=>x.role===permRole&&x.allowed).map((x:any)=>x.code))},[permRole,permissions])
 const grouped=useMemo(()=>permissions.reduce((acc:any,x:any)=>{const k=x.section||'Other';const exists=(acc[k]||[]).some((p:any)=>p.code===x.code);if(!exists)(acc[k] ||= []).push(x);return acc},{}),[permissions])

 function newStaff(){setEditing(null);setName('');setEmail('');setPassword('');setSelectedRoles(['cashier']);setBranchIds([]);setError('');setOpen(true)}
 function editStaff(x:any){setEditing(x);setName(x.name||'');setEmail(x.email||'');setPassword('');setSelectedRoles(Array.isArray(x.roles)&&x.roles.length?x.roles:[x.role].filter(Boolean));setBranchIds((x.branch_ids||[]).map(Number));setError('');setOpen(true)}
 function toggleRole(role:string){setSelectedRoles(v=>v.includes(role)?(v.length===1?v:v.filter(x=>x!==role)):[...v,role])}

 async function saveStaff(){
  setError('')
  if(!name.trim()||!email.trim()||!selectedRoles.length){setError('Name, email and at least one role are required.');return}
  if(!editing&&password.length<10){setError('Temporary password must be at least 10 characters.');return}
  setSaving(true)
  try{
   if(editing){
    await api('/staff/'+editing.id,{method:'PUT',body:JSON.stringify({roles:selectedRoles,branchIds})})
   }else{
    await api('/staff',{method:'POST',body:JSON.stringify({name:name.trim(),email:email.trim(),password,roles:selectedRoles,branchIds})})
   }
   setOpen(false);await load()
  }catch(e:any){setError(e.message||'Staff account could not be saved.')}finally{setSaving(false)}
 }

 async function toggleActive(x:any){await api('/staff/'+x.id,{method:'PUT',body:JSON.stringify({active:!x.active})});await load()}
 async function savePerms(){setSavingPerms(true);try{await api('/roles/'+permRole+'/permissions',{method:'PUT',body:JSON.stringify({permissions:selected})});await load()}finally{setSavingPerms(false)}}
 if(!rows)return <Loading/>

 return <div>
  <PageHeading eyebrow="Access control" title="Users & Roles" sub="One staff account can now carry multiple roles. Permissions from all assigned roles are combined." action={<button onClick={newStaff} className="rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white"><Plus size={14} className="mr-1 inline"/>Add Staff</button>}/>

  <Panel title="Staff" sub="Assign several roles to the same person instead of creating duplicate accounts.">
   <DataTable head={['Name','Email','Roles','Status','Action']} rows={rows.map((x:any)=>[
    <div className="flex items-center gap-2"><UserRound size={15}/><span>{x.name}</span></div>,
    x.email,
    <div className="flex max-w-[320px] flex-wrap gap-1">{(Array.isArray(x.roles)&&x.roles.length?x.roles:[x.role]).map((r:string)=><Badge key={r} tone={r==='cashier'?'green':r==='restaurant_manager'?'blue':'slate'}>{nice(r)}</Badge>)}</div>,
    <Badge tone={x.active?'green':'red'}>{x.active?'Active':'Disabled'}</Badge>,
    <div className="flex gap-2"><button onClick={()=>editStaff(x)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"><Pencil size={12}/>Roles</button><button onClick={()=>toggleActive(x)} className="text-[11px] font-medium text-slate-500">{x.active?'Disable':'Enable'}</button></div>
   ])}/>
  </Panel>

  <div className="mt-4"><Panel title="Role Permission Matrix" sub="Each user receives the combined allowed permissions of every role assigned to them.">
   <div className="mb-4 flex flex-wrap items-end gap-3">
    <label className="text-[12px] font-medium text-slate-600">Role<select className="control min-w-56" value={permRole} onChange={e=>setPermRole(e.target.value)}>{roles.filter(r=>r!=='owner').map(r=><option key={r} value={r}>{nice(r)}</option>)}</select></label>
    <button onClick={savePerms} disabled={savingPerms} className="rounded-lg bg-[#22A53A] px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-50">{savingPerms?'Saving…':'Save Permissions'}</button>
   </div>
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.entries(grouped).map(([section,items]:any)=><div key={section} className="rounded-xl border border-slate-200 p-3.5"><div className="flex items-center gap-2 text-[12px] font-medium"><ShieldCheck size={14}/>{section}</div><div className="mt-3 space-y-2">{items.map((p:any)=><label key={p.code} className="flex items-start gap-2 text-[12px] text-slate-600"><input className="mt-1 accent-[#22A53A]" type="checkbox" checked={selected.includes(p.code)} onChange={e=>setSelected(e.target.checked?[...selected,p.code]:selected.filter(x=>x!==p.code))}/><span>{p.name}<small className="block text-[9px] text-slate-400">{p.code}</small></span></label>)}</div></div>)}</div>
  </Panel></div>

  {open&&<Modal title={editing?'Edit Roles · '+editing.name:'Add Staff'} onClose={()=>!saving&&setOpen(false)} size="lg">
   <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Name"><input className="control" value={name} onChange={e=>setName(e.target.value)} disabled={!!editing}/></Field>
    <Field label="Email"><input className="control" type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={!!editing}/></Field>
    {!editing&&<div className="sm:col-span-2"><Field label="Temporary password"><input className="control" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></Field></div>}
   </div>

   <div className="mt-4">
    <div className="text-[12px] font-semibold text-slate-700">Roles</div>
    <div className="mt-1 text-[10.5px] text-slate-400">Choose one or more. Example: Cashier + Waiter, or Cashier + Restaurant Manager.</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{roles.map(r=>{
     const checked=selectedRoles.includes(r)
     return <label key={r} className={'cursor-pointer rounded-xl border p-3 transition '+(checked?'border-emerald-300 bg-emerald-50':'border-slate-200 bg-white hover:bg-slate-50')}>
      <div className="flex items-start gap-2.5"><input type="checkbox" checked={checked} onChange={()=>toggleRole(r)} className="mt-0.5 h-4 w-4 accent-[#22A53A]"/><div><div className="text-[12px] font-medium text-slate-700">{nice(r)}</div><div className="mt-0.5 text-[9.5px] leading-4 text-slate-400">{roleHelp[r]}</div></div></div>
     </label>
    })}</div>
   </div>

   <div className="mt-4"><div className="text-[12px] font-semibold text-slate-700">Branch access</div><div className="mt-2 flex flex-wrap gap-2">{branches.map(b=><label key={b.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px]"><input type="checkbox" className="accent-[#22A53A]" checked={branchIds.includes(Number(b.id))} onChange={e=>setBranchIds(e.target.checked?[...branchIds,Number(b.id)]:branchIds.filter(x=>x!==Number(b.id)))}/>{b.name}</label>)}</div></div>

   {error&&<div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-[12px] text-red-700">{error}</div>}
   <button onClick={saveStaff} disabled={saving||!selectedRoles.length||(!editing&&password.length<10)} className="mt-4 w-full rounded-lg bg-[#22A53A] py-3 text-[13px] font-semibold text-white disabled:opacity-40">{saving?'Saving…':editing?'Save Roles & Access':'Create Staff Account'}</button>
  </Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="block text-[11.5px] font-medium text-slate-600">{label}{children}</label>}
