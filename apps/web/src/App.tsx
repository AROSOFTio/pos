import { BarChart3, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Banknote, Bell, Boxes, ChefHat, ClipboardList, Eye, EyeOff, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu as MenuIcon, Package, ReceiptText, Search, Settings as SettingsIcon, ShieldCheck, ShoppingCart, Truck, UserRound, UsersRound, UtensilsCrossed, X, Building2 } from 'lucide-react'
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
  const [path,setPath]=useState(window.location.pathname)

  useEffect(()=>{const onPop=()=>setPath(window.location.pathname);window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  useEffect(()=>{const token=localStorage.getItem('pos_token');if(!token){setLoading(false);return}api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))},[])
  useEffect(()=>{
    if(!user||user.role==='saas_admin')return
    Promise.all([api('/dashboard'),api('/modules')]).then(([d,m]:any[])=>{
      setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'Your Business')
      setEnabled(new Set(m.filter((x:any)=>x.core||x.enabled).map((x:any)=>x.code)))
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

  if(user.role==='saas_admin')return <div className="min-h-screen bg-[#f4f7fb]">
    <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-slate-200 bg-white px-5 lg:px-8"><MauzoLogo compact/><div className="ml-5 hidden border-l border-slate-200 pl-5 sm:block"><div className="text-[10px] font-black uppercase tracking-[.15em] text-[#22A53A]">Platform Owner</div><div className="text-sm font-bold text-slate-700">SaaS Administration</div></div><div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><div className="text-xs font-bold">{user.name}</div><div className="text-[10px] text-slate-400">{user.email}</div></div><button onClick={logout} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-red-600"><LogOut size={17}/></button></div></header>
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8"><SaaSAdmin/></main>
  </div>

  const go=(v:ViewKey)=>{setView(v);setSidebar(false)}
  const sharedAdmin=administration.filter(([name])=>name!=='Purchasing'||enabled.has('purchasing'))
  const hasRestaurant=enabled.has('restaurant')

  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex">
    {sidebar&&<div onClick={()=>setSidebar(false)} className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"/>}
    <aside className={'fixed inset-y-0 left-0 z-50 w-[270px] bg-[#0b1220] text-white px-3 py-4 flex flex-col transition-transform lg:translate-x-0 '+(sidebar?'translate-x-0':'-translate-x-full')}>
      <div className="px-3 py-2"><div className="flex items-center gap-3"><MauzoLogo compact light/><button onClick={()=>setSidebar(false)} className="ml-auto lg:hidden text-slate-400"><X size={20}/></button></div><div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Workspace</div><div className="mt-1 truncate text-xs font-semibold text-slate-200">{business}</div></div></div>
      <nav className="overflow-y-auto flex-1 px-1">
        <NavGroup title="Business Operations" rows={coreOperations} view={view} go={go}/>
        {hasRestaurant&&<NavGroup title="Restaurant Operations" rows={restaurantOperations} view={view} go={go}/>}
        <NavGroup title="Administration" rows={sharedAdmin} view={view} go={go}/>
      </nav>
      <div className="m-2 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-emerald-400"/>Protected workspace</div><div className="mt-1 text-xs text-slate-500">{hasRestaurant?'Restaurant module active':'Core POS modules active'}</div></div>
    </aside>

    <main className="min-w-0 flex-1 lg:ml-[270px]">
      <header className="sticky top-0 z-30 glass border-b border-slate-200/70 px-4 sm:px-6 lg:px-8 h-[74px] flex items-center gap-4">
        <button onClick={()=>setSidebar(true)} className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 grid place-items-center"><MenuIcon size={19}/></button>
        <div><div className="text-xs text-slate-500">{business}</div><h1 className="font-black text-lg tracking-tight">{view}</h1></div>
        <div className="ml-auto flex items-center gap-2"><button className="hidden sm:grid h-10 w-10 rounded-xl border border-slate-200 bg-white place-items-center text-slate-500"><Search size={17}/></button><button className="h-10 w-10 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 relative"><Bell size={17}/><span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500"/></button><div className="ml-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-1.5"><div className="h-8 w-8 rounded-lg bg-slate-100 grid place-items-center"><UserRound size={16}/></div><div className="hidden md:block max-w-36"><div className="text-xs font-bold truncate">{user.name}</div><div className="text-[10px] text-slate-500 truncate">{nice(user.role)}</div></div><button onClick={logout} className="p-1.5 text-slate-400 hover:text-red-500"><LogOut size={16}/></button></div></div>
      </header>
      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
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
  </div>
}

function NavGroup({title,rows,view,go}:{title:string;rows:readonly (readonly [string,any])[];view:ViewKey;go:(v:ViewKey)=>void}){return <div className="mt-7"><div className="px-4 mb-2 text-[10px] font-bold tracking-[.16em] uppercase text-slate-500">{title}</div><div className="space-y-1">{rows.map(([name,Icon])=><button key={name} onClick={()=>go(name as ViewKey)} className={'w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition '+(view===name?'bg-[#22A53A] text-white shadow-lg shadow-green-900/10':'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon size={18}/><span>{name}</span></button>)}</div></div>}

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

  return <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(34,165,58,.08),transparent_30%),#f7faf7] text-[#0f172a]">
    <header className="mx-auto flex h-[70px] max-w-[1080px] items-center px-5">
      <button onClick={()=>navigate('/')} className="mr-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500"><ArrowLeft size={15}/>Home</button>
      <MauzoLogo compact/>
      <button onClick={()=>navigate('/register')} className="ml-auto rounded-xl bg-[#22A53A] px-4 py-2.5 text-sm font-semibold text-white">Start Free Trial</button>
    </header>

    <main className="mx-auto flex max-w-[1080px] justify-center px-5 pb-14 pt-8">
      <section className="w-full max-w-[520px] rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.09)] sm:p-8">
        <MauzoLogo compact/>
        {!forgot?<form onSubmit={submit} autoComplete="on" className="mt-7">
          <h1 className="text-[32px] font-semibold tracking-[-.04em]">Welcome back</h1>
          <div className="mt-1 text-sm text-slate-400">Login to MauzoPOS</div>

          <label className="mt-6 block text-sm font-medium text-slate-700">Email
            <div className="field !mt-1"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div>
          </label>

          <div className="mt-4 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">Password</span><button type="button" onClick={()=>{setForgot(true);setError('');setSent(false)}} className="text-xs font-semibold text-[#169B36]">Forgot password?</button></div>
          <div className="field !mt-1"><LockKeyhole size={17}/><input name="password" type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>

          {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={busy} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#22A53A] font-semibold text-white disabled:opacity-50">{busy?'Signing in…':'Login'} {!busy&&<ArrowRight size={17}/>}</button>
          <div className="mt-4 text-center text-xs text-slate-400">No account? <button type="button" onClick={()=>navigate('/register')} className="font-semibold text-[#169B36]">Start free trial</button></div>
        </form>:<form onSubmit={requestReset} autoComplete="on" className="mt-7">
          <button type="button" onClick={()=>{setForgot(false);setError('');setSent(false)}} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><ArrowLeft size={14}/>Back</button>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Reset password</h1>
          <div className="mt-1 text-sm text-slate-400">Enter your account email</div>
          <label className="mt-6 block text-sm font-medium text-slate-700">Email
            <div className="field !mt-1"><Mail size={17}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div>
          </label>
          {sent&&<div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Reset link prepared. If email is not configured, SaaS Admin can generate it.</div>}
          {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={busy} className="mt-6 h-13 w-full rounded-xl bg-slate-950 font-semibold text-white disabled:opacity-50">{busy?'Preparing…':'Send Reset Link'}</button>
        </form>}
      </section>
    </main>
  </div>
}
