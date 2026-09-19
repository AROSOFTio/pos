import { Component, useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Banknote, BarChart3, Bell, Boxes, ChefHat, ClipboardList, Eye, EyeOff, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu as MenuIcon, Package, ReceiptText, Settings as SettingsIcon, ShieldCheck, ShoppingCart, Truck, UserRound, UsersRound, UtensilsCrossed, X, Building2 } from 'lucide-react'
import { api, nice, type User } from './api'
import { MauzoLogo } from './Brand'
import Marketing from './Marketing'
import Register from './Register'
import ResetPassword from './ResetPassword'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Sales from './pages/Sales'
import Orders from './pages/Orders'
import Kitchen from './pages/Kitchen'
import Restaurant from './pages/Restaurant'
import Approvals from './pages/Approvals'
import Inventory from './pages/Inventory'
import Purchasing from './pages/Purchasing'
import Expenses from './pages/Expenses'
import Products from './pages/Products'
import Suppliers from './pages/Suppliers'
import Branches from './pages/Branches'
import Settings from './pages/Settings'
import CashDrawer from './pages/CashDrawer'
import Customers from './pages/Customers'
import SaaSAdmin from './pages/SaaSAdmin'
import Reports from './pages/Reports'
import Staff from './pages/Staff'

export type ViewKey='Dashboard'|'POS'|'Sales'|'Orders'|'Kitchen'|'Restaurant'|'Customers'|'Approvals'|'Products'|'Inventory'|'Suppliers'|'Purchasing'|'Expenses'|'Shifts'|'Reports'|'Staff'|'Branches'|'Settings'

const administration=[['Approvals',ShieldCheck],['Products',Boxes],['Inventory',Package],['Suppliers',UsersRound],['Purchasing',Truck],['Expenses',ReceiptText],['Shifts',Banknote],['Reports',BarChart3],['Staff',UsersRound],['Branches',Building2],['Settings',SettingsIcon]] as const

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<ViewKey>('Dashboard')
  const [sidebar,setSidebar]=useState(false)
  const [currency,setCurrency]=useState('UGX')
  const [business,setBusiness]=useState('Your Business')
  const [businessLogo,setBusinessLogo]=useState('')
  const [enabled,setEnabled]=useState<Set<string>>(new Set())
  const [businessRole,setBusinessRole]=useState('')
  const [businessRoles,setBusinessRoles]=useState<string[]>([])
  const [permissions,setPermissions]=useState<Set<string>>(new Set())
  const [path,setPath]=useState(window.location.pathname)
  const [workspace,setWorkspace]=useState<'management'|'operations'>('management')

  useEffect(()=>{const onPop=()=>setPath(window.location.pathname);window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{const token=localStorage.getItem('pos_token');if(!token){setLoading(false);return}api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))},[])
  useEffect(()=>{
    if(!user||user.role==='saas_admin')return
    Promise.all([api('/dashboard'),api('/modules'),api('/me/access'),api('/document-settings').catch(()=>({}))]).then(([d,m,a,theme]:any[])=>{
      setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'Your Business')
      setEnabled(new Set(m.filter((x:any)=>x.core||x.enabled).map((x:any)=>x.code)))
      setBusinessRole(a.businessRole||user.role);setBusinessRoles(Array.isArray(a.businessRoles)&&a.businessRoles.length?a.businessRoles:[a.businessRole||user.role]);setPermissions(new Set(a.permissions||[]))
      setBusinessLogo(String(theme?.logo_url||''))
      applyTheme(String(theme?.theme_key||'green'),String(theme?.theme_mode||'light'),String(theme?.document_accent||''))
    }).catch(()=>{})
  },[user])
  useEffect(()=>{
    const roles=businessRoles.length?businessRoles:[businessRole||user?.role||'']
    const managementRoleSet=['owner','administrator','admin','branch_manager','restaurant_manager','storekeeper','accountant','auditor']
    if(!roles.some(r=>managementRoleSet.includes(r)))setWorkspace('operations')
  },[businessRole,businessRoles,user?.role])

  const navigate=(next:string)=>{window.history.pushState({},'',next);setPath(next)}
  const authenticated=(u:User)=>{window.history.replaceState({},'', '/app');setPath('/app');setUser(u)}
  const logout=()=>{localStorage.removeItem('pos_token');window.history.replaceState({},'', '/login');location.reload()}

  if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Loading MauzoPOS…</div>
  if(!user){
    if(path==='/register')return <Register onLogin={authenticated} navigate={navigate}/>
    if(path==='/reset-password')return <ResetPassword navigate={navigate}/>
    if(path==='/login')return <Login onLogin={authenticated} navigate={navigate}/>
    return <Marketing navigate={navigate}/>
  }

  if(user.role==='saas_admin')return <div className="min-h-screen bg-[#f7f8fa]">
    <header className="sticky top-0 z-30 flex h-[60px] items-center border-b border-slate-200 bg-white px-4 sm:px-6">
      <MauzoLogo compact/>
      <div className="ml-4 hidden border-l border-slate-200 pl-4 sm:block"><div className="text-[9px] font-medium uppercase tracking-[.12em] text-[#22A53A]">Platform</div><div className="text-[12px] font-medium text-slate-600">SaaS Administration</div></div>
      <div className="ml-auto flex items-center gap-2"><div className="hidden text-right sm:block"><div className="text-[11px] font-medium text-slate-700">{user.name}</div><div className="text-[9px] text-slate-400">{user.email}</div></div><button onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut size={16}/></button></div>
    </header>
    <main className="mx-auto max-w-[1480px] px-3 py-4 sm:px-5 lg:px-6"><SaaSAdmin/></main>
  </div>

  const hasRole=(...roles:string[])=>businessRoles.some(r=>roles.includes(r))||roles.includes(businessRole)
  const elevated=hasRole('owner','administrator','admin')
  const can=(p:string)=>elevated||permissions.has(p)
  const hasRestaurant=enabled.has('restaurant')
  const managementRoleSet=['owner','administrator','admin','branch_manager','restaurant_manager','storekeeper','accountant','auditor']
  const hasManagementAccess=elevated||businessRoles.some(r=>managementRoleSet.includes(r))

  const managementRows=(administration.filter(([name])=>{
    if(!hasManagementAccess)return false
    if(name==='Approvals')return elevated||hasRole('branch_manager','restaurant_manager')
    if(name==='Products')return elevated||hasRole('branch_manager','restaurant_manager','storekeeper')
    if(name==='Inventory')return elevated||hasRole('branch_manager','restaurant_manager','storekeeper','auditor')
    if(name==='Suppliers')return elevated||hasRole('branch_manager','storekeeper')
    if(name==='Purchasing')return enabled.has('purchasing')&&(elevated||hasRole('branch_manager','storekeeper','accountant'))
    if(name==='Expenses')return elevated||hasRole('branch_manager','accountant','auditor')
    if(name==='Shifts')return elevated||hasRole('branch_manager','accountant','auditor')
    if(name==='Reports')return can('reports.profit')||hasRole('auditor')
    if(name==='Staff')return can('staff.manage')
    if(name==='Branches'||name==='Settings')return can('settings.manage')
    return false
  }) as any)

  const operationRows=[
    ['POS',ShoppingCart],
    ...(hasRestaurant?[['Orders',ClipboardList],['Kitchen',ChefHat],['Restaurant',UtensilsCrossed]]:[]),
    ['Sales',ReceiptText],
    ['Customers',UsersRound],
    ['Shifts',Banknote],
  ] as any

  const allowedOps=operationRows.filter(([name]:any)=>{
    if(name==='POS')return elevated||businessRoles.some(r=>['branch_manager','restaurant_manager','cashier'].includes(r))
    if(name==='Orders')return elevated||businessRoles.some(r=>['branch_manager','restaurant_manager','cashier','waiter'].includes(r))
    if(name==='Kitchen')return elevated||businessRoles.some(r=>['restaurant_manager','kitchen','bar'].includes(r))
    if(name==='Restaurant')return elevated||businessRoles.some(r=>['branch_manager','restaurant_manager','waiter'].includes(r))
    if(name==='Sales')return elevated||businessRoles.some(r=>['branch_manager','restaurant_manager','cashier','accountant','auditor'].includes(r))
    if(name==='Customers')return elevated||businessRoles.some(r=>['branch_manager','restaurant_manager','cashier','waiter','accountant'].includes(r))
    if(name==='Shifts')return elevated||businessRoles.some(r=>['branch_manager','cashier','accountant'].includes(r))
    return false
  })

  const managementViews=new Set<ViewKey>(['Dashboard','Approvals','Products','Inventory','Suppliers','Purchasing','Expenses','Reports','Staff','Branches','Settings'])
  const canAccessView=(v:ViewKey)=>{
    if(managementViews.has(v))return hasManagementAccess&&(v==='Dashboard'||managementRows.some(([name]:any)=>name===v))
    return allowedOps.some(([name]:any)=>name===v)
  }
  const safeGo=(v:ViewKey)=>{
    if(canAccessView(v)){setView(v);setSidebar(false);return}
    const fallback=(allowedOps[0]?.[0]||'POS') as ViewKey
    setWorkspace('operations');setView(fallback);setSidebar(false)
  }

  const renderView=()=> <>
    {view==='Dashboard'&&hasManagementAccess&&<Dashboard currency={currency} go={safeGo}/>}
    {view==='POS'&&<POS currency={currency}/>}
    {view==='Sales'&&<Sales currency={currency}/>}
    {view==='Orders'&&hasRestaurant&&<Orders currency={currency}/>}
    {view==='Kitchen'&&hasRestaurant&&<Kitchen/>}
    {view==='Restaurant'&&hasRestaurant&&<Restaurant currency={currency} go={safeGo}/>}
    {view==='Customers'&&<Customers currency={currency}/>}
    {view==='Approvals'&&canAccessView('Approvals')&&<Approvals currency={currency}/>}
    {view==='Inventory'&&canAccessView('Inventory')&&<Inventory currency={currency}/>}
    {view==='Purchasing'&&canAccessView('Purchasing')&&enabled.has('purchasing')&&<Purchasing currency={currency}/>}
    {view==='Expenses'&&canAccessView('Expenses')&&<Expenses currency={currency}/>}
    {view==='Products'&&canAccessView('Products')&&<Products currency={currency}/>}
    {view==='Suppliers'&&canAccessView('Suppliers')&&<Suppliers currency={currency}/>}
    {view==='Shifts'&&<CashDrawer currency={currency} onOpened={()=>{setWorkspace('operations');setView(hasRestaurant?'Restaurant':'POS')}}/>}
    {view==='Reports'&&canAccessView('Reports')&&<Reports currency={currency}/>}
    {view==='Staff'&&canAccessView('Staff')&&<Staff/>}
    {view==='Branches'&&canAccessView('Branches')&&<Branches/>}
    {view==='Settings'&&canAccessView('Settings')&&<Settings/>}
  </>

  if(workspace==='operations'){
    if(!hasManagementAccess){const fallback=(allowedOps[0]?.[0]||'POS') as ViewKey;setTimeout(()=>{setWorkspace('operations');if(managementViews.has(view))setView(fallback)},0);return <div className="min-h-screen grid place-items-center bg-[var(--app-bg)] text-slate-500">Loading operations…</div>}

  return <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--app-surface)]/98">
        <div className="mx-auto flex h-[62px] max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <BusinessBrand name={business} logo={businessLogo}/>
          <nav className="ml-5 hidden flex-1 items-center justify-center gap-1 lg:flex">
            {allowedOps.map(([name,Icon]:any)=><button key={name} onClick={()=>safeGo(name as ViewKey)} className={'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] transition '+(view===name?'bg-[var(--brand-soft)] font-medium text-[var(--brand-primary)]':'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}><Icon size={15}/>{name}</button>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {hasManagementAccess&&<button onClick={()=>{setWorkspace('management');setView('Dashboard')}} className="hidden rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 sm:block">Management</button>}
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Bell size={16}/></button>
            <div className="hidden items-center gap-2 sm:flex"><div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500"><UserRound size={14}/></div><div className="leading-tight"><div className="max-w-32 truncate text-[11px] font-medium">{user.name}</div><div className="max-w-44 truncate text-[9px] text-slate-400">{(businessRoles.length?businessRoles:[businessRole||user.role]).map(nice).join(' · ')}</div></div></div>
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut size={15}/></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 pb-20 pt-4 sm:px-5 lg:pb-6">
        <div className="page-enter"><ViewErrorBoundary key={view} onBack={()=>setView(hasRestaurant?'Restaurant':'POS')}>{renderView()}</ViewErrorBoundary></div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[64px] border-t border-slate-200 bg-[var(--app-surface)] lg:hidden">
        {allowedOps.slice(0,4).map(([name,Icon]:any)=><div key={name} className="flex-1"><MobileNav icon={Icon} label={name==='Sales'?'History':name} active={view===name} onClick={()=>safeGo(name as ViewKey)}/></div>)}
        {allowedOps.length>4&&<div className="flex-1"><MobileNav icon={MenuIcon} label="More" active={false} onClick={()=>setSidebar(true)}/></div>}
      </nav>

      {sidebar&&<div className="fixed inset-0 z-50 bg-slate-950/20 lg:hidden" onClick={()=>setSidebar(false)}>
        <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-3 shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200"/>
          <div className="grid grid-cols-3 gap-2">{allowedOps.map(([name,Icon]:any)=><button key={name} onClick={()=>safeGo(name as ViewKey)} className="rounded-xl border border-slate-100 p-3 text-center text-[11px] text-slate-600"><Icon size={18} className="mx-auto mb-1"/>{name}</button>)}</div>
          {hasManagementAccess&&<button onClick={()=>{setWorkspace('management');setView('Dashboard');setSidebar(false)}} className="mt-3 w-full rounded-xl bg-slate-950 py-3 text-[12px] font-medium text-white">Open Management</button>}
        </div>
      </div>}
    </div>
  }

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
    {sidebar&&<button aria-label="Close menu" onClick={()=>setSidebar(false)} className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden"/>}

    <aside className={'fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-slate-200 bg-[var(--app-sidebar)] transition-transform duration-200 lg:translate-x-0 '+(sidebar?'translate-x-0':'-translate-x-full')}>
      <div className="flex h-[62px] items-center border-b border-slate-100 px-4">
        <BusinessBrand name={business} logo={businessLogo}/>
        <button onClick={()=>setSidebar(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"><X size={17}/></button>
      </div>
      <div className="px-3 pt-4">
        <div className="px-2"><div className="text-[9px] uppercase tracking-[.12em] text-slate-400">Business</div><div className="mt-1 truncate text-[12px] font-medium text-slate-700">{business}</div></div>
      </div>
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-4">
        <div className="mt-4"><button onClick={()=>go('Dashboard')} className={'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] '+(view==='Dashboard'?'bg-[var(--brand-soft)] font-medium text-[var(--brand-primary)]':'text-slate-600 hover:bg-slate-100')}><LayoutDashboard size={16}/>Overview</button></div>
        {managementRows.length>0&&<NavGroup title="Management" rows={managementRows} view={view} go={safeGo}/>} 
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button onClick={()=>{setWorkspace('operations');setView('POS')}} className="mb-2 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft)] px-3 py-2.5 text-[11px] font-medium text-[var(--brand-primary)]">Open Operations</button>
        <div className="flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><UserRound size={15}/></div>
          <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium">{user.name}</div><div className="truncate text-[9px] text-slate-400">{nice(businessRole||user.role)}</div></div>
          <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut size={15}/></button>
        </div>
        <div className="mt-1 px-2 text-center text-[8.5px] text-slate-300">Powered by MauzoPOS</div>
      </div>
    </aside>

    <main className="min-w-0 lg:ml-[236px]">
      <header className="sticky top-0 z-30 flex h-[62px] items-center gap-3 border-b border-slate-200/80 bg-[var(--app-surface)] px-3 sm:px-5 lg:px-6">
        <button onClick={()=>setSidebar(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"><MenuIcon size={18}/></button>
        <div className="min-w-0"><h1 className="truncate text-[15px] font-semibold">{view==='Dashboard'?'Overview':view}</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={()=>{setWorkspace('operations');setView('POS')}} className="hidden rounded-lg bg-[var(--brand-primary)] px-3.5 py-2 text-[11px] font-medium text-white sm:block">Open Operations</button>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Bell size={16}/></button>
        </div>
      </header>
      <div className="page-enter px-3 py-4 sm:px-5 lg:px-6 lg:py-5"><ViewErrorBoundary key={view} onBack={()=>setView('Dashboard')}>{renderView()}</ViewErrorBoundary></div>
    </main>
  </div>
}

class ViewErrorBoundary extends Component<{children:ReactNode;onBack:()=>void},{error:string}>{
  state={error:''}
  static getDerivedStateFromError(error:any){return {error:error?.message||'This screen could not be displayed.'}}
  componentDidCatch(error:any,info:any){console.error('MauzoPOS view error',error,info)}
  render(){
    if(this.state.error)return <div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-6 shadow-sm"><div className="text-[15px] font-semibold text-slate-900">This screen hit an error</div><p className="mt-2 text-[12px] leading-5 text-red-600">{this.state.error}</p><button onClick={this.props.onBack} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-[12px] font-medium text-white">Return to working dashboard</button></div>
    return this.props.children
  }
}

function NavGroup({title,rows,view,go}:{title:string;rows:readonly (readonly [string,any])[];view:ViewKey;go:(v:ViewKey)=>void}){return <div className="mt-5"><div className="mb-1 px-3 text-[9px] font-medium uppercase tracking-[.12em] text-slate-400">{title}</div><div className="space-y-0.5">{rows.map(([name,Icon])=><button key={name} onClick={()=>safeGo(name as ViewKey)} className={'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] transition-colors '+(view===name?'bg-[var(--brand-soft)] font-medium text-[var(--brand-primary)]':'font-normal text-slate-600 hover:bg-slate-100 hover:text-slate-900')}><Icon size={16}/><span>{name==='Staff'?'Users & Roles':name}</span></button>)}</div></div>}
function MobileNav({icon:Icon,label,active,onClick}:{icon:any;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className={'flex flex-col items-center justify-center gap-1 text-[9px] '+(active?'font-medium text-[var(--brand-primary)]':'text-slate-400')}><Icon size={18}/><span>{label}</span></button>}

function BusinessBrand({name,logo}:{name:string;logo:string}){
  return <div className="flex min-w-0 items-center gap-2">
    {logo?<div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-200"><img src={logo} alt="" className="max-h-full max-w-full object-contain"/></div>:<MauzoLogo compact className="max-w-[150px] overflow-hidden"/>}
    {logo&&<div className="min-w-0"><div className="max-w-[160px] truncate text-[12px] font-semibold text-slate-800">{name}</div><div className="text-[8px] text-slate-300">MauzoPOS</div></div>}
  </div>
}

const themePalettes:Record<string,{primary:string;soft:string;border:string;bg:string;surface:string;text:string;muted:string;sidebar:string}>={
  green:{primary:'#22A53A',soft:'#ECF8EF',border:'#BDE7C5',bg:'#F7F9F7',surface:'#FFFFFF',text:'#172033',muted:'#64748B',sidebar:'#FBFCFB'},
  blue:{primary:'#2563EB',soft:'#EFF6FF',border:'#BFDBFE',bg:'#F6F8FC',surface:'#FFFFFF',text:'#172033',muted:'#64748B',sidebar:'#FAFBFD'},
  maroon:{primary:'#8B1E3F',soft:'#FBEFF3',border:'#E9BAC8',bg:'#FAF7F8',surface:'#FFFFFF',text:'#23171B',muted:'#74636A',sidebar:'#FDFBFC'},
  gold:{primary:'#B7791F',soft:'#FFF8E7',border:'#EED7A2',bg:'#FAF9F5',surface:'#FFFFFF',text:'#211D15',muted:'#716856',sidebar:'#FEFDF9'},
  dark:{primary:'#A3E635',soft:'#263119',border:'#3F4B2C',bg:'#0F1419',surface:'#171D23',text:'#F8FAFC',muted:'#94A3B8',sidebar:'#11171C'}
}
function applyTheme(key:string,mode:string,customAccent=''){
  const p=themePalettes[key]||themePalettes.green
  const primary=customAccent||p.primary
  const root=document.documentElement
  root.style.setProperty('--brand-primary',primary)
  root.style.setProperty('--brand-soft',p.soft)
  root.style.setProperty('--brand-border',p.border)
  root.style.setProperty('--app-bg',p.bg)
  root.style.setProperty('--app-surface',p.surface)
  root.style.setProperty('--app-text',p.text)
  root.style.setProperty('--app-muted',p.muted)
  root.style.setProperty('--app-sidebar',p.sidebar)
  root.dataset.theme=key
  root.dataset.mode=mode
}

function Login({onLogin,navigate}:{onLogin:(u:User)=>void;navigate:(path:string)=>void}){
  const [showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[forgot,setForgot]=useState(false),[sent,setSent]=useState(false)

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('')
    try{
      const form=e.currentTarget
      const email=String((form.elements.namedItem('email') as HTMLInputElement|null)?.value||'').trim()
      const password=String((form.elements.namedItem('password') as HTMLInputElement|null)?.value||'')
      if(!email||!password)throw new Error('Enter email and password')
      const j=await api('/login',{method:'POST',body:JSON.stringify({email,password})})
      localStorage.setItem('pos_token',j.token);onLogin(j.user)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  async function requestReset(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('')
    try{
      const fd=new FormData(e.currentTarget)
      const email=String(fd.get('email')||'').trim()
      if(!email)throw new Error('Enter your email')
      await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})})
      setSent(true)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="min-h-screen bg-[#f7f8fa] text-[#172033]">
    <header className="mx-auto flex h-[60px] max-w-[920px] items-center px-4 sm:px-5">
      <button onClick={()=>navigate('/')} className="mr-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500"><ArrowLeft size={15}/>Home</button>
      <MauzoLogo compact/>
      <button onClick={()=>navigate('/register')} className="ml-auto rounded-xl bg-[#22A53A] px-4 py-2.5 text-sm font-semibold text-white">Start Free Trial</button>
    </header>

    <main className="mx-auto flex max-w-[920px] justify-center px-3 pb-10 pt-4 sm:px-5 sm:pt-8">
      <section className="w-full max-w-[500px] rounded-2xl border border-slate-200 bg-white p-5 premium-shadow sm:p-7">
        <MauzoLogo compact/>
        {!forgot?<form onSubmit={submit} autoComplete="on" className="mt-7">
          <h1 className="text-[30px] font-semibold tracking-[-.035em]">Welcome back</h1>
          <div className="mt-1 text-sm text-slate-400">Login to MauzoPOS</div>

          <label className="mt-5 block text-[13px] font-medium text-slate-600">Email
            <div className="field !mt-1"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div>
          </label>

          <div className="mt-4 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Password</span><button type="button" onClick={()=>{setForgot(true);setError('');setSent(false)}} className="text-xs font-medium text-[#169B36]">Forgot password?</button></div>
          <div className="field !mt-1"><LockKeyhole size={17}/><input name="password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>

          {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#22A53A] text-[14px] font-medium text-white disabled:opacity-50">{busy?'Signing in…':'Login'} {!busy&&<ArrowRight size={17}/>}</button>
          <div className="mt-4 text-center text-xs text-slate-400">No account? <button type="button" onClick={()=>navigate('/register')} className="font-medium text-[#169B36]">Start free trial</button></div>
        </form>:<form onSubmit={requestReset} autoComplete="on" className="mt-7">
          <button type="button" onClick={()=>{setForgot(false);setError('');setSent(false)}} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><ArrowLeft size={14}/>Back</button>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Reset password</h1>
          <div className="mt-1 text-sm text-slate-400">Enter your account email</div>
          <label className="mt-6 block text-sm font-medium text-slate-700">Email
            <div className="field !mt-1"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div>
          </label>
          {sent&&<div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Reset link prepared. If email is not configured, SaaS Admin can generate it.</div>}
          {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={busy} className="mt-5 h-12 w-full rounded-lg bg-slate-900 text-[14px] font-medium text-white disabled:opacity-50">{busy?'Preparing…':'Send Reset Link'}</button>
        </form>}
      </section>
    </main>
  </div>
}
