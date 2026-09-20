import { useEffect, useRef } from 'react'
import { ArrowRight, BarChart3, Boxes, CreditCard, ShoppingCart, Store, UsersRound, CheckCircle2, UtensilsCrossed, Pill, ShieldCheck, ScanLine, Layers3, Building2, ReceiptText } from 'lucide-react'
import { MauzoLogo } from './Brand'

const solutions=[
  {name:'Retail & Shops',line:'Fast checkout, barcode sales and live stock.',icon:Store},
  {name:'Restaurants & Cafés',line:'Tables, kitchen tickets, orders and billing.',icon:UtensilsCrossed},
  {name:'Supermarkets',line:'High-volume scanning, inventory and branches.',icon:ShoppingCart},
  {name:'Pharmacies',line:'Products, stock, customers and controlled sales.',icon:Pill},
  {name:'Multi-branch Business',line:'Central visibility with branch-level control.',icon:Building2},
  {name:'Any Growing Business',line:'Turn modules on as your operation expands.',icon:Layers3},
]

const capabilities=[
  {icon:ScanLine,title:'Fast checkout',text:'Search, scan and sell without slowing down the counter.'},
  {icon:Boxes,title:'Inventory',text:'Stock, suppliers, purchasing and movement history in one place.'},
  {icon:CreditCard,title:'Flexible payments',text:'Cash, mobile money, card and split tender workflows.'},
  {icon:UsersRound,title:'Roles & shifts',text:'Give every staff member only the access they need.'},
  {icon:BarChart3,title:'Reports',text:'Sales, profit, stock and shift reconciliation when you need them.'},
  {icon:ShieldCheck,title:'Business controls',text:'Approvals, audit trails and multi-branch management built in.'},
]

export default function Marketing({navigate}:{navigate:(path:string)=>void}){
  return <div className="min-h-screen bg-white text-[#172033]">
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center px-4 sm:px-6">
        <MauzoLogo compact/>
        <nav className="ml-auto hidden items-center gap-7 text-[13px] text-slate-500 md:flex">
          <a className="transition hover:text-slate-950" href="#solutions">Solutions</a>
          <a className="transition hover:text-slate-950" href="#features">Features</a>
          <a className="transition hover:text-slate-950" href="#why">Why MauzoPOS</a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-7">
          <button onClick={()=>navigate('/login')} className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">Log in</button>
          <button onClick={()=>navigate('/register')} className="rounded-lg bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-slate-800">Start free</button>
        </div>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#F3F6F8]">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[.92fr_1.08fr] lg:py-24">
          <div className="max-w-[620px]">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">Point of sale · Inventory · Operations · Reporting</div>
            <h1 className="mt-6 text-[44px] font-semibold leading-[1.01] tracking-[-.052em] text-slate-950 sm:text-[58px] lg:text-[68px]">One POS.<br/><span className="text-[#22A53A]">Every business.</span></h1>
            <p className="mt-6 max-w-[560px] text-[16px] leading-7 text-slate-500 sm:text-[17px]">MauzoPOS brings checkout, stock, customers, staff, branches, payments and reports into one clean system — with specialized modules when your business needs them.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-xl bg-[#22A53A] px-5 py-3.5 text-[14px] font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">Start free trial <ArrowRight size={16}/></button>
              <button onClick={()=>navigate('/login')} className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-[14px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Log in</button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#22A53A]"/>No credit card</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#22A53A]"/>Works across devices</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#22A53A]"/>Built for growing teams</span>
            </div>
          </div>

          <Reveal>
            <ProductPreview/>
          </Reveal>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#22A53A]">Flexible by design</div>
            <h2 className="mt-2 text-[32px] font-semibold tracking-[-.04em] text-slate-950 sm:text-[40px]">Start with POS.<br/>Add what you need.</h2>
          </div>
          <p className="max-w-2xl text-[14px] leading-6 text-slate-500 lg:justify-self-end">Restaurant is one module — not the whole product. MauzoPOS is designed as a general business platform, so the same core can support a shop, supermarket, restaurant, pharmacy or multi-branch operation.</p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {solutions.map(s=><Reveal key={s.name}><article className="group h-full rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(15,23,42,.07)]">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f8f3] text-[#22A53A]"><s.icon size={19}/></div>
            <h3 className="mt-5 text-[16px] font-semibold text-slate-900">{s.name}</h3>
            <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{s.line}</p>
          </article></Reveal>)}
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-[#f8faf9]">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#22A53A]">Core platform</div>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-.04em] text-slate-950 sm:text-[38px]">Everything around the sale stays connected</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(c=><article key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><c.icon size={18}/></div>
                <div><h3 className="text-[14px] font-semibold text-slate-900">{c.title}</h3><p className="mt-1 text-[11.5px] leading-5 text-slate-500">{c.text}</p></div>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="why" className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-6 text-white lg:col-span-2">
            <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">Made for real operations</div>
            <h3 className="mt-3 max-w-xl text-[28px] font-semibold tracking-[-.04em]">Fewer manual steps. Cleaner staff workflows. Better control.</h3>
            <div className="mt-7 grid gap-2 sm:grid-cols-3">
              <Mini icon={ScanLine} text="Scan-to-cart"/>
              <Mini icon={ReceiptText} text="Clean receipts"/>
              <Mini icon={ShieldCheck} text="Role-based access"/>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#22A53A]">Get started</div>
            <h3 className="mt-3 text-[24px] font-semibold tracking-[-.035em] text-slate-950">Set up your workspace and start selling.</h3>
            <button onClick={()=>navigate('/register')} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#22A53A] px-5 py-3 text-[13px] font-medium text-white">Start free trial <ArrowRight size={15}/></button>
            <button onClick={()=>navigate('/login')} className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-3 text-[13px] font-medium text-slate-600">Already have an account?</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <MauzoLogo compact/>
          <span>Point of sale · Inventory · Operations · Reporting</span>
        </div>
      </footer>
    </main>
  </div>
}

function ProductPreview(){
  return <div className="relative mx-auto w-full max-w-[660px]">
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,.12)]">
      <div className="flex h-12 items-center border-b border-slate-100 px-4">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/></div>
        <div className="mx-auto text-[10px] font-medium text-slate-400">MauzoPOS Workspace</div>
        <div className="w-[42px]"/>
      </div>
      <div className="grid min-h-[420px] grid-cols-[150px_1fr] sm:grid-cols-[180px_1fr]">
        <aside className="border-r border-slate-100 bg-[#fafbfc] p-3">
          <div className="mb-4 flex items-center gap-2 px-2"><div className="h-7 w-7 rounded-lg bg-[#22A53A]"/><div><div className="h-2.5 w-16 rounded bg-slate-800"/><div className="mt-1 h-1.5 w-10 rounded bg-slate-200"/></div></div>
          {['Overview','POS','Products','Inventory','Customers','Reports'].map((x,i)=><div key={x} className={'mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[9px] '+(i===1?'bg-[#edf8ef] font-semibold text-[#16822c]':'text-slate-400')}><span className={'h-2 w-2 rounded-full '+(i===1?'bg-[#22A53A]':'bg-slate-200')}/>{x}</div>)}
        </aside>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div><div className="text-[10px] text-slate-400">Today</div><div className="mt-1 text-[17px] font-semibold text-slate-900">Fast checkout</div></div>
            <div className="rounded-lg bg-[#22A53A] px-3 py-2 text-[9px] font-semibold text-white">New Sale</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <PreviewStat label="Sales" value="UGX 2.8M"/>
            <PreviewStat label="Orders" value="184"/>
            <PreviewStat label="Stock alerts" value="7"/>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-xl border border-slate-100 p-3">
              <div className="h-8 rounded-lg bg-slate-50 px-3 py-2 text-[8px] text-slate-300">Search or scan product</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {['Coffee','Sneakers','Rice 5kg','Vitamin C'].map((x,i)=><div key={x} className="rounded-xl border border-slate-100 bg-white p-2">
                  <div className={'h-14 rounded-lg '+['bg-amber-50','bg-blue-50','bg-emerald-50','bg-rose-50'][i]}/>
                  <div className="mt-2 text-[8px] font-semibold text-slate-700">{x}</div><div className="mt-1 text-[7px] text-[#22A53A]">UGX {(i+1)*5000}</div>
                </div>)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <div className="text-[8px] text-slate-400">Current sale</div>
              <div className="mt-3 space-y-2">{[['Coffee','2'],['Rice 5kg','1'],['Vitamin C','1']].map(([n,q])=><div key={n} className="flex justify-between text-[8px]"><span>{n}</span><span className="text-slate-400">× {q}</span></div>)}</div>
              <div className="mt-5 border-t border-white/10 pt-3"><div className="flex justify-between text-[8px] text-slate-400"><span>Total</span><span>4 items</span></div><div className="mt-1 text-[16px] font-semibold">UGX 42,000</div></div>
              <div className="mt-3 rounded-lg bg-[#22A53A] py-2 text-center text-[8px] font-semibold">Take Payment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

function PreviewStat({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><div className="text-[7px] text-slate-400">{label}</div><div className="mt-1 text-[11px] font-semibold text-slate-800">{value}</div></div>}
function Mini({icon:Icon,text}:{icon:any;text:string}){return <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-3 text-[11px] text-slate-300"><Icon size={15}/>{text}</div>}
function Reveal({children}:{children:any}){const ref=useRef<HTMLDivElement|null>(null);useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){el.classList.add('is-visible');io.unobserve(el)}},{rootMargin:'0px 0px -8% 0px',threshold:.08});io.observe(el);return()=>io.disconnect()},[]);return <div ref={ref} className="scroll-reveal h-full">{children}</div>}
