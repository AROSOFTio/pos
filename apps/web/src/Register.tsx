import { useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { api, type User } from './api'
import { MauzoLogo } from './Brand'

const currencyByCountry:Record<string,string>={Uganda:'UGX',Kenya:'KES',Ghana:'GHS',Nigeria:'NGN',Rwanda:'RWF'}

export default function Register({onLogin,navigate}:{onLogin:(u:User)=>void;navigate:(path:string)=>void}){
  const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('')
    try{
      const fd=new FormData(e.currentTarget)
      const payload={
        name:String(fd.get('name')||'').trim(),
        email:String(fd.get('email')||'').trim(),
        businessName:String(fd.get('businessName')||'').trim(),
        country:String(fd.get('country')||'Uganda'),
        businessType:String(fd.get('businessType')||'restaurant'),
        password:String(fd.get('password')||''),
      }
      if(!payload.name||!payload.email||!payload.businessName||!payload.password)throw new Error('Complete all required fields')
      if(payload.password.length<10)throw new Error('Password must be at least 10 characters')
      const j=await api('/register',{method:'POST',body:JSON.stringify({...payload,currency:currencyByCountry[payload.country]||'UGX'})})
      localStorage.setItem('pos_token',j.token);history.replaceState({},'', '/app');onLogin(j.user)
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="min-h-screen bg-[#f7faf7] text-[#0f172a]">
    <header className="mx-auto flex h-[70px] max-w-[1080px] items-center px-5">
      <button onClick={()=>navigate('/')} className="mr-4 rounded-xl p-2 text-slate-500 hover:bg-white"><ArrowLeft size={17}/></button>
      <MauzoLogo compact/>
      <button onClick={()=>navigate('/login')} className="ml-auto text-sm font-medium text-slate-600">Login</button>
    </header>
    <main className="mx-auto max-w-[720px] px-5 pb-14 pt-6">
      <form onSubmit={submit} autoComplete="on" className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_22px_65px_rgba(15,23,42,.08)] sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[.16em] text-[#22A53A]">14-day free trial</div>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-.04em]">Create workspace</h1>
        <div className="mt-1 text-sm text-slate-400">No credit card</div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Your name"><input name="name" autoComplete="name" className="control !mt-1" placeholder="Full name" required/></Field>
          <Field label="Email"><input name="email" type="email" autoComplete="email" className="control !mt-1" placeholder="you@example.com" required/></Field>
          <Field label="Business"><input name="businessName" autoComplete="organization" className="control !mt-1" placeholder="Business name" required/></Field>
          <Field label="Country"><select name="country" defaultValue="Uganda" className="control !mt-1"><option>Uganda</option><option>Kenya</option><option>Ghana</option><option>Nigeria</option><option>Rwanda</option></select></Field>
          <Field label="Business type"><select name="businessType" defaultValue="restaurant" className="control !mt-1"><option value="restaurant">Restaurant / Cafe / Bar</option><option value="retail">Supermarket / Retail</option><option value="pharmacy">Pharmacy</option><option value="factory">Industrial / Factory</option><option value="general">General / Mixed</option></select></Field>
          <Field label="Password"><div className="field !mt-1"><input name="password" autoComplete="new-password" type={show?'text':'password'} placeholder="10+ characters" required minLength={10}/><button type="button" onClick={()=>setShow(v=>!v)} className="text-slate-400">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></Field>
        </div>

        {error&&<div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        <button disabled={busy} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#22A53A] font-semibold text-white disabled:opacity-50">{busy?'Creating…':'Start Free Trial'} {!busy&&<ArrowRight size={17}/>}</button>
      </form>
    </main>
  </div>
}
function Field({label,children}:{label:string;children:any}){return <label className="text-sm font-medium text-slate-700">{label}{children}</label>}
