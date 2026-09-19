import { useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck, UserRound } from 'lucide-react'
import { api, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

const roles=['owner','administrator','branch_manager','restaurant_manager','cashier','waiter','kitchen','bar','storekeeper','accountant','auditor']

export default function Staff(){
 const [rows,setRows]=useState<any[]|null>(null),[branches,setBranches]=useState<any[]>([]),[permissions,setPermissions]=useState<any[]>([]),[open,setOpen]=useState(false)
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('cashier'),[branchIds,setBranchIds]=useState<number[]>([])
 const load=()=>Promise.all([api('/staff'),api('/branches'),api('/permissions')]).then(([u,b,p])=>{setRows(u);setBranches(b);setPermissions(p)})
 useEffect(()=>{load()},[])
 const grouped=useMemo(()=>permissions.reduce((acc:any,x:any)=>{const k=x.section||'Other';(acc[k] ||= []).push(x);return acc},{}),[permissions])
 async function save(){if(!name||!email||!password)return;await api('/staff',{method:'POST',body:JSON.stringify({name,email,password,role,branchIds})});setOpen(false);setName('');setEmail('');setPassword('');setBranchIds([]);await load()}
 async function toggleActive(x:any){await api('/staff/'+x.id,{method:'PUT',body:JSON.stringify({active:!x.active})});await load()}
 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Access control" title="Staff & Permissions" sub="Users, roles and branch access." action={<button onClick={()=>setOpen(true)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} className="mr-1 inline"/>Add Staff</button>}/>
  <Panel title="Staff"><DataTable head={['Name','Email','Role','Status','Action']} rows={rows.map((x:any)=>[
    <div className="flex items-center gap-2"><UserRound size={15}/><span>{x.name}</span></div>,x.email,nice(x.role),<Badge tone={x.active?'green':'red'}>{x.active?'Active':'Disabled'}</Badge>,<button onClick={()=>toggleActive(x)} className="text-xs font-medium text-slate-600">{x.active?'Disable':'Enable'}</button>
  ])}/></Panel>
  <div className="mt-4"><Panel title="Permission Catalogue" sub="Role rules are stored per business and can be extended without changing the core POS.">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.entries(grouped).map(([section,items]:any)=><div key={section} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15}/>{section}</div><div className="mt-2 space-y-1 text-sm text-slate-500">{items.map((p:any)=><div key={p.code}>{p.name}</div>)}</div></div>)}</div>
  </Panel></div>
  {open&&<Modal title="Add Staff" onClose={()=>setOpen(false)}>
    <div className="grid gap-3">
      <Field label="Name"><input className="control" value={name} onChange={e=>setName(e.target.value)}/></Field>
      <Field label="Email"><input className="control" value={email} onChange={e=>setEmail(e.target.value)}/></Field>
      <Field label="Temporary password"><input className="control" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></Field>
      <Field label="Role"><select className="control" value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r} value={r}>{nice(r)}</option>)}</select></Field>
      <div><div className="text-sm font-medium text-slate-600">Branches</div><div className="mt-2 flex flex-wrap gap-2">{branches.map(b=><label key={b.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input type="checkbox" checked={branchIds.includes(b.id)} onChange={e=>setBranchIds(e.target.checked?[...branchIds,b.id]:branchIds.filter(x=>x!==b.id))}/>{b.name}</label>)}</div></div>
    </div>
    <button onClick={save} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-semibold text-white">Create Staff Account</button>
  </Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-medium text-slate-600">{label}{children}</label>}
