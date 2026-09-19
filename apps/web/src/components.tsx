import type { ReactNode } from 'react'
import { ArrowUpRight, X } from 'lucide-react'

export function PageHeading({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub:string;action?:ReactNode}) {
  return <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[.13em] text-[#22A53A]">{eyebrow}</div>
      <h2 className="mt-1 text-[21px] font-semibold tracking-[-.025em] text-slate-900 sm:text-[25px]">{title}</h2>
      <p className="mt-1 max-w-2xl text-[12px] leading-[1.45] text-slate-500 sm:text-[12.5px]">{sub}</p>
    </div>
    {action&&<div className="shrink-0">{action}</div>}
  </div>
}

export function Stat({label,value,sub,icon:Icon,tone='emerald'}:{label:string;value:any;sub:string;icon:any;tone?:string}) {
  const tones:any={emerald:'bg-emerald-50 text-emerald-700',blue:'bg-blue-50 text-blue-700',amber:'bg-amber-50 text-amber-700',violet:'bg-violet-50 text-violet-700',rose:'bg-rose-50 text-rose-700'}
  return <div className="rounded-[11px] border border-slate-200/80 bg-white p-3.5 premium-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className={'grid h-8 w-8 place-items-center rounded-lg '+tones[tone]}><Icon size={15}/></div>
      <ArrowUpRight size={13} className="text-slate-300"/>
    </div>
    <div className="mt-3 text-[18px] font-semibold tracking-[-.02em] text-slate-900 sm:text-[19px]">{value}</div>
    <div className="mt-0.5 text-[12px] font-medium text-slate-700">{label}</div>
    <div className="mt-0.5 text-[10px] leading-4 text-slate-400">{sub}</div>
  </div>
}

export function Panel({title,sub,children,action}:{title:string;sub?:string;children:ReactNode;action?:ReactNode}) {
  return <section className="overflow-hidden rounded-[11px] border border-slate-200/80 bg-white premium-shadow">
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 sm:px-4">
      <div className="min-w-0"><h3 className="truncate text-[13px] font-semibold tracking-[-.01em] text-slate-900">{title}</h3>{sub&&<p className="mt-0.5 text-[10.5px] leading-4 text-slate-500">{sub}</p>}</div>{action&&<div className="shrink-0">{action}</div>}
    </div>
    <div className="p-3.5 sm:p-4">{children}</div>
  </section>
}

export function Badge({children,tone='slate'}:{children:ReactNode;tone?:'slate'|'green'|'red'|'amber'|'blue'}) {
  const c={slate:'bg-slate-100 text-slate-600',green:'bg-emerald-50 text-emerald-700',red:'bg-red-50 text-red-700',amber:'bg-amber-50 text-amber-700',blue:'bg-blue-50 text-blue-700'}[tone]
  return <span className={'inline-flex items-center rounded-full px-2 py-[3px] text-[9.5px] font-medium leading-none '+c}>{children}</span>
}

export function DataTable({head,rows}:{head:string[];rows:ReactNode[][]}) {
  return <div className="table-wrap"><table className="data-table text-[12px] sm:text-[12.5px]">
    <thead><tr className="text-left text-[9px] uppercase tracking-[.075em] text-slate-400">{head.map(x=><th key={x} className="border-b border-slate-100 px-2.5 pb-2.5 pt-1 font-medium whitespace-nowrap first:pl-0 last:pr-0">{x}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i} className="transition-colors hover:bg-slate-50/70">{r.map((c,j)=><td key={j} className="border-b border-slate-100 px-2.5 py-2.5 text-slate-700 whitespace-nowrap first:pl-0 last:pr-0">{c}</td>)}</tr>)}</tbody>
  </table></div>
}

export function Loading(){return <div className="py-10 text-center text-[12px] text-slate-400">Loading…</div>}

export function Modal({title,onClose,children,size='md'}:{title:string;onClose:()=>void;children:ReactNode;size?:'sm'|'md'|'lg'|'xl'}) {
  const widths={sm:'sm:max-w-md',md:'sm:max-w-lg',lg:'sm:max-w-2xl',xl:'sm:max-w-3xl'}[size]
  return <div className="modal-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/30 p-3 sm:p-5 lg:p-7" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className={'modal-surface modal-scroll my-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.15)] sm:max-h-[calc(100dvh-2.5rem)] lg:max-h-[calc(100dvh-3.5rem)] '+widths}>
      <div className="sticky top-0 z-20 flex min-h-[54px] items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <span className="min-w-0 truncate pr-3 text-[14px] font-semibold">{title}</span>
        <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16}/></button>
      </div>
      <div className="p-4 sm:p-5 lg:p-6">{children}</div>
    </div>
  </div>
}
