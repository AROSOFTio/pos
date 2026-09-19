import { useEffect, useState } from 'react'
import { Building2, Monitor, Plus } from 'lucide-react'
import { api } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

export default function Branches(){
 const [rows,setRows]=useState<any[]|null>(null),[terminals,setTerminals]=useState<any[]>([]),[open,setOpen]=useState(false),[terminalOpen,setTerminalOpen]=useState(false)
 const [name,setName]=useState(''),[location,setLocation]=useState(''),[branchId,setBranchId]=useState<number|''>(''),[terminalName,setTerminalName]=useState('Front Counter'),[code,setCode]=useState('')
 const load=()=>Promise.all([api('/branches'),api('/terminals')]).then(([b,t])=>{setRows(b);setTerminals(t)})
 useEffect(()=>{load()},[])
 async function save(){if(!name.trim())return;await api('/branches',{method:'POST',body:JSON.stringify({name,location})});setOpen(false);setName('');setLocation('');await load()}
 async function saveTerminal(){if(!branchId||!terminalName.trim()||!code.trim())return;await api('/terminals',{method:'POST',body:JSON.stringify({branchId,name:terminalName,code})});setTerminalOpen(false);setCode('');await load()}
 async function toggleBranch(x:any){await api('/branches/'+x.id,{method:'PUT',body:JSON.stringify({active:!x.active})});await load()}
 async function toggleTerminal(x:any){await api('/terminals/'+x.id,{method:'PUT',body:JSON.stringify({active:!x.active})});await load()}
 if(!rows)return <Loading/>
 return <div>
  <PageHeading eyebrow="Organisation" title="Branches & Terminals" sub="Business locations, stock stores and POS terminals." action={<div className="flex gap-2"><button onClick={()=>setTerminalOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium"><Monitor size={15} className="mr-1 inline"/>Terminal</button><button onClick={()=>setOpen(true)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} className="mr-1 inline"/>Branch</button></div>}/>
  <div className="grid gap-4 xl:grid-cols-2">
    <Panel title="Branches"><DataTable head={['Branch','Location','Status','Action']} rows={rows.map(x=>[<div className="flex items-center gap-2"><Building2 size={15}/><span>{x.name}</span></div>,x.location||'-',<Badge tone={x.active?'green':'red'}>{x.active?'Active':'Inactive'}</Badge>,<button onClick={()=>toggleBranch(x)} className="text-xs font-medium text-slate-600">{x.active?'Disable':'Enable'}</button>])}/></Panel>
    <Panel title="Terminals"><DataTable head={['Terminal','Code','Branch','Status','Action']} rows={terminals.map(x=>[<div className="flex items-center gap-2"><Monitor size={15}/><span>{x.name}</span></div>,x.code,x.branch_name,<Badge tone={x.active?'green':'red'}>{x.active?'Active':'Inactive'}</Badge>,<button onClick={()=>toggleTerminal(x)} className="text-xs font-medium text-slate-600">{x.active?'Disable':'Enable'}</button>])}/></Panel>
  </div>
  {open&&<Modal title="New Branch" onClose={()=>setOpen(false)}><Field label="Branch name"><input className="control" value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Location"><input className="control" value={location} onChange={e=>setLocation(e.target.value)}/></Field><button onClick={save} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-semibold text-white">Create Branch</button></Modal>}
  {terminalOpen&&<Modal title="New Terminal" onClose={()=>setTerminalOpen(false)}><Field label="Branch"><select className="control" value={branchId} onChange={e=>setBranchId(Number(e.target.value)||'')}><option value="">Select branch</option>{rows.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Terminal name"><input className="control" value={terminalName} onChange={e=>setTerminalName(e.target.value)}/></Field><Field label="Code"><input className="control" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="MAIN-01"/></Field><button onClick={saveTerminal} className="mt-4 w-full rounded-xl bg-slate-950 py-3 font-semibold text-white">Create Terminal</button></Modal>}
 </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="mt-3 block text-sm font-medium text-slate-600">{label}{children}</label>}
