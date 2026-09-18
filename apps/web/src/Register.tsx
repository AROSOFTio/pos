import { useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Eye, EyeOff, LockKeyhole, Mail, Store, UserRound } from 'lucide-react'
import { api, type User } from './api'
import { MauzoLogo } from './Brand'

const currencyByCountry:Record<string,string>={Uganda:'UGX',Kenya:'KES',Ghana:'GHS',Nigeria:'NGN',Rwanda:'RWF'}

export default function Register({onLogin,navigate}:{onLogin:(u:User)=>void;navigate:(path:string)=>void}){
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[businessName,setBusinessName]=useState(''),[country,setCountry]=useState('Uganda'),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('')
    try{
      const j=await api('/register',{method:'POST',body:JSON.stringify({name,email,password,businessName,country,currency:currencyByCountry[country]||'UGX'})})
      localStorage.setItem('pos_token',j.token);history.replaceState({},'', '/app');onLogin(j.user)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="min-h-screen bg-[linear-gradient(180deg,#f4fff1_0%,#ffffff_70%)]">
    <header className="mx-auto flex h-[78px] max-w-[1180px] items-center px-5 lg:px-8">
      <button onClick={()=>navigate('/')} className="mr-4 rounded-xl p-2 text-slate-500 hover:bg-white"><ArrowLeft size={18}/></button><MauzoLogo compact/>
      <button onClick={()=>navigate('/login')} className="ml-auto text-sm font-bold text-slate-600">Already have an account? <span className="text-[#169B36]">Login</span></button>
    </header>
    <main className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-16 pt-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
      <section className="hidden rounded-[30px] bg-[#0f172a] p-8 text-white lg:block">
        <div className="text-xs font-black uppercase tracking-[.18em] text-emerald-400">14-day free trial</div>
        <h1 className="mt-4 text-4xl font-black tracking-[-.04em]">Start running your business with MauzoPOS.</h1>
        <p className="mt-4 leading-7 text-slate-300">Create your workspace now and explore sales, restaurant operations, stock, customers, purchasing and approvals.</p>
        <div className="mt-8 space-y-4 text-sm font-semibold text-slate-200">
          {['No credit card required','Full trial workspace','Cancel anytime','Secure multi-user access'].map(x=><div key={x} className="flex items-center gap-3"><BadgeCheck size={18} className="text-emerald-400"/>{x}</div>)}
        </div>
      </section>
      <form onSubmit={submit} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:p-9">
        <div className="text-xs font-black uppercase tracking-[.18em] text-[#22A53A]">Start free</div>
        <h2 className="mt-2 text-4xl font-black tracking-[-.04em]">Create your MauzoPOS workspace</h2>
        <p className="mt-2 text-sm text-slate-500">No credit card required.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Field label="Your name" icon={UserRound}><input value={name} onChange={e=>setName(e.target.value)} className="flex-1 outline-none" placeholder="Full name"/></Field>
          <Field label="Email address" icon={Mail}><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="flex-1 outline-none" placeholder="you@example.com"/></Field>
          <Field label="Business name" icon={Store}><input value={businessName} onChange={e=>setBusinessName(e.target.value)} className="flex-1 outline-none" placeholder="Business / restaurant"/></Field>
          <label className="text-sm font-bold text-slate-700">Country<select value={country} onChange={e=>setCountry(e.target.value)} className="control"><option>Uganda</option><option>Kenya</option><option>Ghana</option><option>Nigeria</option><option>Rwanda</option></select></label>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">Password
          <div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100"><LockKeyhole size={18} className="text-slate-400"/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="flex-1 outline-none" placeholder="Minimum 10 characters"/><button type="button" onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        </label>
        {error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        <button disabled={busy||!name.trim()||!email.trim()||!businessName.trim()||password.length<10} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#22A53A] font-black text-white disabled:opacity-40">{busy?'Creating workspace…':'Start Free Trial'} {!busy&&<ArrowRight size={18}/>}</button>
        <div className="mt-4 text-center text-xs text-slate-400">By continuing, you create a secure trial workspace. No credit card is requested.</div>
      </form>
    </main>
  </div>
}
function Field({label,icon:Icon,children}:{label:string;icon:any;children:any}){return <label className="text-sm font-bold text-slate-700">{label}<div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100"><Icon size={18} className="text-slate-400"/>{children}</div></label>}
