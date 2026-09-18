import { useEffect, useState } from 'react'
import { LayoutDashboard, ShoppingCart, ClipboardList, ChefHat, UtensilsCrossed, Package, Truck, ReceiptText, ShieldCheck, Bell, Search, Menu as MenuIcon, LogOut, X, UserRound, Boxes, UsersRound, Building2, Settings as SettingsIcon, Banknote, Mail, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { api, nice, type User } from './api'\nimport { MauzoLogo, MauzoMark } from './Brand'
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
    <div className="space-y-1">{rows.map(([name,Icon])=><button key={name} onClick={()=>go(name as ViewKey)} className={'w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition '+(view===name?'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10':'text-slate-300 hover:bg-white/5 hover:text-white')}><Icon size={18}/><span>{name}</span></button>)}</div>
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

  return <div className="relative min-h-screen overflow-hidden bg-[#f3fff1] px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-7">
    <div className="pointer-events-none absolute -right-28 -top-32 h-[430px] w-[430px] rounded-full border-[52px] border-[#b8f59c]/45"/>
    <div className="pointer-events-none absolute -bottom-40 -left-28 h-[380px] w-[380px] rounded-full border-[48px] border-[#b8f59c]/40"/>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,.96),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(187,247,208,.42),transparent_34%)]"/>

    <div className="relative mx-auto grid min-h-[calc(100vh-24px)] max-w-[1420px] lg:min-h-[calc(100vh-56px)] lg:grid-cols-[1.08fr_.92fr] lg:gap-4">
      <section className="relative hidden overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(145deg,#efffe9_0%,#dfffd2_46%,#f7fff4_100%)] p-7 shadow-[0_24px_80px_rgba(22,155,54,.12)] lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#9bf278]/25 blur-2xl"/>
        <div className="absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-white/80 blur-3xl"/>

        <div className="relative z-10 flex items-center justify-between">
          <MauzoLogo/>
          <div className="rounded-full border border-[#22A53A]/15 bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#169B36] shadow-sm">Restaurant • Retail • Multi-branch</div>
        </div>

        <div className="relative z-10 mt-8 flex flex-1 items-center justify-center">
          <div className="w-full max-w-[620px]">
            <div className="mb-5 max-w-[460px]">
              <div className="text-[11px] font-black uppercase tracking-[.2em] text-[#169B36]">Good business. Brighter tomorrow.</div>
              <h1 className="mt-2 text-[38px] font-black leading-[1.03] tracking-[-.045em] text-[#0F172A] xl:text-[46px]">Run every sale, table and stock movement beautifully.</h1>
              <p className="mt-3 max-w-[450px] text-sm leading-6 text-slate-600">Fast checkout, live kitchen orders, purchasing, approvals and stock control in one modern workspace.</p>
            </div>

            <div className="relative mx-auto mt-5 w-[92%] rounded-[28px] border border-[#0F172A]/10 bg-[#0F172A] p-3 shadow-[0_35px_70px_rgba(15,23,42,.24)]">
              <div className="rounded-[20px] bg-[#f8fafc] p-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F172A]"><MauzoMark className="h-5 w-5"/></div>
                  <div className="h-7 flex-1 rounded-lg bg-white px-3 text-[10px] leading-7 text-slate-400 shadow-sm">Search products...</div>
                  <div className="rounded-lg bg-[#22A53A] px-3 py-2 text-[10px] font-black text-white">POS</div>
                </div>
                <div className="mt-3 grid grid-cols-[90px_1fr_145px] gap-3">
                  <div className="space-y-2 rounded-xl bg-[#0F172A] p-2">
                    {['Sales','Orders','Products','Reports'].map((x,i)=><div key={x} className={'rounded-lg px-2 py-2 text-[9px] font-bold '+(i===0?'bg-[#22A53A] text-white':'text-slate-400')}>{x}</div>)}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['Coffee','Burger','Chicken','Juice','Rice','Dessert'].map((x,i)=><div key={x} className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                      <div className={'h-10 rounded-lg '+['bg-amber-100','bg-orange-100','bg-yellow-100','bg-emerald-100','bg-lime-100','bg-rose-100'][i]}/>
                      <div className="mt-2 text-[9px] font-bold text-slate-700">{x}</div>
                      <div className="mt-1 text-[8px] font-semibold text-[#169B36]">UGX {(5000+i*1500).toLocaleString()}</div>
                    </div>)}
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <div className="text-[9px] font-black text-slate-900">Current Sale</div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-[8px] text-slate-500"><span>2 × Coffee</span><b>10,000</b></div>
                      <div className="flex justify-between text-[8px] text-slate-500"><span>1 × Burger</span><b>6,500</b></div>
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-2">
                      <div className="flex justify-between text-[8px] text-slate-400"><span>Total</span><span>3 items</span></div>
                      <div className="mt-1 text-sm font-black text-slate-950">UGX 16,500</div>
                    </div>
                    <div className="mt-3 rounded-lg bg-[#22A53A] py-2 text-center text-[8px] font-black text-white">Complete Sale</div>
                  </div>
                </div>
              </div>
              <div className="mx-auto h-4 w-40 rounded-b-xl bg-slate-700"/>
              <div className="mx-auto h-2 w-52 rounded-full bg-slate-900/70 blur-[1px]"/>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm"><div className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-[#22A53A]"><ShoppingCart size={18}/></div><div><div className="text-xs font-black text-slate-900">Easy Sales</div><div className="text-[10px] text-slate-500">In seconds</div></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm"><div className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-[#22A53A]"><Package size={18}/></div><div><div className="text-xs font-black text-slate-900">Manage Stock</div><div className="text-[10px] text-slate-500">In real time</div></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/85 px-4 py-3 shadow-sm"><div className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-[#22A53A]"><UsersRound size={18}/></div><div><div className="text-xs font-black text-slate-900">Grow Business</div><div className="text-[10px] text-slate-500">Together</div></div></div>
        </div>
      </section>

      <section className="flex items-center justify-center py-5 lg:py-0">
        <form onSubmit={submit} className="w-full max-w-[590px] rounded-[32px] border border-white/90 bg-white/95 px-6 py-8 shadow-[0_30px_90px_rgba(22,155,54,.12)] backdrop-blur sm:px-10 sm:py-10 xl:px-14 xl:py-14">
          <div className="mb-9 lg:hidden"><MauzoLogo/></div>
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-[#22A53A]">Secure workspace access</div>
          <h2 className="mt-2 text-4xl font-black tracking-[-.045em] text-[#0F172A] sm:text-[46px]">Login</h2>
          <p className="mt-2 text-base text-slate-500">Welcome back to <span className="font-bold text-slate-700">MauzoPOS</span></p>

          <label className="mt-9 block text-sm font-bold text-[#0F172A]">Email address</label>
          <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
            <Mail size={19} className="text-slate-400"/>
            <input autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="you@example.com"/>
          </div>

          <div className="mt-5 flex items-center justify-between"><label className="text-sm font-bold text-[#0F172A]">Password</label><button type="button" className="text-xs font-bold text-[#169B36] hover:text-[#0F172A]">Forgot password?</button></div>
          <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100">
            <LockKeyhole size={19} className="text-slate-400"/>
            <input autoComplete="current-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Enter your password"/>
            <button type="button" onClick={()=>setShowPassword(v=>!v)} className="text-slate-400 hover:text-slate-700" aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
          </div>

          {error&&<div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

          <button disabled={busy} className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(90deg,#37C516,#22A53A)] text-base font-black text-white shadow-[0_14px_30px_rgba(34,165,58,.22)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
            {busy?'Signing in…':'Login'} {!busy&&<ArrowRight size={19}/>}
          </button>

          <div className="mt-7 flex items-center gap-3 text-[11px] text-slate-400"><div className="h-px flex-1 bg-slate-200"/><span>Protected business access</span><div className="h-px flex-1 bg-slate-200"/></div>
          <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">Need access to this workspace? <span className="font-bold text-[#169B36]">Contact your administrator</span></div>

          <div className="mt-8 text-center text-[10px] text-slate-400">MauzoPOS · Sell smarter. Grow faster.</div>
        </form>
      </section>
    </div>
  </div>
}
