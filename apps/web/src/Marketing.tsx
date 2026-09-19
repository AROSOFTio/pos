import { ArrowRight, BarChart3, Boxes, CreditCard, ShoppingCart, Store, UsersRound } from 'lucide-react'
import { MauzoLogo } from './Brand'

const modules=[
  {name:'Restaurant',sub:'Tables · Kitchen · Orders',img:'/brand/restaurant.webp'},
  {name:'Retail',sub:'Barcode · Stock · Checkout',img:'/brand/supermarket.webp'},
  {name:'Pharmacy',sub:'Medicines · Sales · Stock',img:'/brand/pharmacy.webp'},
  {name:'Boutique',sub:'Fashion · Inventory · Sales',img:'/brand/boutique.webp'},
  {name:'Analytics',sub:'Reports · Profit · Trends',img:'/brand/analytics.webp'},
]

export default function Marketing({navigate}:{navigate:(path:string)=>void}){
  return <div className="min-h-screen bg-white text-[#0f172a]">
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center px-5 lg:px-8">
        <MauzoLogo compact/>
        <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a href="#modules">Modules</a><a href="#features">Features</a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-7">
          <button onClick={()=>navigate('/login')} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Login</button>
          <button onClick={()=>navigate('/register')} className="rounded-xl bg-[#22A53A] px-4 py-2.5 text-sm font-black text-white">Start Free Trial</button>
        </div>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_82%_12%,rgba(34,165,58,.12),transparent_25%),linear-gradient(180deg,#fbfffb_0%,#fff_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="w-fit rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[#169B36]">One POS · Every business</div>
            <h1 className="mt-5 text-5xl font-black tracking-[-.055em] sm:text-6xl lg:text-[74px] lg:leading-[.96]">One POS.<br/><span className="text-[#22A53A]">Multiple Industries.</span></h1>
            <div className="mt-5 text-lg font-medium text-slate-500">Restaurant · Retail · Pharmacy · Boutique · More</div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-2xl bg-[#22A53A] px-6 py-4 font-black text-white shadow-[0_16px_34px_rgba(34,165,58,.18)]">Start Free Trial <ArrowRight size={18}/></button>
              <button onClick={()=>navigate('/login')} className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black">Login</button>
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-400">No credit card required</div>
          </div>
          <div className="hero-float relative min-h-[410px] overflow-hidden rounded-[34px] border border-slate-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,.10)]">
            <img src="/brand/retail.webp" alt="MauzoPOS retail" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/>
            <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-2">
              <Mini icon={ShoppingCart} label="Fast Sales"/><Mini icon={Boxes} label="Inventory"/><Mini icon={BarChart3} label="Reports"/>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8">
        <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.16em] text-[#22A53A]">Modules</div><h2 className="mt-2 text-3xl font-black tracking-[-.035em]">Built for your industry</h2></div></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((m,i)=><article key={m.name} className="module-card group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,.05)]" style={{animationDelay:(i*90)+'ms'}}>
            <div className="aspect-[4/3] overflow-hidden bg-slate-50"><img src={m.img} alt={m.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" onError={e=>{e.currentTarget.style.display='none'}}/></div>
            <div className="p-4"><div className="font-black">{m.name}</div><div className="mt-1 text-xs text-slate-400">{m.sub}</div></div>
          </article>)}
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-[#fbfcfb]">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-3 px-5 py-9 sm:grid-cols-3 lg:grid-cols-6 lg:px-8">
          <Feature icon={ShoppingCart} text="Fast Checkout"/><Feature icon={Boxes} text="Inventory"/><Feature icon={CreditCard} text="Payments"/><Feature icon={BarChart3} text="Reports"/><Feature icon={Store} text="Multi-branch"/><Feature icon={UsersRound} text="Staff Control"/>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-14 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 rounded-[28px] bg-[linear-gradient(120deg,#efffec,#fff)] p-7 text-center sm:flex-row sm:text-left lg:p-10">
          <div><h3 className="text-2xl font-black">Ready to start?</h3><div className="mt-1 text-sm text-slate-500">14-day free trial · No card</div></div>
          <div className="flex gap-3"><button onClick={()=>navigate('/register')} className="rounded-xl bg-[#22A53A] px-5 py-3 font-black text-white">Start Free Trial</button><button onClick={()=>navigate('/login')} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-black">Login</button></div>
        </div>
      </section>
    </main>
  </div>
}
function Mini({icon:Icon,label}:{icon:any;label:string}){return <div className="rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-center shadow-sm backdrop-blur"><Icon size={17} className="mx-auto text-[#22A53A]"/><div className="mt-1 text-[11px] font-black">{label}</div></div>}
function Feature({icon:Icon,text}:{icon:any;text:string}){return <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm"><Icon size={17} className="text-[#22A53A]"/>{text}</div>}
