import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChefHat, Clock3, ClipboardList, DoorOpen, Plus, RefreshCw, Route, Sparkles, Table2, UsersRound, UtensilsCrossed } from 'lucide-react'
import { api, money, nice } from '../api'
import { Badge, DataTable, Loading, Modal, PageHeading, Panel, Stat } from '../components'
import type { ViewKey } from '../App'

type Section='dashboard'|'tables'|'reservations'|'waitlist'|'service'|'delivery'|'dayclose'
type TableFilter='all'|'available'|'reserved'|'occupied'|'dirty'|'clean'

const asArray=(v:any)=>Array.isArray(v)?v:[]

export default function Restaurant({currency,go}:{currency:string;go:(v:ViewKey)=>void}){
 const [section,setSection]=useState<Section>('dashboard')
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [overview,setOverview]=useState<any>({}),[service,setService]=useState<any>({}),[tables,setTables]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[reservations,setReservations]=useState<any[]>([]),[waitlist,setWaitlist]=useState<any[]>([]),[zones,setZones]=useState<any[]>([]),[branches,setBranches]=useState<any[]>([]),[areas,setAreas]=useState<any[]>([])
 const [branchId,setBranchId]=useState<number>(0),[tableFilter,setTableFilter]=useState<TableFilter>('all'),[query,setQuery]=useState('')
 const [reservationOpen,setReservationOpen]=useState(false),[waitOpen,setWaitOpen]=useState(false),[seatOpen,setSeatOpen]=useState<any>(null),[zoneOpen,setZoneOpen]=useState(false)
 const [reservation,setReservation]=useState<any>({guestName:'',phone:'',guestCount:'2',reservedAt:'',durationMinutes:'120',tableId:'',notes:''})
 const [waiting,setWaiting]=useState<any>({guestName:'',phone:'',guestCount:'2',estimatedWaitMinutes:'15',preferredAreaId:'',notes:''})
 const [zone,setZone]=useState<any>({name:'',fee:'',estimatedMinutes:'45'}),[dayClose,setDayClose]=useState<any>(null),[closeNote,setCloseNote]=useState(''),[busy,setBusy]=useState(false)

 async function load(){
   setLoading(true);setError('')
   try{
     const [b,t,a,o,r,w,z,ov]=await Promise.all([
       api('/branches').catch(()=>[]),
       api('/restaurant/tables').catch(()=>[]),
       api('/restaurant/areas').catch(()=>[]),
       api('/restaurant/orders?status=active').catch(()=>[]),
       api('/restaurant/reservations').catch(()=>[]),
       api('/restaurant/waitlist').catch(()=>[]),
       api('/restaurant/delivery-zones').catch(()=>[]),
       api('/restaurant/overview').catch(()=>({}))
     ])
     const bs=asArray(b);setBranches(bs);setTables(asArray(t));setAreas(asArray(a));setOrders(asArray(o));setReservations(asArray(r));setWaitlist(asArray(w));setZones(asArray(z));setOverview(ov||{})
     const current=branchId||Number(bs[0]?.id||0);if(!branchId&&current)setBranchId(current)
     if(current){
       const [s,d]=await Promise.all([api('/restaurant/service-overview?branchId='+current).catch(()=>({})),api('/restaurant/day-close/status?branchId='+current).catch(()=>null)])
       setService(s||{});setDayClose(d)
     }
   }catch(e:any){setError(e.message||'Restaurant operations could not be loaded.')}finally{setLoading(false)}
 }
 useEffect(()=>{load();const id=setInterval(()=>load(),20000);return()=>clearInterval(id)},[])
 useEffect(()=>{if(branchId&&!loading){Promise.all([api('/restaurant/service-overview?branchId='+branchId).catch(()=>({})),api('/restaurant/day-close/status?branchId='+branchId).catch(()=>null)]).then(([s,d])=>{setService(s||{});setDayClose(d)})}},[branchId])

 const branchTables=useMemo(()=>tables.filter(t=>!branchId||Number(t.branch_id)===branchId),[tables,branchId])
 const orderByTable=useMemo(()=>new Map(orders.filter(x=>x.table_id).map(x=>[Number(x.table_id),x])),[orders])
 const visibleTables=useMemo(()=>branchTables.filter(t=>{
   const q=query.trim().toLowerCase();if(q&&![t.name,t.area_name,t.branch_name].some(v=>String(v||'').toLowerCase().includes(q)))return false
   if(tableFilter==='all')return true
   if(tableFilter==='dirty'||tableFilter==='clean')return (t.cleanliness_status||'clean')===tableFilter
   return t.status===tableFilter
 }),[branchTables,query,tableFilter])
 const activeDeliveries=orders.filter(x=>x.order_type==='delivery'&&!['paid','closed','cancelled'].includes(x.status))
 const nav:Array<[Section,string,any]>=[['dashboard','Dashboard',Sparkles],['tables','Tables',Table2],['reservations','Reservations',CalendarDays],['waitlist','Waitlist',Clock3],['service','Service',UtensilsCrossed],['delivery','Delivery',Route],['dayclose','Day Close',DoorOpen]]

 async function createReservation(){
   if(!branchId||!reservation.reservedAt||!reservation.guestName.trim())return
   setBusy(true);setError('')
   try{await api('/restaurant/reservations',{method:'POST',body:JSON.stringify({branchId,tableId:Number(reservation.tableId)||null,guestName:reservation.guestName.trim(),phone:reservation.phone.trim()||null,guestCount:Number(reservation.guestCount||1),reservedAt:new Date(reservation.reservedAt).toISOString(),durationMinutes:Number(reservation.durationMinutes||120),notes:reservation.notes.trim()||null})});setReservationOpen(false);setReservation({guestName:'',phone:'',guestCount:'2',reservedAt:'',durationMinutes:'120',tableId:'',notes:''});setMessage('Reservation created.');await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function addWait(){
   if(!branchId||!waiting.guestName.trim())return
   setBusy(true);setError('')
   try{await api('/restaurant/waitlist',{method:'POST',body:JSON.stringify({branchId,guestName:waiting.guestName.trim(),phone:waiting.phone.trim()||null,guestCount:Number(waiting.guestCount||1),estimatedWaitMinutes:Number(waiting.estimatedWaitMinutes||15),preferredAreaId:Number(waiting.preferredAreaId)||null,notes:waiting.notes.trim()||null})});setWaitOpen(false);setWaiting({guestName:'',phone:'',guestCount:'2',estimatedWaitMinutes:'15',preferredAreaId:'',notes:''});setMessage('Guest added to waitlist.');await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function seatGuest(entry:any,tableId:number){
   setBusy(true)
   try{
     if(entry.kind==='reservation')await api('/restaurant/reservations/'+entry.id+'/check-in',{method:'POST',body:JSON.stringify({tableId})})
     else await api('/restaurant/waitlist/'+entry.id+'/status',{method:'PUT',body:JSON.stringify({status:'seated',tableId})})
     setSeatOpen(null);setMessage('Guest seated.');await load()
   }catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function addZone(){
   if(!branchId||!zone.name.trim())return
   setBusy(true)
   try{await api('/restaurant/delivery-zones',{method:'POST',body:JSON.stringify({branchId,name:zone.name.trim(),fee:Number(zone.fee||0),estimatedMinutes:Number(zone.estimatedMinutes||45)})});setZoneOpen(false);setZone({name:'',fee:'',estimatedMinutes:'45'});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 async function closeDay(){
   if(!branchId||!dayClose?.canClose)return
   setBusy(true)
   try{await api('/restaurant/day-close',{method:'POST',body:JSON.stringify({branchId,notes:closeNote.trim()||null})});setMessage('Business day closed successfully.');setCloseNote('');await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}
 }

 if(loading&&!branches.length)return <Loading/>

 return <div>
   <PageHeading eyebrow="Restaurant operations" title="Restaurant" sub="Tables, guests, service, kitchen flow and daily close." action={<div className="flex items-center gap-2"><select value={branchId} onChange={e=>setBranchId(Number(e.target.value)||0)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={load} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"><RefreshCw size={14}/></button></div>}/>
   {(error||message)&&<div className={'mb-4 rounded-xl border px-3.5 py-3 text-[11px] '+(error?'border-red-100 bg-red-50 text-red-700':'border-emerald-100 bg-emerald-50 text-emerald-700')}>{error||message}</div>}

   <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
     {nav.map(([id,label,Icon])=><button key={id} onClick={()=>setSection(id)} className={'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10.5px] font-medium transition '+(section===id?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-50')}><Icon size={13}/>{label}</button>)}
   </div>

   {section==='dashboard'&&<>
     <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
       <Stat label="Open Orders" value={orders.length} sub="Running now" icon={ClipboardList}/>
       <Stat label="Available Tables" value={Number(overview.availableTables||overview.available||0)} sub="Ready to seat" icon={Table2} tone="blue"/>
       <Stat label="Reservations" value={Number(service.reservations?.reserved||0)} sub="Expected today" icon={CalendarDays} tone="violet"/>
       <Stat label="Waiting Guests" value={Number(service.waitlist?.waiting||0)} sub="Current waitlist" icon={UsersRound} tone="amber"/>
       <Stat label="Kitchen Overdue" value={Number(service.kitchen?.overdue||0)} sub="Over 20 minutes" icon={ChefHat} tone={Number(service.kitchen?.overdue||0)?'amber':'emerald'}/>
     </div>
     <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
       <Panel title="Floor status" sub={branchTables.length+' tables'}>
         <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{branchTables.slice(0,12).map(t=><button key={t.id} onClick={()=>setSection('tables')} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left"><div className="text-[12px] font-semibold text-slate-800">{t.name}</div><div className="mt-1 flex gap-1"><Badge tone={t.status==='occupied'?'blue':t.status==='reserved'?'amber':'green'}>{t.status==='available'?'Available':nice(t.status)}</Badge>{t.cleanliness_status==='dirty'&&<Badge tone="red">Dirty</Badge>}</div></button>)}</div>
       </Panel>
       <Panel title="Today" sub="Restaurant service">
         <div className="grid gap-2">
           <Quick label="Reservations" value={String(service.reservations?.total||0)} onClick={()=>setSection('reservations')}/>
           <Quick label="Waitlist" value={String(service.waitlist?.waiting||0)} onClick={()=>setSection('waitlist')}/>
           <Quick label="Active kitchen tickets" value={String(service.kitchen?.active||0)} onClick={()=>go('Kitchen')}/>
           <Quick label="Delivery orders" value={String(service.delivery?.active||0)} onClick={()=>setSection('delivery')}/>
         </div>
       </Panel>
     </div>
   </>}

   {section==='tables'&&<>
     <div className="mb-3 flex flex-col gap-2 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tables or areas" className="control mt-0 flex-1"/><div className="flex gap-1 overflow-x-auto">{(['all','available','reserved','occupied','dirty','clean'] as TableFilter[]).map(f=><button key={f} onClick={()=>setTableFilter(f)} className={'shrink-0 rounded-lg px-3 py-2 text-[10px] font-medium capitalize '+(tableFilter===f?'bg-slate-950 text-white':'border border-slate-200 bg-white text-slate-500')}>{f}</button>)}</div></div>
     {visibleTables.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleTables.map(t=>{const order=orderByTable.get(Number(t.id));return <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-[15px] font-semibold text-slate-900">{t.name}</div><div className="mt-1 text-[9.5px] text-slate-400">{t.area_name||'Main Floor'} · {t.capacity} seats</div></div><Badge tone={t.status==='occupied'?'blue':t.status==='reserved'?'amber':'green'}>{t.status==='available'?'Available':nice(t.status)}</Badge></div><div className="mt-4 flex items-end justify-between"><div><div className="text-[9px] text-slate-400">Party</div><div className="mt-1 text-[13px] font-semibold">{t.current_party_size||0}/{t.capacity}</div></div><button onClick={()=>go('Orders')} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10px] font-semibold text-white">{order?'Open Order':'New Order'}</button></div>{t.cleanliness_status==='dirty'&&<div className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-[9.5px] font-medium text-red-600">Needs cleaning</div>}</article>})}</div>:<Empty text="No matching tables."/>}
   </>}

   {section==='reservations'&&<Panel title="Reservations" sub="Bookings and arrivals" action={<button onClick={()=>setReservationOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13}/>Reservation</button>}>
     {reservations.length?<DataTable head={['Time','Guest','Party','Table','Status','']} rows={reservations.filter(r=>!branchId||Number(r.branch_id)===branchId).map(r=>[new Date(r.reserved_at).toLocaleString(),<div><b>{r.guest_name||r.customer_name||'Guest'}</b>{r.phone&&<div className="text-[9px] text-slate-400">{r.phone}</div>}</div>,r.guest_count,r.table_name||'-',<Badge tone={r.status==='reserved'?'amber':r.status==='seated'?'green':'slate'}>{nice(r.status)}</Badge>,r.status==='reserved'?<button onClick={()=>setSeatOpen({...r,kind:'reservation'})} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px] font-medium">Seat</button>:''])}/>:<Empty text="No reservations found."/>}
   </Panel>}

   {section==='waitlist'&&<Panel title="Waitlist" sub="Walk-ins waiting for a table" action={<button onClick={()=>setWaitOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-[10.5px] font-semibold text-white"><Plus size={13}/>Add Guest</button>}>
     {waitlist.length?<DataTable head={['Guest','Party','Quoted','Waiting','Status','']} rows={waitlist.filter(w=>!branchId||Number(w.branch_id)===branchId).map(w=>[<div><b>{w.guest_name}</b>{w.phone&&<div className="text-[9px] text-slate-400">{w.phone}</div>}</div>,w.guest_count,w.estimated_wait_minutes+' min',Math.round(Number(w.elapsed_minutes||0))+' min',<Badge tone={w.status==='waiting'?'amber':w.status==='seated'?'green':'slate'}>{nice(w.status)}</Badge>,w.status==='waiting'?<div className="flex gap-1"><button onClick={()=>setSeatOpen({...w,kind:'waitlist'})} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-[9.5px] font-medium text-white">Seat</button><button onClick={async()=>{await api('/restaurant/waitlist/'+w.id+'/status',{method:'PUT',body:JSON.stringify({status:'notified'})});await load()}} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px]">Notify</button></div>:''])}/>:<Empty text="No guests waiting."/>}
   </Panel>}

   {section==='service'&&<div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
     <Panel title="Running orders" sub={orders.length+' active'}>
       {orders.length?<DataTable head={['Order','Table/Type','Waiter','Guests','Status','Total']} rows={orders.filter(o=>!branchId||Number(o.branch_id)===branchId).map(o=>[<b>{o.order_no}</b>,o.table_name||nice(o.order_type),o.waiter_name||'-',o.guest_count,<Badge tone={o.status==='ready'?'green':o.status==='preparing'?'amber':'blue'}>{nice(o.status)}</Badge>,money(o.total||0,currency)])}/>:<Empty text="No running orders."/>}
       <button onClick={()=>go('Orders')} className="mt-3 w-full rounded-lg border border-slate-200 py-2.5 text-[11px] font-medium text-slate-600">Open Order Manager</button>
     </Panel>
     <Panel title="Kitchen health" sub="Live preparation">
       <div className="grid gap-2"><Metric label="Active tickets" value={service.kitchen?.active||0}/><Metric label="Overdue >20 min" value={service.kitchen?.overdue||0} warn={Number(service.kitchen?.overdue||0)>0}/><Metric label="Average waitlist" value={(service.waitlist?.avg_wait||0)+' min'}/></div>
       <button onClick={()=>go('Kitchen')} className="mt-3 w-full rounded-lg bg-slate-950 py-2.5 text-[11px] font-medium text-white">Open Kitchen Display</button>
     </Panel>
   </div>}

   {section==='delivery'&&<div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
     <Panel title="Active deliveries" sub={activeDeliveries.length+' running'}>
       {activeDeliveries.length?<DataTable head={['Order','Address','Phone','Driver','Status','Promised']} rows={activeDeliveries.map(o=>[<b>{o.order_no}</b>,o.delivery_address||'-',o.delivery_phone||'-',o.driver_name||'-',<Badge tone={o.delivery_status==='delivered'?'green':o.delivery_status==='dispatched'?'blue':'amber'}>{nice(o.delivery_status||o.status)}</Badge>,o.promised_at?new Date(o.promised_at).toLocaleTimeString():'-'])}/>:<Empty text="No active delivery orders."/>}
     </Panel>
     <Panel title="Delivery zones" sub={zones.length+' configured'} action={<button onClick={()=>setZoneOpen(true)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9.5px] font-medium">+ Zone</button>}>
       {zones.length?<div className="space-y-2">{zones.filter(z=>!branchId||Number(z.branch_id)===branchId).map(z=><div key={z.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div><div className="text-[11px] font-semibold">{z.name}</div><div className="mt-0.5 text-[9px] text-slate-400">{z.estimated_minutes} min</div></div><div className="text-[11px] font-semibold text-[var(--brand-primary)]">{money(z.fee,currency)}</div></div>)}</div>:<Empty text="No delivery zones configured."/>}
     </Panel>
   </div>}

   {section==='dayclose'&&<div className="mx-auto max-w-3xl">
     <Panel title="End of Day" sub="Close the branch only after operations reconcile.">
       {dayClose?<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Metric label="Sales" value={money(dayClose.salesTotal||0,currency)}/><Metric label="Expenses" value={money(dayClose.expensesTotal||0,currency)}/><Metric label="Open orders" value={dayClose.openOrders||0} warn={dayClose.openOrders>0}/><Metric label="Open shifts" value={dayClose.openShifts||0} warn={dayClose.openShifts>0}/><Metric label="Pending KOTs" value={dayClose.pendingKots||0} warn={dayClose.pendingKots>0}/><Metric label="Expected cash" value={money(dayClose.cashExpected||0,currency)}/></div><textarea value={closeNote} onChange={e=>setCloseNote(e.target.value)} placeholder="Optional closing note" className="control mt-4 min-h-20"/><button disabled={!dayClose.canClose||busy} onClick={closeDay} className="mt-3 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">{busy?'Closing…':dayClose.canClose?'Close Business Day':'Resolve Open Operations First'}</button>{!dayClose.canClose&&<div className="mt-2 text-center text-[10px] text-amber-700">All orders, shifts and kitchen tickets must be closed before end-of-day.</div>}</>:<Empty text="Day-close status is unavailable for this branch."/>}
     </Panel>
   </div>}

   {reservationOpen&&<Modal title="New Reservation" onClose={()=>!busy&&setReservationOpen(false)} size="md"><FormGrid>
     <Field label="Guest name"><input className="control" value={reservation.guestName} onChange={e=>setReservation({...reservation,guestName:e.target.value})}/></Field>
     <Field label="Phone"><input className="control" value={reservation.phone} onChange={e=>setReservation({...reservation,phone:e.target.value})}/></Field>
     <Field label="Party size"><input className="control" inputMode="numeric" value={reservation.guestCount} onChange={e=>setReservation({...reservation,guestCount:e.target.value.replace(/\D/g,'')})}/></Field>
     <Field label="Date & time"><input type="datetime-local" className="control" value={reservation.reservedAt} onChange={e=>setReservation({...reservation,reservedAt:e.target.value})}/></Field>
     <Field label="Duration"><input className="control" inputMode="numeric" value={reservation.durationMinutes} onChange={e=>setReservation({...reservation,durationMinutes:e.target.value.replace(/\D/g,'')})}/></Field>
     <Field label="Table"><select className="control" value={reservation.tableId} onChange={e=>setReservation({...reservation,tableId:e.target.value})}><option value="">Assign later</option>{branchTables.filter(t=>t.status!=='occupied').map(t=><option key={t.id} value={t.id}>{t.name} · {t.capacity} seats</option>)}</select></Field>
   </FormGrid><Field label="Notes"><textarea className="control min-h-20" value={reservation.notes} onChange={e=>setReservation({...reservation,notes:e.target.value})}/></Field><button onClick={createReservation} disabled={busy||!reservation.guestName.trim()||!reservation.reservedAt} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Reservation</button></Modal>}

   {waitOpen&&<Modal title="Add to Waitlist" onClose={()=>!busy&&setWaitOpen(false)} size="md"><FormGrid>
     <Field label="Guest name"><input className="control" value={waiting.guestName} onChange={e=>setWaiting({...waiting,guestName:e.target.value})}/></Field>
     <Field label="Phone"><input className="control" value={waiting.phone} onChange={e=>setWaiting({...waiting,phone:e.target.value})}/></Field>
     <Field label="Party size"><input className="control" value={waiting.guestCount} onChange={e=>setWaiting({...waiting,guestCount:e.target.value.replace(/\D/g,'')})}/></Field>
     <Field label="Quoted wait (min)"><input className="control" value={waiting.estimatedWaitMinutes} onChange={e=>setWaiting({...waiting,estimatedWaitMinutes:e.target.value.replace(/\D/g,'')})}/></Field>
     <Field label="Preferred area"><select className="control" value={waiting.preferredAreaId} onChange={e=>setWaiting({...waiting,preferredAreaId:e.target.value})}><option value="">Any area</option>{areas.filter(a=>!branchId||Number(a.branch_id)===branchId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
   </FormGrid><Field label="Notes"><textarea className="control min-h-20" value={waiting.notes} onChange={e=>setWaiting({...waiting,notes:e.target.value})}/></Field><button onClick={addWait} disabled={busy||!waiting.guestName.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Add Guest</button></Modal>}

   {seatOpen&&<Modal title={'Seat '+(seatOpen.guest_name||seatOpen.customer_name||'Guest')} onClose={()=>!busy&&setSeatOpen(null)} size="sm"><div className="grid gap-2">{branchTables.filter(t=>t.status!=='occupied'&&t.cleanliness_status!=='dirty'&&Number(t.capacity)>=Number(seatOpen.guest_count||1)).map(t=><button key={t.id} onClick={()=>seatGuest(seatOpen,Number(t.id))} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:border-[var(--brand-primary)]"><div><div className="text-[11px] font-semibold">{t.name}</div><div className="text-[9px] text-slate-400">{t.area_name||'Floor'} · {t.capacity} seats</div></div><Badge tone="green">Available</Badge></button>)}</div></Modal>}

   {zoneOpen&&<Modal title="Delivery Zone" onClose={()=>!busy&&setZoneOpen(false)} size="sm"><div className="grid gap-3"><Field label="Zone name"><input className="control" value={zone.name} onChange={e=>setZone({...zone,name:e.target.value})}/></Field><Field label={'Delivery fee ('+currency+')'}><input className="control" inputMode="decimal" value={zone.fee} onChange={e=>setZone({...zone,fee:e.target.value.replace(/[^0-9.]/g,'')})}/></Field><Field label="Estimated minutes"><input className="control" value={zone.estimatedMinutes} onChange={e=>setZone({...zone,estimatedMinutes:e.target.value.replace(/\D/g,'')})}/></Field></div><button onClick={addZone} disabled={busy||!zone.name.trim()} className="mt-4 w-full rounded-lg bg-[var(--brand-primary)] py-3 text-[12px] font-semibold text-white disabled:opacity-40">Save Zone</button></Modal>}
 </div>
}

function Quick({label,value,onClick}:{label:string;value:string;onClick:()=>void}){return <button onClick={onClick} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 text-left"><span className="text-[10.5px] font-medium text-slate-600">{label}</span><span className="text-[13px] font-semibold text-slate-900">{value}</span></button>}
function Metric({label,value,warn=false}:{label:string;value:any;warn?:boolean}){return <div className={'rounded-xl border p-3 '+(warn?'border-amber-100 bg-amber-50':'border-slate-100 bg-slate-50/60')}><div className="text-[9.5px] text-slate-400">{label}</div><div className={'mt-1 text-[15px] font-semibold '+(warn?'text-amber-800':'text-slate-800')}>{value}</div></div>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center text-[10.5px] text-slate-400">{text}</div>}
function Field({label,children}:{label:string;children:any}){return <label className="block text-[11px] font-medium text-slate-600">{label}{children}</label>}
function FormGrid({children}:{children:any}){return <div className="grid gap-3 sm:grid-cols-2">{children}</div>}
