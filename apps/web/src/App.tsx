import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingCart, ClipboardList, ChefHat, UtensilsCrossed, Package, Truck, ReceiptText, ShieldCheck, Bell, Search, Menu as MenuIcon, LogOut, X, UserRound, CheckCircle2, Boxes, UsersRound, Building2, Settings as SettingsIcon, Banknote } from 'lucide-react'
import { api, nice, type User } from './api'
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
  const [business,setBusiness]=useState('POS')

  useEffect(()=>{
    const token=localStorage.getItem('pos_token')
    if(!token){setLoading(false);return}
    api('/me').then(setUser).catch(()=>localStorage.removeItem('pos_token')).finally(()=>setLoading(false))
  },[])

  useEffect(()=>{
    if(!user)return
    api('/dashboard').then((d:any)=>{setCurrency(d.business?.currency||'UGX');setBusiness(d.business?.name||'POS')}).catch(()=>{})
  },[user])

  if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Loading POS…</div>
  if(!user)return <Login onLogin={setUser}/>

  const go=(v:ViewKey)=>{setView(v);setSidebar(false)}
  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900 flex">
    {sidebar&&<div onClick={()=>setSidebar(false)} className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"/>}
    <aside className={'fixed inset-y-0 left-0 z-50 w-[270px] bg-[#0b1220] text-white px-3 py-4 flex flex-col transition-transform lg:translate-x-0 '+(sidebar?'translate-x-0':'-translate-x-full')}>
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="h-11 w-11 rounded-2xl bg-emerald-400 text-slate-950 grid place-items-center font-black text-lg">M</div>
        <div className="min-w-0"><div className="font-bold truncate">{business}</div><div className="text-xs text-slate-500">Operations Suite</div></div>
        <button onClick={()=>setSidebar(false)} className="ml-auto lg:hidden text-slate-400"><X size={20}/></button>
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
    <div className="space-y-1">{rows.map(([name,Icon])=><button key={name} onClick={()=>go(name as ViewKey)} className={'w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition '+(view===name?'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10':'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon size={18}/><span>{name}</span></button>)}</div>
  </div>
}

function Login({onLogin}:{onLogin:(u:User)=>void}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{const j=await api('/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('pos_token',j.token);onLogin(j.user)}
    catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="min-h-screen bg-slate-950 grid lg:grid-cols-[1.15fr_.85fr]">
    <section className="hidden lg:flex relative overflow-hidden p-12 text-white flex-col justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(16,185,129,.35),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,.28),transparent_28%)]"/>
      <div className="relative inline-flex items-center gap-3"><div className="h-11 w-11 rounded-2xl bg-emerald-400 text-slate-950 grid place-items-center font-black">M</div><div><div className="font-bold text-lg">Modern POS</div><div className="text-xs text-slate-400">Restaurant & Retail Operations</div></div></div>
      <div className="relative max-w-2xl">
        <div className="text-emerald-300 font-semibold tracking-[.18em] uppercase text-xs mb-4">Operate beautifully</div>
        <h1 className="text-5xl xl:text-6xl font-black tracking-tight leading-[1.04]">A premium command center for every sale, table and branch.</h1>
        <p className="mt-6 text-lg text-slate-300 max-w-xl">Fast checkout, live kitchen tickets, approvals, inventory and purchasing — designed for teams that cannot afford friction.</p>
        <div className="mt-9 flex gap-4 text-sm text-slate-300"><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400"/>Restaurant-ready</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400"/>Multi-branch</span></div>
      </div>
      <div className="relative text-xs text-slate-500">Secure business operations platform</div>
    </section>
    <section className="bg-white flex items-center justify-center p-6 sm:p-10">
      <form onSubmit={submit} className="w-full max-w-md">
        <div className="text-sm font-semibold text-emerald-600">Welcome back</div>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Sign in to your workspace</h2>
        <p className="mt-2 text-slate-500">Continue to restaurant operations and administration.</p>
        <label className="block mt-8 text-sm font-semibold text-slate-700">Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500" placeholder="you@company.com"/>
        <label className="block mt-5 text-sm font-semibold text-slate-700">Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500" placeholder="••••••••"/>
        {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-slate-950 text-white py-3.5 font-semibold hover:bg-emerald-600 transition disabled:opacity-50">{busy?'Signing in…':'Sign in'}</button>
      </form>
    </section>
  </div>
}
