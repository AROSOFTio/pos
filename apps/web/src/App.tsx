import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingCart, ClipboardList, ChefHat, UtensilsCrossed, Package, Truck, ReceiptText, ShieldCheck, Bell, Search, Menu as MenuIcon, LogOut, X, UserRound, Boxes, UsersRound, Building2, Settings as SettingsIcon, Banknote, Mail, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { api, nice, type User } from './api'
import { MauzoLogo } from './Brand'
import Marketing from './Marketing'
import Register from './Register'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
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

export type ViewKey='Dashboard'|'POS'|'Orders'|'Kitchen'|'Restaurant'|'Customers'|'Approvals'|'Products'|'Inventory'|'Suppliers'|'Purchasing'|'Expenses'|'Cash Drawer'|'Branches'|'Settings'

const operations=[['Dashboard',LayoutDashboard],['POS',ShoppingCart],['Orders',ClipboardList],['Kitchen',ChefHat],['Restaurant',UtensilsCrossed],['Customers',UsersRound]] as const
const administration=[['Approvals',ShieldCheck],['Products',Boxes],['Inventory',Package],['Suppliers',UsersRound],['Purchasing',Truck],['Expenses',ReceiptText],['Cash Drawer',Banknote],['Branches',Building2],['Settings',SettingsIcon]] as const

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<ViewKey>('Dashboard')
  const [sidebar,setSidebar]=useState(false)
  const [currency,setCurrency]=useState('UGX')
  const [business,setBusiness]=useState('Your Business')
  const [path,setPath]=useState(window.location.pathname)

  useEffect(()=>{const onPop=()=>setPath(window.location.pathname);window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])

  useEffect(()=>{
    const token=localStorage.getItem('pos_token')
    if(!token){setLoading(false);return}
    api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{
    if(!user)return
    api('/dashboard').then((d:any)=>{setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'Your Business')}).catch(()=>{})
  },[user])

  const navigate=(next:string)=>{window.history.pushState({},'',next);setPath(next)}
  const authenticated=(u:User)=>{window.history.replaceState({},'', '/app');setPath('/app');setUser(u)}

  if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Loading MauzoPOS…</div>
  if(!user){
    if(path==='/register')return <Register onLogin={authenticated} navigate={navigate}/>
    if(path==='/login')return <Login onLogin={authenticated} navigate={navigate}/>
    return <Marketing navigate={navigate}/>
  }

  const go=(v:ViewKey)=>{setView(v);setSidebar(false)}
  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex">
    {sidebar&&<div onClick={()=>setSidebar(false)} className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"/>}
    <aside className={'fixed inset-y-0 left-0 z-50 w-[270px] bg-[#0b1220] text-white px-3 py-4 flex flex-col transition-transform lg:translate-x-0 '+(sidebar?'translate-x-0':'-translate-x-full')}>
      <div className="px-3 py-2">
        <div className="flex items-center gap-3">
          <MauzoLogo compact light/>
          <button onClick={()=>setSidebar(false)} className="ml-auto lg:hidden text-slate-400"><X size={20}/></button>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Workspace</div>
          <div className="mt-1 text-xs font-semibold text-slate-200 truncate">{business}</div>
        </div>
      </div>
      <nav className="overflow-y-auto flex-1 px-1">
        <NavGroup title="Restaurant Operations" rows={operations} view={view} go={go}/>
        <NavGroup title="Administration" rows={administration} view={view} go={go}/>
      </nav>
      <div className="m-2 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-emerald-400"/>System protected</div>
        <div className="mt-1 text-xs text-slate-500">Approvals & audit controls active</div>
      </div>
    </aside>

    <main className="min-w-0 flex-1 lg:ml-[270px]">
      <header className="sticky top-0 z-30 glass border-b border-slate-200/70 px-4 sm:px-6 lg:px-8 h-[74px] flex items-center gap-4">
        <button onClick={()=>setSidebar(true)} className="lg:hidden h-10 w-10 rounded-xl border border-slate-200 grid place-items-center"><MenuIcon size={19}/></button>
        <div><div className="text-xs text-slate-500">{business}</div><h1 className="font-black text-lg tracking-tight">{view}</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden sm:grid h-10 w-10 rounded-xl border border-slate-200 bg-white place-items-center text-slate-500"><Search size={17}/></button>
          <button className="h-10 w-10 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-500 relative"><Bell size={17}/><span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500"/></button>
          <div className="ml-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
            <div className="h-8 w-8 rounded-lg bg-slate-100 grid place-items-center"><UserRound size={16}/></div>
            <div className="hidden md:block max-w-36"><div className="text-xs font-bold truncate">{user.name}</div><div className="text-[10px] text-slate-500 truncate">{nice(user.role)}</div></div>
            <button onClick={()=>{localStorage.removeItem('pos_token');window.history.replaceState({},'', '/login');location.reload()}} className="p-1.5 text-slate-400 hover:text-red-500"><LogOut size={16}/></button>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {view==='Dashboard'&&<Dashboard currency={currency} go={go}/>}
        {view==='POS'&&<POS currency={currency}/>}
        {view==='Orders'&&<Orders currency={currency}/>}
        {view==='Kitchen'&&<Kitchen/>}
        {view==='Restaurant'&&<Restaurant currency={currency}/>} 
        {view==='Customers'&&<Customers currency={currency}/>}
        {view==='Approvals'&&<Approvals currency={currency}/>}
        {view==='Inventory'&&<Inventory currency={currency}/>}
        {view==='Purchasing'&&<Purchasing currency={currency}/>}
        {view==='Expenses'&&<Expenses currency={currency}/>} 
        {view==='Products'&&<Products currency={currency}/>} 
        {view==='Suppliers'&&<Suppliers currency={currency}/>} 
        {view==='Cash Drawer'&&<CashDrawer currency={currency}/>} 
        {view==='Branches'&&<Branches/>} 
        {view==='Settings'&&<Settings/>}
      </div>
    </main>
  </div>
}

function NavGroup({title,rows,view,go}:{title:string;rows:readonly (readonly [string,any])[];view:ViewKey;go:(v:ViewKey)=>void}){
  return <div className="mt-7">
    <div className="px-4 mb-2 text-[10px] font-bold tracking-[.16em] uppercase text-slate-500">{title}</div>
    <div className="space-y-1">{rows.map(([name,Icon])=><button key={name} onClick={()=>go(name as ViewKey)} className={'w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition '+(view===name?'bg-[#22A53A] text-white shadow-lg shadow-green-900/10':'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon size={18}/><span>{name}</span></button>)}</div>
  </div>
}

function Login({onLogin,navigate}:{onLogin:(u:User)=>void;navigate:(path:string)=>void}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{
      const j=await api('/login',{method:'POST',body:JSON.stringify({email:email.trim(),password})})
      localStorage.setItem('pos_token',j.token)
      onLogin(j.user)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="min-h-screen bg-[linear-gradient(180deg,#f4fff1_0%,#ffffff_75%)] text-[#0F172A]">
    <header className="mx-auto flex h-[78px] max-w-[1180px] items-center px-5 lg:px-8">
      <button onClick={()=>navigate('/')} className="mr-4 text-sm font-bold text-slate-500 hover:text-slate-900">← Back</button>
      <MauzoLogo compact/>
      <button onClick={()=>navigate('/register')} className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Start Free Trial</button>
    </header>

    <main className="mx-auto flex max-w-[1180px] items-start justify-center px-5 pb-16 pt-7 lg:px-8">
      <div className="grid w-full max-w-[980px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,.10)] lg:grid-cols-[.92fr_1.08fr]">
        <section className="relative hidden min-h-[600px] bg-[#0f172a] lg:block">
          <img src="/brand/mauzopos-login-hero.webp" alt="MauzoPOS" className="absolute inset-0 h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-7 pt-24">
            <div className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">Welcome back</div>
            <div className="mt-2 text-2xl font-black text-white">Your business, one clean workspace.</div>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="text-xs font-black uppercase tracking-[.18em] text-[#22A53A]">Secure sign in</div>
          <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Login to MauzoPOS</h1>
          <p className="mt-2 text-sm text-slate-500">Access your sales, restaurant, stock and management workspace.</p>

          <form onSubmit={submit} className="mt-8">
            <label className="text-sm font-bold text-slate-700">Email address</label>
            <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
              <Mail size={18} className="text-slate-400"/>
              <input autoFocus autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-w-0 flex-1 outline-none" placeholder="you@example.com"/>
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-700">Password</label>
            <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
              <LockKeyhole size={18} className="text-slate-400"/>
              <input autoComplete="current-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="min-w-0 flex-1 outline-none" placeholder="Enter your password"/>
              <button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400 hover:text-slate-700">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
            </div>

            {error&&<div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            <button disabled={busy||!email.trim()||!password} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#22A53A] font-black text-white shadow-[0_12px_28px_rgba(34,165,58,.20)] disabled:opacity-40">
              {busy?'Signing in…':'Login'} {!busy&&<ArrowRight size={18}/>}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
            New to MauzoPOS? <button onClick={()=>navigate('/register')} className="font-black text-[#169B36]">Start a free trial</button> · No credit card required.
          </div>
        </section>
      </div>
    </main>
  </div>
}
