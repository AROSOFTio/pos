import { useEffect, useRef } from 'react'
import { ArrowRight, BarChart3, Boxes, CreditCard, ShoppingCart, Store, UsersRound, CheckCircle2, UtensilsCrossed, Pill, Sparkles } from 'lucide-react'
import { MauzoLogo } from './Brand'

const modules=[
  {name:'Restaurant',tag:'Restaurant',line:'Tables, kitchen, orders and billing.',img:'/brand/restaurant.webp',icon:UtensilsCrossed},
  {name:'Supermarket',tag:'Retail',line:'Fast barcode checkout and live stock.',img:'/brand/supermarket.webp',icon:Store},
  {name:'Pharmacy',tag:'Pharmacy',line:'Medicines, batches, customers and sales.',img:'/brand/pharmacy.webp',icon:Pill},
  {name:'Boutique',tag:'Fashion',line:'Products, customers and checkout.',img:'/brand/boutique.webp',icon:ShoppingCart},
  {name:'Analytics',tag:'Reports',line:'Sales, profit, payments and trends.',img:'/brand/analytics.webp',icon:BarChart3},
]

export default function Marketing({navigate}:{navigate:(path:string)=>void}){
  return <div className="min-h-screen bg-white text-[#172033]">
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center px-4 sm:px-6">
        <MauzoLogo compact/>
        <nav className="ml-auto hidden items-center gap-6 text-[13px] text-slate-500 md:flex">
          <a className="hover:text-slate-900" href="#modules">Solutions</a>
          <a className="hover:text-slate-900" href="#features">Features</a>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-6">
          <button onClick={()=>navigate('/login')} className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Login</button>
          <button onClick={()=>navigate('/register')} className="rounded-lg bg-[#22A53A] px-3.5 py-2 text-[13px] font-medium text-white">Start Free Trial</button>
        </div>
      </div>
    </header>

    <main>
      <section className="border-b border-slate-100 bg-[linear-gradient(180deg,#fbfefb_0%,#fff_100%)]">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:py-18">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700"><Sparkles size={13}/>One POS for every business</div>
            <h1 className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-.045em] text-slate-950 sm:text-[56px] lg:text-[64px]">Sell simply.<br/><span className="text-[#22A53A]">Run everything.</span></h1>
            <p className="mt-5 max-w-lg text-[16px] leading-7 text-slate-500">Sales, restaurant operations, stock, purchases, staff and reports in one clean workspace.</p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-lg bg-[#22A53A] px-5 py-3 text-[14px] font-medium text-white">Start Free Trial <ArrowRight size={16}/></button>
              <button onClick={()=>navigate('/login')} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-[14px] font-medium text-slate-700">Login</button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-400"><CheckCircle2 size={14} className="text-[#22A53A]"/>14 days free · No credit card</div>
          </div>

          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white premium-shadow">
              <img src="/brand/hero.webp" alt="MauzoPOS for restaurants, retail, pharmacy and more" className="aspect-[16/11] w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6 lg:py-18">
        <div className="max-w-xl">
          <div className="text-[10px] font-medium uppercase tracking-[.16em] text-[#22A53A]">Solutions</div>
          <h2 className="mt-2 text-[30px] font-semibold tracking-[-.035em] text-slate-950 sm:text-[36px]">Built around your business</h2>
          <p className="mt-2 text-[14px] leading-6 text-slate-500">Activate only the modules you need.</p>
        </div>

        <div className="mt-9 space-y-6">
          {modules.map((m,i)=><Reveal key={m.name}>
            <article className="grid items-center overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfc] lg:grid-cols-2">
              <div className={i%2?'lg:order-2':''}><img src={m.img} alt={m.name} className="aspect-[16/10] w-full object-cover" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/></div>
              <div className={'p-6 sm:p-8 lg:p-10 '+(i%2?'lg:order-1':'')}>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-[#22A53A]"><m.icon size={18}/></div>
                <div className="mt-5 text-[10px] font-medium uppercase tracking-[.14em] text-[#22A53A]">{m.tag}</div>
                <h3 className="mt-1 text-[28px] font-semibold tracking-[-.03em] text-slate-950">{m.name}</h3>
                <p className="mt-2 text-[14px] leading-6 text-slate-500">{m.line}</p>
              </div>
            </article>
          </Reveal>)}
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-[#f8faf9]">
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Feature icon={ShoppingCart} text="Checkout"/>
            <Feature icon={Boxes} text="Inventory"/>
            <Feature icon={CreditCard} text="Payments"/>
            <Feature icon={BarChart3} text="Reports"/>
            <Feature icon={Store} text="Multi-branch"/>
            <Feature icon={UsersRound} text="Staff"/>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 sm:flex-row sm:items-center sm:p-8">
          <div><h3 className="text-[24px] font-semibold tracking-[-.03em] text-slate-950">Ready to try MauzoPOS?</h3><p className="mt-1 text-[13px] text-slate-500">Create your workspace in minutes.</p></div>
          <button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-lg bg-[#22A53A] px-5 py-3 text-[14px] font-medium text-white">Start Free Trial <ArrowRight size={16}/></button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 text-[12px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6"><MauzoLogo compact/><span>Sales · Operations · Reporting</span></div>
      </footer>
    </main>
  </div>
}

function Reveal({children}:{children:any}){
  const ref=useRef<HTMLDivElement|null>(null)
  useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){el.classList.add('is-visible');io.unobserve(el)}},{rootMargin:'0px 0px -8% 0px',threshold:.08});io.observe(el);return()=>io.disconnect()},[])
  return <div ref={ref} className="scroll-reveal">{children}</div>
}
function Feature({icon:Icon,text}:{icon:any;text:string}){return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[12px] font-medium text-slate-700"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-[#22A53A]"><Icon size={15}/></div>{text}</div>}
