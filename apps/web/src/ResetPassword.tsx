import { useState } from 'react'
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react'
import { api } from './api'
import { MauzoLogo } from './Brand'

export default function ResetPassword({navigate}:{navigate:(path:string)=>void}){
  const token=new URLSearchParams(window.location.search).get('token')||''
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('')
    if(password.length<10){setError('Password must be at least 10 characters.');return}
    if(password!==confirm){setError('Passwords do not match.');return}
    setBusy(true)
    try{await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});setDone(true)}
    catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="min-h-screen bg-[#f7faf7] px-5 py-8">
    <div className="mx-auto max-w-[460px]">
      <button onClick={()=>navigate('/login')} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500"><ArrowLeft size={16}/>Back to login</button>
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:p-9">
        <MauzoLogo compact/>
        {done?<div className="py-10 text-center"><CheckCircle2 size={44} className="mx-auto text-[#22A53A]"/><h1 className="mt-4 text-2xl font-semibold">Password changed</h1><p className="mt-2 text-sm text-slate-500">You can now sign in with your new password.</p><button onClick={()=>navigate('/login')} className="mt-6 rounded-xl bg-[#22A53A] px-5 py-3 font-semibold text-white">Go to Login</button></div>:
        <form onSubmit={submit}>
          <div className="mt-7 text-xs font-semibold uppercase tracking-[.16em] text-[#22A53A]">Account recovery</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Create a new password</h1>
          <p className="mt-2 text-sm text-slate-500">This secure reset link expires after 30 minutes and can only be used once.</p>
          <Field label="New password" value={password} setValue={setPassword}/>
          <Field label="Confirm password" value={confirm} setValue={setConfirm}/>
          {error&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={busy||!token} className="mt-6 h-13 w-full rounded-xl bg-[#22A53A] font-semibold text-white disabled:opacity-40">{busy?'Saving…':'Reset Password'}</button>
          {!token&&<div className="mt-3 text-center text-xs text-red-600">This reset link is incomplete.</div>}
        </form>}
      </div>
    </div>
  </div>
}
function Field({label,value,setValue}:{label:string;value:string;setValue:(v:string)=>void}){return <label className="mt-5 block text-sm font-medium text-slate-700">{label}<div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[#22A53A] focus-within:ring-4 focus-within:ring-green-100"><LockKeyhole size={17} className="text-slate-400"/><input type="password" value={value} onChange={e=>setValue(e.target.value)} className="flex-1 outline-none" autoComplete="new-password"/></div></label>}
