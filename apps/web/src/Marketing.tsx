import { ArrowRight, BadgeCheck, BarChart3, Boxes, ChefHat, CreditCard, FileText, Layers3, ShieldCheck, ShoppingCart, Sparkles, Store, UsersRound, WifiOff } from 'lucide-react'
import { MauzoLogo } from './Brand'

export default function Marketing({navigate}:{navigate:(path:string)=>void}){
  return <div className="min-h-screen bg-white text-[#0F172A]">
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center px-5 lg:px-8">
        <MauzoLogo compact/>
        <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="hover:text-[#169B36]">Features</a>
          <a href="#restaurant" className="hover:text-[#169B36]">Restaurant</a>
          <a href="#operations" className="hover:text-[#169B36]">Operations</a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-7">
          <button onClick={()=>navigate('/login')} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Login</button>
          <button onClick={()=>navigate('/register')} className="rounded-xl bg-[#22A53A] px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,165,58,.2)]">Start Free Trial</button>
        </div>
      </div>
    </header>

    <main>
      <section className="relative overflow-hidden border-b border-slate-100 bg-[linear-gradient(180deg,#f4fff1_0%,#ffffff_72%)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-[440px] w-[440px] rounded-full border-[62px] border-green-100/70"/>
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
          <div className="relative z-10 flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-black text-[#169B36]"><Sparkles size={14}/>Modern POS for serious businesses</div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-[-.055em] text-[#0F172A] sm:text-6xl lg:text-[72px] lg:leading-[.98]">Sell smarter.<br/><span className="text-[#22A53A]">Run everything better.</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">MauzoPOS brings sales, restaurant operations, inventory, purchasing, approvals, customer credit, cash control and reporting into one clean business system.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={()=>navigate('/register')} className="inline-flex items-center gap-2 rounded-2xl bg-[#22A53A] px-6 py-4 text-base font-black text-white shadow-[0_16px_36px_rgba(34,165,58,.22)]">Start Free Trial <ArrowRight size={18}/></button>
              <button onClick={()=>navigate('/login')} className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-black text-slate-800">Login to MauzoPOS</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-[#22A53A]"/>No credit card required</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-[#22A53A]"/>14-day free trial</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-[#22A53A]"/>Setup in minutes</span>
            </div>
          </div>

          <div className="relative min-h-[480px]">
            <div className="absolute inset-4 rounded-[38px] bg-[#0f172a] shadow-[0_35px_90px_rgba(15,23,42,.18)]"/>
            <div className="absolute inset-x-0 top-0 mx-auto w-[92%] rounded-[30px] border border-white/10 bg-[#111b2e] p-5 text-white shadow-2xl">
              <div className="flex items-center justify-between"><MauzoLogo compact light/><div className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black text-emerald-300">LIVE BUSINESS</div></div>
              <div className="mt-7 grid grid-cols-3 gap-3">
                <Mini label="Sales today" value="UGX 4.8M"/>
                <Mini label="Orders" value="186"/>
                <Mini label="Gross profit" value="UGX 1.7M"/>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_150px] gap-3">
                <div className="rounded-2xl bg-white p-4 text-slate-900">
                  <div className="flex items-center justify-between"><b className="text-sm">Live sales</b><span className="text-[10px] font-bold text-emerald-600">+18.4%</span></div>
                  <div className="mt-5 flex h-36 items-end gap-2">{[30,52,41,70,58,82,66,92,74,88].map((h,i)=><div key={i} className="flex-1 rounded-t bg-[linear-gradient(180deg,#37C516,#22A53A)]" style={{height:h+'%'}}/>)}</div>
                </div>
                <div className="rounded-2xl bg-[#22A53A] p-4"><div className="text-xs text-green-100">Stock health</div><div className="mt-2 text-3xl font-black">96%</div><div className="mt-10 text-xs text-green-100">Real-time movement & low-stock control</div></div>
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 w-[82%] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="grid grid-cols-3 gap-3 text-center"><Benefit icon={ShoppingCart} title="Fast Sales"/><Benefit icon={ChefHat} title="Restaurant"/><Benefit icon={Boxes} title="Inventory"/></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <div className="max-w-2xl"><div className="text-xs font-black uppercase tracking-[.18em] text-[#22A53A]">One system</div><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">Everything your team needs to operate cleanly.</h2><p className="mt-4 text-slate-600">Built for retail counters, restaurants and growing multi-branch businesses without forcing staff into cluttered screens.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={ShoppingCart} title="Fast POS" text="Quick checkout, split tenders, partial payments, deposits, tax, service charge and customer balances."/>
          <Feature icon={ChefHat} title="Restaurant Operations" text="Tables, waiters, KOT/KDS, kitchen stations, modifiers, bill settlement and service workflows."/>
          <Feature icon={Boxes} title="Inventory & Recipes" text="Stock ledger, ingredients, recipes, wastage, transfers, counts, COGS and supplier purchasing."/>
          <Feature icon={ShieldCheck} title="Approvals & Control" text="Supervisor approval for purchase orders, discounts, FOC, cancellations, spoilage and sensitive actions."/>
          <Feature icon={UsersRound} title="Customers & Credit" text="Customer accounts, credit limits, outstanding balances, account payments and ledger history."/>
          <Feature icon={BarChart3} title="Reports & Reconciliation" text="Sales, payments, stock, shifts, profitability and operational reports built from transaction ledgers."/>
        </div>
      </section>

      <section id="restaurant" className="bg-[#0f172a] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div><div className="text-xs font-black uppercase tracking-[.18em] text-emerald-400">Restaurant ready</div><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">From table to kitchen to final bill.</h2><p className="mt-5 max-w-xl leading-7 text-slate-300">Run dine-in, takeaway, delivery and counter orders with clear statuses, kitchen routing, partial settlements, deposits and management controls.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DarkCard icon={Store} title="Floor & tables" text="Areas, tables, covers, transfers, reservations and open tabs."/>
            <DarkCard icon={ChefHat} title="Kitchen flow" text="KOT/KDS queues, stations, timers and ready-to-serve states."/>
            <DarkCard icon={CreditCard} title="Flexible billing" text="Cash, Mobile Money, card, bank, split and partial tenders."/>
            <DarkCard icon={FileText} title="Audit-ready" text="Approvals, comments, history, receipts and transaction traceability."/>
          </div>
        </div>
      </section>

      <section id="operations" className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <div className="rounded-[34px] border border-green-100 bg-[linear-gradient(135deg,#efffec,#ffffff)] p-8 sm:p-12 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><div className="text-xs font-black uppercase tracking-[.18em] text-[#22A53A]">Start today</div><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">A cleaner POS your team can actually enjoy using.</h2><p className="mt-4 text-slate-600">Create your workspace and explore MauzoPOS free. No credit card required.</p></div>
            <button onClick={()=>navigate('/register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22A53A] px-7 py-4 font-black text-white">Start Free Trial <ArrowRight size={18}/></button>
          </div>
        </div>
      </section>
    </main>

    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center lg:px-8"><MauzoLogo compact/><div className="sm:ml-auto">MauzoPOS · Sell smarter. Grow faster.</div></div>
    </footer>
  </div>
}

function Feature({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,.04)]"><div className="grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-[#22A53A]"><Icon size={21}/></div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>}
function DarkCard({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><Icon size={20} className="text-emerald-400"/><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>}
function Mini({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-white/5 p-3"><div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>}
function Benefit({icon:Icon,title}:{icon:any;title:string}){return <div><Icon size={18} className="mx-auto text-[#22A53A]"/><div className="mt-1 text-[11px] font-black text-slate-700">{title}</div></div>}
