import { useEffect, useState } from 'react'
import { Banknote, LockKeyhole, UnlockKeyhole } from 'lucide-react'
import { api, money } from '../api'
import { PageHeading, Panel, Stat, Loading, Modal } from '../components'
export default function CashDrawer({currency}:{currency:string}){
 const [session,setSession]=useState<any>(undefined),[openModal,setOpenModal]=useState(false),[closeModal,setCloseModal]=useState(false),[opening,setOpening]=useState(0),[actual,setActual]=useState(0)
 const load=()=>api('/cash/current').then(setSession);useEffect(()=>{load()},[])
 async function open(){await api('/cash/open',{method:'POST',body:JSON.stringify({openingCash:opening})});setOpenModal(false);await load()}
 async function close(){await api('/cash/close',{method:'POST',body:JSON.stringify({actualCash:actual})});setCloseModal(false);await load()}
 if(session===undefined)return <Loading/>
 return <div><PageHeading eyebrow="Cash control" title="Cash Drawer" sub="Open and close cashier sessions with expected-versus-actual reconciliation."/>
 <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"><Stat label="Session" value={session?'Open':'Closed'} sub={session?'Opened by '+session.opened_by:'No active drawer'} icon={session?UnlockKeyhole:LockKeyhole}/><Stat label="Opening Cash" value={money(session?.opening_cash||0,currency)} sub="Opening float" icon={Banknote} tone="blue"/></div>
 <div className="mt-4"><Panel title={session?'Active Cash Session':'No Active Cash Session'} sub={session?'Opened '+new Date(session.opened_at).toLocaleString():'Open the drawer before taking cash payments.'}>{session?<button onClick={()=>{setActual(Number(session.opening_cash||0));setCloseModal(true)}} className="rounded-xl bg-red-600 text-white px-5 py-3 font-bold">Close & Reconcile Drawer</button>:<button onClick={()=>setOpenModal(true)} className="rounded-xl bg-slate-950 text-white px-5 py-3 font-bold">Open Cash Drawer</button>}</Panel></div>
 {openModal&&<Modal title="Open Cash Drawer" onClose={()=>setOpenModal(false)}><label className="text-sm font-semibold text-slate-700">Opening cash<input className="control" type="number" min="0" value={opening} onChange={e=>setOpening(Number(e.target.value))}/></label><button onClick={open} className="mt-4 w-full rounded-xl bg-slate-950 text-white py-3 font-bold">Open Session</button></Modal>}
 {closeModal&&<Modal title="Close & Reconcile Drawer" onClose={()=>setCloseModal(false)}><label className="text-sm font-semibold text-slate-700">Actual cash counted<input className="control" type="number" min="0" value={actual} onChange={e=>setActual(Number(e.target.value))}/></label><button onClick={close} className="mt-4 w-full rounded-xl bg-red-600 text-white py-3 font-bold">Close Drawer</button></Modal>}
 </div>
}
