import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingCart, ClipboardList, ChefHat, UtensilsCrossed, Package, Truck, ReceiptText, ShieldCheck, Bell, Search, Menu as MenuIcon, LogOut, X, UserRound, Boxes, UsersRound, Building2, Settings as SettingsIcon, Banknote, Mail, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { api, nice, type User } from './api'
import { MauzoLogo, MauzoMark } from './Brand'
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

export type ViewKey='Dashboard'|'POS'|'Orders'|'Kitchen'|'Restaurant'|'Approvals'|'Products'|'Inventory'|'Suppliers'|'Purchasing'|'Expenses'|'Cash Drawer'|'Branches'|'Settings'

const operations=[['Dashboard',LayoutDashboard],['POS',ShoppingCart],['Orders',ClipboardList],['Kitchen',ChefHat],['Restaurant',UtensilsCrossed]] as const
const administration=[['Approvals',ShieldCheck],['Products',Boxes],['Inventory',Package],['Suppliers',UsersRound],['Purchasing',Truck],['Expenses',ReceiptText],['Cash Drawer',Banknote],['Branches',Building2],['Settings',SettingsIcon]] as const

export default function App(){
  const [user,setUser]=useState<User|null>(null)
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<ViewKey>('Dashboard')
  const [sidebar,setSidebar]=useState(false)
  const [currency,setCurrency]=useState('UGX')
  const [business,setBusiness]=useState('Your Business')

  useEffect(()=>{
    const token=localStorage.getItem('pos_token')
    if(!token){setLoading(false);return}
    api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{
    if(!user)return
    api('/dashboard').then((d:any)=>{setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'Your Business')}).catch(()=>{})
  },[user])

  if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Loading MauzoPOS…</div>
  if(!user)return <Login onLogin={setUser}/>

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
            <button onClick={()=>{localStorage.removeItem('pos_token');location.reload()}} className="p-1.5 text-slate-400 hover:text-red-500"><LogOut size={16}/></button>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {view==='Dashboard'&&<Dashboard currency={currency} go={go}/>}
        {view==='POS'&&<POS currency={currency}/>}
        {view==='Orders'&&<Orders currency={currency}/>}
        {view==='Kitchen'&&<Kitchen/>}
        {view==='Restaurant'&&<Restaurant currency={currency}/>}
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

function Login({onLogin}:{onLogin:(u:User)=>void}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{
      const j=await api('/login',{method:'POST',body:JSON.stringify({email,password})})
      localStorage.setItem('pos_token',j.token)
      onLogin(j.user)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }

  return <div className="relative min-h-screen overflow-hidden bg-[#f4fff1] p-3 sm:p-5 lg:p-7">
    <div className="pointer-events-none absolute -right-28 -top-28 h-[430px] w-[430px] rounded-full border-[54px] border-[#b9f89d]/45"/>
    <div className="pointer-events-none absolute -bottom-36 -left-24 h-[360px] w-[360px] rounded-full border-[48px] border-[#b9f89d]/40"/>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.98),transparent_34%),radial-gradient(circle_at_88%_78%,rgba(187,247,208,.46),transparent_32%)]"/>

    <div className="relative mx-auto grid min-h-[calc(100vh-24px)] max-w-[1460px] items-stretch gap-4 lg:min-h-[calc(100vh-56px)] lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden rounded-[32px] border border-white/90 bg-white shadow-[0_28px_90px_rgba(22,155,54,.13)] lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,#edffe8_0%,#dfffd5_45%,#f8fff6_100%)]"/>
        <img
          src="/brand/mauzopos-login-hero.webp"
          alt="MauzoPOS business owner using the POS"
          className="relative h-full w-full object-cover object-center"
          onError={e=>{e.currentTarget.style.display='none'}}
        />
      </section>

      <section className="flex items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-[620px] rounded-[32px] border border-white/90 bg-white/96 px-6 py-8 shadow-[0_30px_90px_rgba(22,155,54,.12)] backdrop-blur sm:px-10 sm:py-11 xl:px-14 xl:py-14">
          <div className="mb-8 lg:hidden"><MauzoLogo/></div>
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-[#22A53A]">Secure workspace access</div>
          <h2 className="mt-2 text-4xl font-black tracking-[-.045em] text-[#0F172A] sm:text-[48px]">Login</h2>
          <p className="mt-2 text-base text-slate-500">Welcome back to <span className="font-bold text-slate-800">MauzoPOS</span></p>

          <label className="mt-9 block text-sm font-bold text-[#0F172A]">Email address</label>
          <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
            <Mail size={19} className="text-slate-400"/>
            <input autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="you@example.com"/>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <label className="text-sm font-bold text-[#0F172A]">Password</label>
            <button type="button" className="text-xs font-bold text-[#169B36] hover:text-[#0F172A]">Forgot password?</button>
          </div>
          <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
            <LockKeyhole size={19} className="text-slate-400"/>
            <input autoComplete="current-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Enter your password"/>
            <button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400 hover:text-slate-700" aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
          </div>

          {error&&<div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={busy} className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(90deg,#37C516,#22A53A)] text-base font-black text-white shadow-[0_14px_30px_rgba(34,165,58,.22)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
            {busy?'Signing in…':'Login'} {!busy&&<ArrowRight size={19}/>}
          </button>

          <div className="mt-7 flex items-center gap-3 text-[11px] text-slate-400">
            <div className="h-px flex-1 bg-slate-200"/><span>Protected business access</span><div className="h-px flex-1 bg-slate-200"/>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-xs font-black text-slate-900">Fast Sales</div><div className="mt-1 text-[10px] text-slate-500">Counter & restaurant</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-xs font-black text-slate-900">Live Stock</div><div className="mt-1 text-[10px] text-slate-500">Real-time control</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-center"><div className="text-xs font-black text-slate-900">Managed Growth</div><div className="mt-1 text-[10px] text-slate-500">Branches & approvals</div></div>
          </div>

          <div className="mt-7 text-center text-[10px] font-medium text-slate-400">MauzoPOS · Sell smarter. Grow faster.</div>
        </form>
      </section>
    </div>
  </div>
}
