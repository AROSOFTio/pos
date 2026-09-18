type LogoProps={compact?:boolean;light?:boolean;className?:string}

export function MauzoMark({light=false,className=''}:{light?:boolean;className?:string}){
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
    <rect width="64" height="64" rx="18" fill={light?'#ffffff':'#0F172A'}/>
    <rect x="13" y="33" width="8" height="17" rx="4" fill="#22A53A"/>
    <rect x="25" y="24" width="8" height="26" rx="4" fill="#22A53A"/>
    <rect x="37" y="14" width="8" height="36" rx="4" fill="#22A53A"/>
    <path d="M46.5 20.5L51 25l7-8" stroke={light?'#0F172A':'#fff'} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}

export function MauzoLogo({compact=false,light=false,className=''}:LogoProps){
  return <div className={'inline-flex items-center gap-3 '+className}>
    <MauzoMark light={light} className={compact?'h-9 w-9 shrink-0':'h-11 w-11 shrink-0'}/>
    <div className="leading-none">
      <div className={(compact?'text-[20px]':'text-[26px]')+' font-black tracking-[-0.045em] '+(light?'text-white':'text-[#0F172A]')}>
        Mauzo<span className="text-[#22A53A]">POS</span>
      </div>
      {!compact&&<div className={'mt-1 text-[10px] font-medium tracking-[.02em] '+(light?'text-slate-400':'text-slate-500')}>Sell smarter. Grow faster.</div>}
    </div>
  </div>
}
