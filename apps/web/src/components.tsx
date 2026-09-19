import type { ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'

export function PageHeading({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub:string;action?:ReactNode}) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#22A53A]">{eyebrow}</div>
      <h2 className="mt-1 text-[24px] font-semibold tracking-[-.025em] text-slate-900 sm:text-[28px]">{title}</h2>
      <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-500">{sub}</p>
    </div>
    {action}
  </div>
}

export function Stat({label,value,sub,icon:Icon,tone='emerald'}:{label:string;value:any;sub:string;icon:any;tone?:string}) {
  const tones:any={emerald:'bg-emerald-50 text-emerald-700',blue:'bg-blue-50 text-blue-700',amber:'bg-amber-50 text-amber-700',violet:'bg-violet-50 text-violet-700',rose:'bg-rose-50 text-rose-700'}
  return <div className="rounded-xl border border-slate-200/80 bg-white p-4 premium-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className={'grid h-9 w-9 place-items-center rounded-lg '+tones[tone]}><Icon size={17}/></div>
      <ArrowUpRight size={15} className="text-slate-300"/>
    </div>
    <div className="mt-4 text-[21px] font-semibold tracking-[-.02em] text-slate-900">{value}</div>
    <div className="mt-0.5 text-[13px] font-medium text-slate-700">{label}</div>
    <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>
  </div>
}

export function Panel({title,sub,children,action}:{title:string;sub?:string;children:ReactNode;action?:ReactNode}) {
  return <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white premium-shadow">
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5">
      <div><h3 className="text-[14px] font-semibold tracking-[-.01em] text-slate-900">{title}</h3>{sub&&<p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}</div>{action}
    </div>
    <div className="p-4">{children}</div>
  </section>
}

export function Badge({children,tone='slate'}:{children:ReactNode;tone?:'slate'|'green'|'red'|'amber'|'blue'}) {
  const c={slate:'bg-slate-100 text-slate-600',green:'bg-emerald-50 text-emerald-700',red:'bg-red-50 text-red-700',amber:'bg-amber-50 text-amber-700',blue:'bg-blue-50 text-blue-700'}[tone]
  return <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium '+c}>{children}</span>
}

export function DataTable({head,rows}:{head:string[];rows:ReactNode[][]}) {
  return <div className="overflow-x-auto"><table className="w-full text-[13px]">
    <thead><tr className="text-left text-[10px] uppercase tracking-[.08em] text-slate-400">{head.map(x=><th key={x} className="pb-2.5 pr-4 font-medium whitespace-nowrap">{x}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((r,i)=><tr key={i} className="transition-colors hover:bg-slate-50/70">{r.map((c,j)=><td key={j} className="py-3 pr-4 text-slate-700 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
  </table></div>
}

export function Loading(){return <div className="py-14 text-center text-[13px] text-slate-400">Loading…</div>}

export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-3 sm:p-5" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.16)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3"><span className="text-[15px] font-semibold">{title}</span><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16}/></button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>
}
