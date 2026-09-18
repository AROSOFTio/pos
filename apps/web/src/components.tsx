import type { ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'

export function PageHeading({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub:string;action?:ReactNode}) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div className="text-xs font-bold uppercase tracking-[.16em] text-emerald-600">{eyebrow}</div>
      <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-2xl">{sub}</p>
    </div>
    {action}
  </div>
}

export function Stat({label,value,sub,icon:Icon,tone='emerald'}:{label:string;value:any;sub:string;icon:any;tone?:string}) {
  const tones:any={emerald:'bg-emerald-50 text-emerald-700',blue:'bg-blue-50 text-blue-700',amber:'bg-amber-50 text-amber-700',violet:'bg-violet-50 text-violet-700',rose:'bg-rose-50 text-rose-700'}
  return <div className="stat-glow rounded-2xl border border-slate-200 p-5 premium-shadow">
    <div className="flex justify-between">
      <div className={'h-10 w-10 rounded-xl grid place-items-center '+tones[tone]}><Icon size={19}/></div>
      <ArrowUpRight size={17} className="text-slate-300"/>
    </div>
    <div className="mt-5 text-2xl font-black">{value}</div>
    <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
    <div className="mt-1 text-xs text-slate-400">{sub}</div>
  </div>
}

export function Panel({title,sub,children,action}:{title:string;sub?:string;children:ReactNode;action?:ReactNode}) {
  return <section className="rounded-2xl border border-slate-200 bg-white premium-shadow overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
      <div><h3 className="font-black tracking-tight">{title}</h3>{sub&&<p className="text-xs text-slate-500 mt-1">{sub}</p>}</div>{action}
    </div>
    <div className="p-5">{children}</div>
  </section>
}

export function Badge({children,tone='slate'}:{children:ReactNode;tone?:'slate'|'green'|'red'|'amber'|'blue'}) {
  const c={slate:'bg-slate-100 text-slate-600',green:'bg-emerald-50 text-emerald-700',red:'bg-red-50 text-red-700',amber:'bg-amber-50 text-amber-700',blue:'bg-blue-50 text-blue-700'}[tone]
  return <span className={'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold '+c}>{children}</span>
}

export function DataTable({head,rows}:{head:string[];rows:ReactNode[][]}) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">{head.map(x=><th key={x} className="pb-3 pr-5 font-bold whitespace-nowrap">{x}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((r,i)=><tr key={i} className="hover:bg-slate-50/80">{r.map((c,j)=><td key={j} className="py-3.5 pr-5 text-slate-700 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
  </table></div>
}

export function Loading(){return <div className="py-16 text-center text-sm text-slate-400">Loading live data…</div>}

export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  return <div className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm grid place-items-center p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="w-full max-w-lg rounded-2xl bg-white premium-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center"><b>{title}</b><button onClick={onClose} className="h-9 w-9 rounded-lg bg-slate-100 grid place-items-center"><X size={17}/></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>
}
