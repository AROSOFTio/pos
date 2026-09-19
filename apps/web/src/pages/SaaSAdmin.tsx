import { useEffect, useMemo, useState } from 'react'
import { Building2, Copy, Eye, Layers3, RefreshCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { api, nice } from '../api'
import { Badge, DataTable, Loading, Modal, Panel } from '../components'

const sectorNames:Record<string,string>={shared:'Shared Core',restaurant:'Restaurant',retail:'Supermarket / Retail',pharmacy:'Pharmacy',factory:'Industrial / Factory',workforce:'Workforce',distribution:'Distribution'}
const sectorTypeOptions=[['restaurant','Restaurant'],['retail','Supermarket / Retail'],['pharmacy','Pharmacy'],['factory','Industrial / Factory'],['general','General / Mixed Business']] as const

export default function SaaSAdmin(){
  const [tab,setTab]=useState<'overview'|'businesses'|'modules'>('overview')
  const [tenants,setTenants]=useState<any[]|null>(null),[catalog,setCatalog]=useState<any[]|null>(null),[selected,setSelected]=useState<any>(null)
  const [tenantModules,setTenantModules]=useState<any[]>([]),[users,setUsers]=useState<any[]>([]),[open,setOpen]=useState(false),[busyKey,setBusyKey]=useState('')
  const [resetLink,setResetLink]=useState(''),[message,setMessage]=useState('')
  async function load(){const [t,m]=await Promise.all([api('/saas/tenants'),api('/saas/modules')]);setTenants(t);setCatalog(m)}
  useEffect(()=>{load()},[])
  async function openTenant(t:any){setSelected(t);setResetLink('');setMessage('');const [mods,us]=await Promise.all([api('/saas/tenants/'+t.id+'/modules'),api('/saas/tenants/'+t.id+'/users')]);setTenantModules(mods);setUsers(us);setOpen(true)}
  async function updateTenant(patch:any){const next=await api('/saas/tenants/'+selected.id,{method:'PUT',body:JSON.stringify(patch)});setSelected({...selected,...next});setTenants(rows=>(rows||[]).map(x=>x.id===next.id?{...x,...next}:x))}
  async function toggleModule(m:any){const key='m'+m.code;setBusyKey(key);try{const current=tenantModules.find(x=>x.code===m.code);await api('/saas/tenants/'+selected.id+'/modules/'+m.code,{method:'PUT',body:JSON.stringify({enabled:!current?.enabled,trial:current?.trial||false,priceOverride:current?.price_override??null,expiresAt:current?.expires_at??null})});setTenantModules(await api('/saas/tenants/'+selected.id+'/modules'))}finally{setBusyKey('')}}
  async function updateModuleMeta(m:any,patch:any){setBusyKey('m'+m.code);try{await api('/saas/tenants/'+selected.id+'/modules/'+m.code,{method:'PUT',body:JSON.stringify({enabled:m.enabled??false,trial:patch.trial??m.trial??false,priceOverride:patch.priceOverride!==undefined?patch.priceOverride:(m.price_override??null),expiresAt:patch.expiresAt!==undefined?patch.expiresAt:(m.expires_at??null)})});setTenantModules(await api('/saas/tenants/'+selected.id+'/modules'))}finally{setBusyKey('')}}
  async function generateReset(user:any){const r=await api('/saas/users/'+user.id+'/reset-link',{method:'POST',body:'{}'});setResetLink(r.resetUrl);setMessage('Reset link generated for '+user.email+'. It expires in 30 minutes.')}
  const liveModules=useMemo(()=>tenantModules.filter(x=>x.enabled),[tenantModules])
  if(!tenants||!catalog)return <Loading/>

  const active=tenants.filter(x=>x.status==='active').length
  const trials=tenants.filter(x=>x.status==='trial').length
  const totalUsers=tenants.reduce((n,x)=>n+Number(x.users||0),0)

  return <div>
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="text-[10px] font-medium uppercase tracking-[.15em] text-[#22A53A]">Platform console</div><h1 className="mt-1 text-[28px] font-semibold tracking-[-.03em] text-slate-950">MauzoPOS SaaS Administration</h1><p className="mt-1 text-[13px] text-slate-500">Tenants, sector modules, trials and platform access.</p></div>
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {([['overview','Overview'],['businesses','Businesses'],['modules','Module Catalogue']] as const).map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={'rounded-lg px-3 py-2 text-[11px] font-medium '+(tab===k?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-50')}>{l}</button>)}
      </div>
    </div>

    {tab==='overview'&&<>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Businesses" value={tenants.length} icon={Building2}/>
        <Kpi label="Active" value={active} icon={ShieldCheck}/>
        <Kpi label="Trials" value={trials} icon={RefreshCcw}/>
        <Kpi label="Tenant users" value={totalUsers} icon={UsersRound}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Recent businesses" sub="Open a business to control its modules and users."><DataTable head={['Business','Sector','Country','Users','Status','']} rows={tenants.slice(0,8).map(t=>[<div><div className="font-medium">{t.name}</div><div className="text-[10px] text-slate-400">Tenant #{t.id}</div></div>,nice(t.business_type||'general'),t.country,Number(t.users||0),<Badge tone={t.status==='active'?'green':t.status==='trial'?'amber':'red'}>{nice(t.status)}</Badge>,<button onClick={()=>openTenant(t)} className="text-[11px] font-medium text-[#22A53A]">Manage</button>])}/></Panel>
        <Panel title="Platform catalogue" sub="Module packs available across the SaaS."><div className="grid grid-cols-2 gap-2"><Mini label="Modules" value={catalog.length}/><Mini label="Live" value={catalog.filter(x=>x.maturity==='live').length}/><Mini label="Core" value={catalog.filter(x=>x.core).length}/><Mini label="Sectors" value={new Set(catalog.map(x=>x.sector)).size}/></div><button onClick={()=>setTab('modules')} className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-[11px] font-medium">Open Module Catalogue</button></Panel>
      </div>
    </>}

    {tab==='businesses'&&<Panel title="Businesses / Tenants" sub="Manage sector, status, module access, users and recovery."><DataTable head={['Business','Sector','Country','Currency','Users','Trial ends','Status','Manage']} rows={tenants.map(t=>[<div><div className="font-medium">{t.name}</div><div className="text-[10px] text-slate-400">Tenant #{t.id}</div></div>,nice(t.business_type||'general'),t.country,t.currency,Number(t.users||0),t.trial_ends_at?new Date(t.trial_ends_at).toLocaleDateString():'—',<Badge tone={t.status==='active'?'green':t.status==='trial'?'amber':'red'}>{nice(t.status)}</Badge>,<button onClick={()=>openTenant(t)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium"><Eye size={13}/>Manage</button>])}/></Panel>}

    {tab==='modules'&&<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{Object.entries(sectorNames).map(([sector,label])=>{const mods=catalog.filter(x=>(x.sector||'shared')===sector);if(!mods.length)return null;return <Panel key={sector} title={label} sub={mods.length+' module(s)'}><div className="space-y-2">{mods.map(m=><div key={m.code} className="rounded-xl border border-slate-100 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-[12px] font-medium text-slate-800">{m.name}</div><div className="mt-0.5 text-[10px] leading-4 text-slate-400">{m.description}</div></div><Badge tone={m.core?'green':m.maturity==='live'?'blue':'amber'}>{m.core?'Core':nice(m.maturity||'available')}</Badge></div></div>)}</div></Panel>})}</div>}

    {open&&selected&&<Modal title={selected.name+' · Platform Access'} onClose={()=>setOpen(false)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Business type"><select className="control" value={selected.business_type||'general'} onChange={e=>updateTenant({businessType:e.target.value})}>{sectorTypeOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Business status"><select className="control" value={selected.status||'active'} onChange={e=>updateTenant({status:e.target.value})}><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option></select></Field>
        <div className="rounded-xl bg-slate-50 p-3"><div className="text-[9px] uppercase tracking-wider text-slate-400">Enabled modules</div><div className="mt-1 text-[20px] font-semibold">{liveModules.length}</div></div>
      </div>

      <div className="mt-5 text-[10px] font-medium uppercase tracking-[.13em] text-slate-400">Module access</div>
      <div className="mt-2 max-h-[390px] space-y-4 overflow-y-auto pr-1">{Object.entries(sectorNames).map(([sector,label])=>{const mods=tenantModules.filter(x=>(x.sector||'shared')===sector);if(!mods.length)return null;return <div key={sector}><div className="mb-2 text-[12px] font-medium">{label}</div><div className="space-y-2">{mods.map(m=><div key={m.code} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[12px] font-medium">{m.name}</span>{m.core&&<Badge tone="green">Core</Badge>}</div><div className="mt-0.5 text-[10px] leading-4 text-slate-400">{m.description}</div></div><button onClick={()=>toggleModule(m)} disabled={busyKey==='m'+m.code||m.core} className={'relative h-6 w-11 rounded-full '+(m.enabled?'bg-[#22A53A]':'bg-slate-200')+' disabled:opacity-50'}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition '+(m.enabled?'left-6':'left-1')}/></button></div>{!m.core&&<div className="mt-2 grid gap-2 sm:grid-cols-3"><Field label="Trial"><select className="control !mt-1 !py-2 text-[11px]" value={m.trial?'yes':'no'} onChange={e=>updateModuleMeta(m,{trial:e.target.value==='yes'})}><option value="no">No</option><option value="yes">Yes</option></select></Field><Field label="Price override"><input className="control !mt-1 !py-2 text-[11px]" type="number" min="0" defaultValue={m.price_override??''} onBlur={e=>updateModuleMeta(m,{priceOverride:e.target.value===''?null:Number(e.target.value)})}/></Field><Field label="Expires"><input className="control !mt-1 !py-2 text-[11px]" type="date" defaultValue={m.expires_at?String(m.expires_at).slice(0,10):''} onBlur={e=>updateModuleMeta(m,{expiresAt:e.target.value?new Date(e.target.value+'T23:59:59Z').toISOString():null})}/></Field></div>}</div>)}</div></div>})}</div>

      <div className="mt-5 text-[10px] font-medium uppercase tracking-[.13em] text-slate-400">Tenant users</div>
      <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{users.map(u=><div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><div className="text-[12px] font-medium">{u.name}</div><div className="text-[10px] text-slate-400">{u.email} · {nice(u.business_role||u.role)}</div></div><button onClick={()=>generateReset(u)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-medium"><RefreshCcw size={12}/>Reset</button></div>)}</div>
      {resetLink&&<div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-[10px] font-medium text-emerald-700">{message}</div><div className="mt-2 flex gap-2"><input readOnly value={resetLink} className="control !mt-0 text-[10px]"/><button onClick={()=>navigator.clipboard.writeText(resetLink)} className="rounded-lg bg-slate-950 px-3 text-white"><Copy size={14}/></button></div></div>}
    </Modal>}
  </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-[10px] font-medium text-slate-500">{label}{children}</label>}
function Kpi({label,value,icon:Icon}:{label:string;value:any;icon:any}){return <div className="rounded-xl border border-slate-200 bg-white p-4 premium-shadow"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.1em] text-slate-400">{label}</div><div className="mt-2 text-[24px] font-semibold">{value}</div></div><div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-[#22A53A]"><Icon size={17}/></div></div></div>}
function Mini({label,value}:{label:string;value:any}){return <div className="rounded-xl bg-slate-50 p-3"><div className="text-[18px] font-semibold">{value}</div><div className="text-[10px] text-slate-400">{label}</div></div>}
