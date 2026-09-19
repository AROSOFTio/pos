import { useEffect, useRef } from 'react'
import { ArrowRight, BarChart3, Boxes, CreditCard, ShoppingCart, Store, UsersRound } from 'lucide-react'
import { MauzoLogo } from './Brand'

const modules=[
  {name:'Restaurant',tag:'Restaurant',line:'Tables · Kitchen · Orders',img:'/brand/restaurant.webp'},
  {name:'Supermarket',tag:'Retail',line:'Barcode · Stock · Checkout',img:'/brand/supermarket.webp'},
  {name:'Pharmacy',tag:'Pharmacy',line:'Medicines · Inventory · Sales',img:'/brand/pharmacy.webp'},
  {name:'Boutique',tag:'Fashion',line:'Products · Customers · Checkout',img:'/brand/boutique.webp'},
  {name:'Analytics',tag:'Reports',line:'Sales · Profit · Trends',img:'/brand/analytics.webp'},
]

export default function Marketing({navigate}:{navigate:(path:string)=>void}){
  return <div className="min-h-screen bg-white text-[#0f172a]">
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] max-w-[1320px] items-center px-5 lg:px-8">
        <MauzoLogo compact/>
        <nav className="ml-auto hidden gap-7 text-sm font-semibold text-slate-500 md:flex"><a href="#modules">Modules</a><a href="#features">Features</a></nav>
        <div className="ml-auto flex gap-2 md:ml-7"><button onClick={()=>navigate('/login')} className="rounded-xl px-4 py-2.5 text-sm font-bold">Login</button><button onClick={()=>navigate('/register')} className="rounded-xl bg-[#22A53A] px-4 py-2.5 text-sm font-black text-white">Start Free Trial</button></div>
      </div>
    </header>

    <main>
      <section className="overflow-hidden bg-[radial-gradient(circle_at_80%_12%,rgba(34,165,58,.12),transparent_26%),linear-gradient(180deg,#fbfffb,#fff)]">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-14 lg:grid-cols-[.92fr_1.08fr] lg:px-8 lg:py-20">
          <div>
            <div className="w-fit rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[#169B36]">One POS · Every business</div>
            <h1 className="mt-5 text-5xl font-black tracking-[-.055em] sm:text-6xl lg:text-[72px] lg:leading-[.96]">One POS.<br/><span className="text-[#22A53A]">Multiple Industries.</span></h1>
            <div className="mt-5 text-lg font-medium text-slate-500">Restaurant · Retail · Pharmacy · More</div>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-2xl bg-[#22A53A] px-6 py-4 font-black text-white shadow-[0_16px_34px_rgba(34,165,58,.18)]">Start Free Trial <ArrowRight size={18}/></button><button onClick={()=>navigate('/login')} className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black">Login</button></div>
            <div className="mt-4 text-sm font-semibold text-slate-400">No credit card required</div>
          </div>
          <div className="hero-float overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-[0_28px_80px_rgba(15,23,42,.10)]">
            <img src="/brand/retail.webp" alt="MauzoPOS" className="aspect-[4/3] h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8">
        <div className="text-xs font-black uppercase tracking-[.16em] text-[#22A53A]">Modules</div>
        <h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Built around your business</h2>
        <div className="mt-8 space-y-8 lg:space-y-12">
          {modules.map((m,i)=><Reveal key={m.name}><div className={'grid items-center gap-7 rounded-[30px] border border-slate-100 bg-[#fbfcfb] p-4 sm:p-6 lg:grid-cols-2 lg:p-8 '+(i%2?'lg:[&>div:first-child]:order-2':'')}>
            <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_45px_rgba(15,23,42,.08)]"><img src={m.img} alt={m.name} className="aspect-[16/10] h-full w-full object-cover transition duration-700 hover:scale-[1.025]" onError={e=>{e.currentTarget.style.display='none'}}/></div>
            <div className="px-2 py-3 lg:px-8">
              <div className="text-xs font-black uppercase tracking-[.16em] text-[#22A53A]">{m.tag}</div>
              <h3 className="mt-2 text-4xl font-black tracking-[-.04em]">{m.name}</h3>
              <div className="mt-3 text-lg font-medium text-slate-400">{m.line}</div>
            </div>
          </div></Reveal>)}
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-[#fafcf9]">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-3 px-5 py-9 sm:grid-cols-3 lg:grid-cols-6 lg:px-8">
          <Feature icon={ShoppingCart} text="Fast Checkout"/><Feature icon={Boxes} text="Inventory"/><Feature icon={CreditCard} text="Payments"/><Feature icon={BarChart3} text="Reports"/><Feature icon={Store} text="Multi-branch"/><Feature icon={UsersRound} text="Staff Control"/>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-[28px] bg-[linear-gradient(120deg,#efffec,#fff)] p-7 text-center sm:flex-row sm:text-left lg:p-10">
          <div><h3 className="text-2xl font-black">Ready?</h3><div className="mt-1 text-sm text-slate-400">14-day free trial · No card</div></div>
          <div className="flex gap-3"><button onClick={()=>navigate('/register')} className="rounded-xl bg-[#22A53A] px-5 py-3 font-black text-white">Start Free Trial</button><button onClick={()=>navigate('/login')} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-black">Login</button></div>
        </div>
      </section>
    </main>
  </div>
}

function Reveal({children}:{children:any}){
  const ref=useRef<HTMLDivElement|null>(null)
  useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){el.classList.add('is-visible');io.unobserve(el)}},{threshold:.16});io.observe(el);return()=>io.disconnect()},[])
  return <div ref={ref} className="scroll-reveal">{children}</div>
}
function Feature({icon:Icon,text}:{icon:any;text:string}){return <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm"><Icon size={17} className="text-[#22A53A]"/>{text}</div>}
