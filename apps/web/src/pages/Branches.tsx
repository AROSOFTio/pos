import { useEffect, useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { api } from '../api'
import { PageHeading, Panel, DataTable, Loading, Modal, Badge } from '../components'
export default function Branches(){
 const [rows,setRows]=useState<any[]|null>(null),[open,setOpen]=useState(false),[name,setName]=useState(''),[location,setLocation]=useState('')
 const load=()=>api('/branches').then(setRows);useEffect(()=>{load()},[])
 async function save(){if(!name.trim())return;await api('/branches',{method:'POST',body:JSON.stringify({name,location})});setOpen(false);setName('');setLocation('');await load()}
 if(!rows)return <Loading/>
 return <div><PageHeading eyebrow="Organisation" title="Branches" sub="Business locations with automatic default stock stores." action={<button onClick={()=>setOpen(true)} className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold"><Plus size={16} className="inline mr-1"/>New Branch</button>}/><Panel title="Branches"><DataTable head={['Branch','Location','Status']} rows={rows.map(x=>[<div className="flex items-center gap-2"><Building2 size={16}/><b>{x.name}</b></div>,x.location||'-',<Badge tone={x.active?'green':'red'}>{x.active?'Active':'Inactive'}</Badge>])}/></Panel>{open&&<Modal title="New Branch" onClose={()=>setOpen(false)}><label className="text-sm font-semibold text-slate-700">Branch name<input className="control" value={name} onChange={e=>setName(e.target.value)}/></label><label className="mt-3 block text-sm font-semibold text-slate-700">Location<input className="control" value={location} onChange={e=>setLocation(e.target.value)}/></label><button onClick={save} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold">Create Branch</button></Modal>}</div>
}
