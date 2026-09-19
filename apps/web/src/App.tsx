import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Banknote, BarChart3, Bell, Boxes, ChefHat, ClipboardList, Eye, EyeOff, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu as MenuIcon, Package, ReceiptText, Search, Settings as SettingsIcon, ShieldCheck, ShoppingCart, Truck, UserRound, UsersRound, UtensilsCrossed, X, Building2 } from 'lucide-react'
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

export type ViewKey='Dashboard'|'POS'|'Sales'|'Orders'|'Kitchen'|'Restaurant'|'Customers'|'Approvals'|'Products'|'Inventory'|'Suppliers'|'Purchasing'|'Expenses'|'Cash Drawer'|'Reports'|'Staff'|'Branches'|'Settings'

const coreOperations=[['Dashboard',LayoutDashboard],['POS',ShoppingCart],['Sales',ReceiptText],['Customers',UsersRound]] as const
const restaurantOperations=[['Orders',ClipboardList],['Kitchen',ChefHat],['Restaurant',UtensilsCrossed]] as const
const administration=[['Approvals',ShieldCheck],['Products',Boxes],['Inventory',Package],['Suppliers',UsersRound],['Purchasing',Truck],['Expenses',ReceiptText],['Cash Drawer',Banknote],['Reports',BarChart3],['Staff',UsersRound],['Branches',Building2],['Settings',SettingsIcon]] as const

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<ViewKey>('Dashboard')
  const [sidebar,setSidebar]=useState(false)
  const [currency,setCurrency]=useState('UGX')
  const [business,setBusiness]=useState('Your Business')
  const [enabled,setEnabled]=useState<Set<string>>(new Set())
  const [businessRole,setBusinessRole]=useState('')
  const [permissions,setPermissions]=useState<Set<string>>(new Set())
  const [path,setPath]=useState(window.location.pathname)

  useEffect(()=>{const onPop=()=>setPath(window.location.pathname);window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{const token=localStorage.getItem('pos_token');if(!token){setLoading(false);return}api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))},[])
  useEffect(()=>{
    if(!user||user.role==='saas_admin')return
    Promise.all([api('/dashboard'),api('/modules'),api('/me/access')]).then(([d,m,a]:any[])=>{
      setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'Your Business')
      setEnabled(new Set(m.filter((x:any)=>x.core||x.enabled).map((x:any)=>x.code)))
      setBusinessRole(a.businessRole||user.role);setPermissions(new Set(a.permissions||[]))
    }).catch(()=>{})
  },[user])

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

  const go=(v:ViewKey)=>{setView(v);setSidebar(false)}
  const elevated=['owner','administrator','admin'].includes(businessRole)
  const can=(p:string)=>elevated||permissions.has(p)
  const roleHas=(roles:string[])=>elevated||roles.includes(businessRole)
  const visibleCore=coreOperations.filter(([name])=>{
    if(name==='Dashboard')return true
    if(name==='POS')return roleHas(['branch_manager','restaurant_manager','cashier'])
    if(name==='Sales')return roleHas(['branch_manager','restaurant_manager','cashier','accountant','auditor'])
    if(name==='Customers')return roleHas(['branch_manager','restaurant_manager','cashier','waiter','accountant'])
    return true
  })
  const hasRestaurant=enabled.has('restaurant')
  const visibleRestaurant=restaurantOperations.filter(([name])=>{
    if(name==='Orders')return roleHas(['branch_manager','restaurant_manager','cashier','waiter'])
    if(name==='Kitchen')return roleHas(['restaurant_manager','kitchen','bar'])
    if(name==='Restaurant')return roleHas(['branch_manager','restaurant_manager','waiter'])
    return true
  })
  const sharedAdmin=administration.filter(([name])=>{
    if(name==='Purchasing'&&!enabled.has('purchasing'))return false
    if(name==='Approvals')return roleHas(['branch_manager','restaurant_manager'])
    if(name==='Products'||name==='Inventory')return roleHas(['branch_manager','storekeeper'])
    if(name==='Suppliers'||name==='Purchasing')return roleHas(['branch_manager','storekeeper','accountant'])
    if(name==='Expenses')return roleHas(['branch_manager','accountant'])
    if(name==='Cash Drawer')return roleHas(['branch_manager','cashier','accountant'])
    if(name==='Reports')return can('reports.profit')
    if(name==='Staff')return can('staff.manage')
    if(name==='Branches'||name==='Settings')return can('settings.manage')
    return true
  })

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
    {sidebar&&<button aria-label="Close menu" onClick={()=>setSidebar(false)} className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden"/>}

    <aside className={'fixed inset-y-0 left-0 z-50 flex w-[228px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 '+(sidebar?'translate-x-0':'-translate-x-full')}>
      <div className="flex h-[60px] items-center border-b border-slate-100 px-4">
        <MauzoLogo compact/>
        <button onClick={()=>setSidebar(false)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"><X size={17}/></button>
      </div>
      <div className="px-3 pt-3">
        <div className="rounded-xl bg-[#f7f9f8] px-3 py-2.5">
          <div className="text-[9px] font-medium uppercase tracking-[.12em] text-slate-400">Workspace</div>
          <div className="mt-0.5 truncate text-[12px] font-medium text-slate-700">{business}</div>
        </div>
      </div>
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-4">
        <NavGroup title="Operations" rows={visibleCore} view={view} go={go}/>
        {hasRestaurant&&visibleRestaurant.length>0&&<NavGroup title="Restaurant" rows={visibleRestaurant} view={view} go={go}/>}
        <NavGroup title="Manage" rows={sharedAdmin} view={view} go={go}/>
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><UserRound size={15}/></div>
          <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium text-slate-700">{user.name}</div><div className="truncate text-[9px] text-slate-400">{nice(businessRole||user.role)}</div></div>
          <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut size={15}/></button>
        </div>
      </div>
    </aside>

    <main className="min-w-0 lg:ml-[228px]">
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-sm sm:px-5 lg:px-6">
        <button onClick={()=>setSidebar(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden"><MenuIcon size={18}/></button>
        <div className="min-w-0">
          <h1 className="truncate text-[16px] font-semibold tracking-[-.02em] text-slate-900">{view}</h1>
          <div className="hidden truncate text-[10px] text-slate-400 sm:block">{business}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 sm:grid"><Search size={16}/></button>
          <button className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Bell size={16}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#22A53A]"/></button>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 md:flex"><div className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-500"><UserRound size={14}/></div><div className="max-w-32"><div className="truncate text-[11px] font-medium">{user.name}</div><div className="truncate text-[9px] text-slate-400">{nice(businessRole||user.role)}</div></div></div>
        </div>
      </header>

      <div className="page-enter px-3 pb-24 pt-4 sm:px-5 lg:px-6 lg:pb-8">
        {view==='Dashboard'&&<Dashboard currency={currency} go={go}/>}
        {view==='POS'&&<POS currency={currency}/>}
        {view==='Sales'&&<Sales currency={currency}/>}
        {view==='Orders'&&hasRestaurant&&<Orders currency={currency}/>}
        {view==='Kitchen'&&hasRestaurant&&<Kitchen/>}
        {view==='Restaurant'&&hasRestaurant&&<Restaurant currency={currency}/>}
        {view==='Customers'&&<Customers currency={currency}/>}
        {view==='Approvals'&&<Approvals currency={currency}/>}
        {view==='Inventory'&&<Inventory currency={currency}/>}
        {view==='Purchasing'&&enabled.has('purchasing')&&<Purchasing currency={currency}/>}
        {view==='Expenses'&&<Expenses currency={currency}/>}
        {view==='Products'&&<Products currency={currency}/>}
        {view==='Suppliers'&&<Suppliers currency={currency}/>}
        {view==='Cash Drawer'&&<CashDrawer currency={currency}/>}
        {view==='Reports'&&<Reports currency={currency}/>}
        {view==='Staff'&&<Staff/>}
        {view==='Branches'&&<Branches/>}
        {view==='Settings'&&<Settings/>}
      </div>
    </main>

    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[64px] grid-cols-5 border-t border-slate-200 bg-white/98 px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <MobileNav icon={LayoutDashboard} label="Home" active={view==='Dashboard'} onClick={()=>go('Dashboard')}/>
      <MobileNav icon={ShoppingCart} label="POS" active={view==='POS'} onClick={()=>go('POS')}/>
      <MobileNav icon={ClipboardList} label="Orders" active={view==='Orders'} onClick={()=>hasRestaurant?go('Orders'):go('Sales')}/>
      <MobileNav icon={BarChart3} label="Reports" active={view==='Reports'} onClick={()=>can('reports.profit')?go('Reports'):go('Dashboard')}/>
      <MobileNav icon={MenuIcon} label="More" active={false} onClick={()=>setSidebar(true)}/>
    </nav>
  </div>
}

function NavGroup({title,rows,view,go}:{title:string;rows:readonly (readonly [string,any])[];view:ViewKey;go:(v:ViewKey)=>void}){return <div className="mt-4"><div className="mb-1 px-3 text-[9px] font-medium uppercase tracking-[.12em] text-slate-400">{title}</div><div className="space-y-0.5">{rows.map(([name,Icon])=><button key={name} onClick={()=>go(name as ViewKey)} className={'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] transition-colors '+(view===name?'bg-emerald-50 font-medium text-[#15803d]':'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900')}><Icon size={16}/><span>{name}</span></button>)}</div></div>}
function MobileNav({icon:Icon,label,active,onClick}:{icon:any;label:string;active:boolean;onClick:()=>void}){return <button onClick={onClick} className={'flex flex-col items-center justify-center gap-1 text-[9px] '+(active?'font-medium text-[#22A53A]':'text-slate-400')}><Icon size={18}/><span>{label}</span></button>}

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
