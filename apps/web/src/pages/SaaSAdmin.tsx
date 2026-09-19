import { useEffect, useMemo, useState } from 'react'
import { Building2, Copy, Eye, Layers3, RefreshCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { api, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel } from '../components'

const sectorNames:Record<string,string>={
  shared:'Shared Core',restaurant:'Restaurant',retail:'Supermarket / Retail',pharmacy:'Pharmacy',
  factory:'Industrial / Factory',workforce:'Workforce',distribution:'Distribution'
}
const sectorTypeOptions=[
  ['restaurant','Restaurant'],
  ['retail','Supermarket / Retail'],
  ['pharmacy','Pharmacy'],
  ['factory','Industrial / Factory'],
  ['general','General / Mixed Business'],
] as const

export default function SaaSAdmin(){
  const [tenants,setTenants]=useState<any[]|null>(null)
  const [catalog,setCatalog]=useState<any[]|null>(null)
  const [selected,setSelected]=useState<any>(null)
  const [tenantModules,setTenantModules]=useState<any[]>([])
  const [users,setUsers]=useState<any[]>([])
  const [open,setOpen]=useState(false)
  const [busyKey,setBusyKey]=useState('')
  const [resetLink,setResetLink]=useState('')
  const [message,setMessage]=useState('')

  async function load(){
    const [t,m]=await Promise.all([api('/saas/tenants'),api('/saas/modules')])
    setTenants(t);setCatalog(m)
  }
  useEffect(()=>{load()},[])

  async function openTenant(t:any){
    setSelected(t);setResetLink('');setMessage('')
    const [mods,us]=await Promise.all([api('/saas/tenants/'+t.id+'/modules'),api('/saas/tenants/'+t.id+'/users')])
    setTenantModules(mods);setUsers(us);setOpen(true)
  }

  async function updateTenant(patch:any){
    const next=await api('/saas/tenants/'+selected.id,{method:'PUT',body:JSON.stringify(patch)})
    setSelected({...selected,...next})
    setTenants(rows=>(rows||[]).map(x=>x.id===next.id?{...x,...next}:x))
  }

  async function toggleModule(m:any){
    const key='m'+m.code;setBusyKey(key)
    try{
      const current=tenantModules.find(x=>x.code===m.code)
      await api('/saas/tenants/'+selected.id+'/modules/'+m.code,{method:'PUT',body:JSON.stringify({
        enabled:!current?.enabled,
        trial:current?.trial||false,
        priceOverride:current?.price_override??null,
        expiresAt:current?.expires_at??null
      })})
      const mods=await api('/saas/tenants/'+selected.id+'/modules');setTenantModules(mods)
    }finally{setBusyKey('')}
  }

  async function updateModuleMeta(m:any,patch:any){
    setBusyKey('m'+m.code)
    try{
      await api('/saas/tenants/'+selected.id+'/modules/'+m.code,{method:'PUT',body:JSON.stringify({
        enabled:m.enabled??false,
        trial:patch.trial??m.trial??false,
        priceOverride:patch.priceOverride!==undefined?patch.priceOverride:(m.price_override??null),
        expiresAt:patch.expiresAt!==undefined?patch.expiresAt:(m.expires_at??null),
      })})
      setTenantModules(await api('/saas/tenants/'+selected.id+'/modules'))
    }finally{setBusyKey('')}
  }

  async function generateReset(user:any){
    const r=await api('/saas/users/'+user.id+'/reset-link',{method:'POST',body:'{}'})
    setResetLink(r.resetUrl)
    setMessage('Reset link generated for '+user.email+'. It expires in 30 minutes.')
  }

  const liveModules=useMemo(()=>tenantModules.filter(x=>x.enabled),[tenantModules])
  if(!tenants||!catalog)return <Loading/>

  return <div>
    <PageHeading eyebrow="Platform administration" title="MauzoPOS SaaS Admin" sub="Control businesses, sector packs, module access, trials, pricing and account recovery from one platform console."/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Businesses" value={String(tenants.length)} icon={Building2}/>
      <Kpi label="Active businesses" value={String(tenants.filter(x=>x.status==='active').length)} icon={ShieldCheck}/>
      <Kpi label="Platform modules" value={String(catalog.length)} icon={Layers3}/>
      <Kpi label="Tenant users" value={String(tenants.reduce((n,x)=>n+Number(x.users||0),0))} icon={UsersRound}/>
    </div>

    <div className="mt-5"><Panel title="Businesses / Tenants" sub="Each business sees only the modules you enable for it.">
      <DataTable head={['Business','Sector','Country','Currency','Users','Trial ends','Status','Manage']} rows={tenants.map(t=>[
        <div><b>{t.name}</b><div className="text-[11px] text-slate-400">Tenant #{t.id}</div></div>,
        nice(t.business_type||'general'),
        t.country,
        t.currency,
        Number(t.users||0),
        t.trial_ends_at?new Date(t.trial_ends_at).toLocaleDateString():'—',
        <Badge tone={t.status==='active'?'green':'red'}>{nice(t.status)}</Badge>,
        <button onClick={()=>openTenant(t)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold"><Eye size={14}/>Manage</button>
      ])}/>
    </Panel></div>

    {open&&selected&&<Modal title={selected.name+' · Platform Access'} onClose={()=>setOpen(false)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Business type">
          <select className="control" value={selected.business_type||'general'} onChange={e=>updateTenant({businessType:e.target.value})}>
            {sectorTypeOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Business status">
          <select className="control" value={selected.status||'active'} onChange={e=>updateTenant({status:e.target.value})}><option value="active">Active</option><option value="suspended">Suspended</option></select>
        </Field>
        <div className="rounded-xl bg-slate-950 p-3 text-white"><div className="text-[10px] uppercase tracking-wider text-slate-400">Enabled modules</div><div className="mt-1 text-xl font-black">{liveModules.length}</div></div>
      </div>

      <div className="mt-6 text-xs font-black uppercase tracking-[.14em] text-slate-400">Sector & module access</div>
      <div className="mt-3 space-y-5 max-h-[470px] overflow-y-auto pr-1">
        {Object.entries(sectorNames).map(([sector,label])=>{
          const mods=tenantModules.filter(x=>(x.sector||'shared')===sector)
          if(!mods.length)return null
          return <div key={sector}>
            <div className="mb-2 flex items-center justify-between"><b className="text-sm">{label}</b><span className="text-[10px] text-slate-400">{mods.filter(x=>x.enabled).length}/{mods.length} enabled</span></div>
            <div className="grid gap-2">
              {mods.map(m=><div key={m.code} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><b className="text-sm">{m.name}</b>{m.core&&<Badge tone="green">Core</Badge>}<Badge tone={m.maturity==='live'?'green':m.maturity==='planned'?'amber':'slate'}>{nice(m.maturity||'available')}</Badge></div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{m.description}</div>
                  </div>
                  <button onClick={()=>toggleModule(m)} disabled={busyKey==='m'+m.code||m.core} className={'relative h-7 w-12 rounded-full transition '+(m.enabled?'bg-[#22A53A]':'bg-slate-200')+' disabled:opacity-50'}>
                    <span className={'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition '+(m.enabled?'left-6':'left-1')}/>
                  </button>
                </div>
                {!m.core&&<div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <label className="text-[11px] font-bold text-slate-500">Trial
                    <select className="control !mt-1 !py-2 text-xs" value={m.trial?'yes':'no'} onChange={e=>updateModuleMeta(m,{trial:e.target.value==='yes'})}><option value="no">No</option><option value="yes">Yes</option></select>
                  </label>
                  <label className="text-[11px] font-bold text-slate-500">Price override
                    <input className="control !mt-1 !py-2 text-xs" type="number" min="0" defaultValue={m.price_override??''} onBlur={e=>updateModuleMeta(m,{priceOverride:e.target.value===''?null:Number(e.target.value)})} placeholder={String(m.monthly_price||0)}/>
                  </label>
                  <label className="text-[11px] font-bold text-slate-500">Expires
                    <input className="control !mt-1 !py-2 text-xs" type="date" defaultValue={m.expires_at?String(m.expires_at).slice(0,10):''} onBlur={e=>updateModuleMeta(m,{expiresAt:e.target.value?new Date(e.target.value+'T23:59:59Z').toISOString():null})}/>
                  </label>
                </div>}
              </div>)}
            </div>
          </div>
        })}
      </div>

      <div className="mt-6 text-xs font-black uppercase tracking-[.14em] text-slate-400">Business users & account recovery</div>
      <div className="mt-3 max-h-52 overflow-y-auto space-y-2">
        {users.map(u=><div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
          <div><b className="text-sm">{u.name}</b><div className="text-xs text-slate-400">{u.email} · {nice(u.business_role||u.role)}</div></div>
          <button onClick={()=>generateReset(u)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><RefreshCcw size={14}/>Reset Link</button>
        </div>)}
      </div>
      {resetLink&&<div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
        <div className="text-xs font-bold text-emerald-700">{message}</div>
        <div className="mt-2 flex gap-2"><input readOnly value={resetLink} className="control !mt-0 text-xs"/><button onClick={()=>navigator.clipboard.writeText(resetLink)} className="rounded-xl bg-slate-950 px-3 text-white"><Copy size={15}/></button></div>
      </div>}
    </Modal>}
  </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-xs font-bold text-slate-500">{label}{children}</label>}
function Kpi({label,value,icon:Icon}:{label:string;value:string;icon:any}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div><div className="grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-[#22A53A]"><Icon size={20}/></div></div></div>}
