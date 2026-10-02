import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Banknote, BarChart3, BookOpen, Boxes,
  ChefHat, ClipboardCheck, Copy, Download, FileText, GraduationCap, HelpCircle,
  Landmark, Link2, Mail, Printer, Search, Settings, Share2, ShieldCheck,
  ShoppingCart, Store, Truck, UserRoundCog, UsersRound, UtensilsCrossed
} from 'lucide-react'
import { MauzoLogo } from '../Brand'

type Lesson={
 id:string;title:string;role:string;icon:any;goal:string;why:string;
 steps:string[];mistakes:string[];practice:string;ready:string;
 screenshot?:{src:string;caption:string}
}

const lessons:Lesson[]=[
 {id:'orientation',title:'Getting Started with MauzoPOS',role:'Everyone',icon:GraduationCap,goal:'Understand the workspace, navigation and the difference between Operations and Management.',why:'Users work faster and make fewer mistakes when they know where daily work belongs.',steps:[
  'Sign in with your own MauzoPOS account. Never share passwords.',
  'Confirm the business name, branch and terminal before entering any transaction.',
  'Use Operations for daily service work such as Sell, Orders, Kitchen, Tables and My Shift.',
  'Use Management for Products, Inventory, Purchasing, Expenses, Accounting, Reports, Users, Branches and Settings.',
  'Use SOP / Help for the approved daily procedure; use this Training Manual to learn how to perform each task.'
 ],mistakes:['Using another staff member’s account.','Working in the wrong branch or terminal.'],practice:'Log in, identify your branch, open Operations, then open Management and return to Operations.',ready:'You can explain where to sell, where to manage stock, and where to find reports without assistance.'},

 {id:'cashier',title:'Cashier: Make a Complete Sale',role:'Cashier / Retail',icon:ShoppingCart,goal:'Complete a sale from item selection to a correct receipt.',why:'A correct sale must record the right item, quantity, payment method, staff member and stock movement.',steps:[
  'Open Sell or Checkout.',
  'Search or scan the correct product and confirm the quantity.',
  'Add a customer only when a named receipt, balance/credit or customer history is required.',
  'Review the cart before payment: item, quantity, price, discount, tax/service charge and total.',
  'Use Discount / FOC only with a clear reason and approval where required.',
  'Choose the payment method exactly as the customer paid: Cash, MTN MoMo, Airtel Money, Card, Bank or another enabled method.',
  'Use split payment only when the customer truly paid using more than one method.',
  'Complete the sale and use the generated receipt for printing or sharing.'
 ],mistakes:['Selecting Cash when the customer paid Mobile Money.','Creating a duplicate sale because the screen looked slow.','Changing stock manually instead of correcting the source transaction.'],practice:'Create a sample sale with two items, review the total, choose the correct payment method and locate the receipt.',ready:'The transaction appears in Sales History, stock is reduced where applicable, and the receipt matches the payment.',screenshot:{src:'/training/receipt.webp',caption:'Real MauzoPOS generated receipt example. Use the generated document rather than printing the application screen.'}},

 {id:'customer',title:'Customers and Open Balances',role:'Cashier / Manager',icon:UsersRound,goal:'Create clean customer records and correctly manage outstanding balances.',why:'Duplicate customer records and unrecorded repayments make balances unreliable.',steps:[
  'Search by customer name or phone before creating a new record.',
  'Create a customer only when necessary and enter a clear name and contact details.',
  'Attach the customer to a sale when customer history, balance tracking or a named receipt is needed.',
  'Use customer credit only if your business policy allows it.',
  'When a customer pays an old balance, record the payment against the correct customer.',
  'Use customer and sales history to investigate disputes before making corrections.'
 ],mistakes:['Creating a new customer every time.','Taking repayment cash without recording it against the customer balance.'],practice:'Find an existing customer, open their history and identify any current balance.',ready:'You can explain why a customer balance changed and trace it to the source sale/payment.'},

 {id:'restaurant',title:'Waiter / Restaurant Service',role:'Waiter / Restaurant',icon:UtensilsCrossed,goal:'Handle a guest from seating to a fully paid table.',why:'Restaurant service links table status, order status, kitchen tickets, waiter attribution and payment.',steps:[
  'Open Tables / Floor and select an available table.',
  'Open or continue the correct table order. Avoid a second active order for the same table.',
  'Add menu items, quantities and clear kitchen notes.',
  'Send the order so the correct Kitchen/Bar station receives it.',
  'Watch Orders and Kitchen status while serving the guest.',
  'Add additional items to the same open order when the guest orders more.',
  'Review the final bill before payment.',
  'Take the real payment method and complete the order.',
  'Reset the table according to the configured cleaning/table policy.'
 ],mistakes:['Opening duplicate orders for one table.','Failing to send notes to the kitchen.','Closing the order before payment is confirmed.'],practice:'Open a test table, add two items with one note, send it, then follow its status.',ready:'You can explain the full table journey: Available → Ordered → Kitchen → Bill → Paid → Available.'},

 {id:'kitchen',title:'Kitchen / Bar Display',role:'Kitchen / Bar',icon:ChefHat,goal:'Process live tickets in the right order without losing status.',why:'The Kitchen Display System tells service staff what is new, preparing, ready or served.',steps:[
  'Open Kitchen and watch Live Tickets.',
  'Read ticket number, order/table, station, quantities and notes.',
  'Press Start only when preparation actually begins.',
  'Press Ready only when the full item is ready for collection/service.',
  'Mark Served when applicable to your workflow.',
  'Use Rush only for genuinely urgent orders.',
  'Use the generated KOT reprint action if a kitchen ticket must be printed again.'
 ],mistakes:['Marking Ready before food is actually ready.','Using Rush for every ticket.','Creating a new order just to get another KOT.'],practice:'Identify where ticket number, timer, station and status appear on the Kitchen screen.',ready:'You can process a ticket from New to Ready/Served without asking another user what button to press.',screenshot:{src:'/training/kitchen.webp',caption:'MauzoPOS Kitchen / Live Tickets screen. New kitchen tickets appear here automatically.'}},

 {id:'products',title:'Products, Menu Items and Opening Stock',role:'Manager / Storekeeper',icon:Boxes,goal:'Create products correctly so sales and inventory work together.',why:'Poor product setup causes pricing, stock, reorder and reporting errors later.',steps:[
  'Create a clear product name and choose the correct category.',
  'Enter selling price and current unit cost.',
  'Add SKU/barcode when available.',
  'If existing physical stock already exists, enter opening quantity and select where it is located.',
  'Set a reorder level.',
  'Enable Require batch / expiry for perishable or expiry-sensitive products.',
  'After creation, never change quantity by editing the product. Use Inventory actions.'
 ],mistakes:['Entering opening stock without selecting the real location.','Editing product stock later instead of using Inventory.','Forgetting batch/expiry requirement for perishables.'],practice:'Create a sample product with cost, selling price, reorder level and opening location.',ready:'The new product appears in POS and Inventory with the correct price and opening balance.'},

 {id:'inventory',title:'Inventory / Stock Control',role:'Storekeeper / Manager',icon:Store,goal:'Know what stock exists, where it is and why every change happened.',why:'Inventory accuracy depends on controlled receipts, transfers, counts, corrections and losses.',steps:[
  'Use Stock on Hand to review product, location, quantity, reorder level, average cost and value.',
  'Use Correct Stock for found stock, missing stock, wastage, damage, expiry or spoilage. Always enter a reason.',
  'Use Move Stock to transfer stock between real locations.',
  'Use Count Stock for physical stock counts. Enter actual counted quantities, save draft if unfinished, then Post Count & Correct Stock.',
  'Create physical locations such as Main Store, Kitchen, Bar or Warehouse under Locations.',
  'Use Batches & Expiry only to label stock already on hand; assigning a batch does not increase quantity.',
  'Use Kitchen Prep to convert recipe ingredients into prepared/finished stock.',
  'Use Stock History before making a correction so you understand what caused the difference.'
 ],mistakes:['Using Correct Stock to represent a supplier delivery.','Assigning more batch quantity than is physically on hand.','Correcting stock before checking Stock History.'],practice:'Open Stock on Hand, choose one product, inspect its history, then identify its reorder level and value.',ready:'You can trace a product from current stock back to its receipts, sales, transfers, counts or corrections.'},

 {id:'purchasing',title:'Purchasing and Goods Receiving',role:'Storekeeper / Purchasing',icon:Truck,goal:'Receive supplier stock through an auditable purchase workflow.',why:'Purchasing must update supplier records, stock, cost and accounting together.',steps:[
  'Create a Purchase Order for the correct supplier and branch/location.',
  'Add ordered products, quantities and agreed costs.',
  'Submit/approve the PO if your policy requires approval.',
  'When delivery arrives, open the PO and receive the actual delivered quantity.',
  'Never receive more than the outstanding PO quantity.',
  'Enter batch/lot number and expiry date when the product requires them.',
  'Confirm actual unit cost before posting the Goods Receipt.',
  'Use Purchase Return if goods are returned to the supplier.'
 ],mistakes:['Receiving stock through Correct Stock instead of Purchasing.','Receiving the ordered quantity when the supplier delivered less.','Ignoring required batch/expiry information.'],practice:'Open an existing PO and identify ordered, already received and outstanding quantities.',ready:'You can explain how a supplier delivery becomes stock and how Mauzo records the GRN automatically.'},

 {id:'shift',title:'My Shift and Cash Drawer',role:'Cashier / Supervisor',icon:Banknote,goal:'Keep physical drawer cash explainable from opening to close.',why:'Every cash sale and cash movement affects the expected drawer balance.',steps:[
  'Open My Shift and enter the cash physically present at the start.',
  'Use Add Float only for extra drawer cash.',
  'Use Pay Out only when cash physically leaves the drawer for an approved reason.',
  'Use Cash Drop when excess cash is removed from the drawer.',
  'Use Deposit when the configured workflow requires it.',
  'Review Expected Cash during the shift.',
  'At closing, count physical cash and enter Actual Cash.',
  'Review any difference before closing the shift.'
 ],mistakes:['Entering a guessed opening cash amount.','Paying an expense from the drawer without recording it.','Closing before all genuine transactions are complete.'],practice:'Open My Shift and identify Opening, Cash Sales, Expected Cash and the available cash actions.',ready:'You can explain the expected drawer total from opening cash, sales and cash movements.'},

 {id:'expenses',title:'Expenses and Staff Allowances',role:'Manager / Accountant',icon:FileText,goal:'Record money leaving the business with payee and payment-source traceability.',why:'Expenses affect profit and may also affect a cash drawer, bank or mobile-money balance.',steps:[
  'Choose the real expense/allowance category.',
  'Enter the payee or staff member.',
  'Write a clear description and business reason.',
  'Choose the real payment method/source account.',
  'Attach receipt or supporting evidence where available.',
  'Complete manager approval when a controlled threshold requires it.',
  'Save the expense once; Mauzo posts the register and accounting automatically.'
 ],mistakes:['Choosing Cash when the payment came from Bank or Mobile Money.','Leaving the payee/description unclear.','Posting the same expense twice.'],practice:'Open Expenses and identify category, payee, payment source and evidence fields.',ready:'You can trace an expense to who received it, how it was paid and its accounting entry.'},

 {id:'approvals',title:'Manager Approvals',role:'Manager / Owner',icon:ShieldCheck,goal:'Approve controlled actions without weakening accountability.',why:'Discounts, FOC, losses, refunds and payouts may need a second person to authorise them.',steps:[
  'Open Approvals and select the pending request.',
  'Read source transaction, user, branch, reason, items and amount.',
  'Approve only when the request is justified.',
  'Reject incorrect or unclear requests and ask staff to correct the source transaction.',
  'Never give another person your manager password or PIN just to approve.'
 ],mistakes:['Approving without reading the reason.','Sharing manager credentials.','Using approval to hide an incorrect source transaction.'],practice:'Review a sample pending request and identify what information must be checked before approval.',ready:'You can explain who requested, who approved, why it was approved and what changed afterward.'},

 {id:'reports',title:'Reports and Analytics',role:'Manager / Accountant / Owner',icon:BarChart3,goal:'Generate, filter and export reports that match the on-screen records.',why:'Reports should be traceable to source transactions and filtered consistently.',steps:[
  'Open Reports → Report Centre.',
  'Choose the report first.',
  'Set From, To and Branch under the selected report.',
  'Click Generate to view source-level records on screen.',
  'Review KPI totals and detailed rows.',
  'Use Excel, CSV or Download PDF to export the same filtered report.',
  'Use Inventory vs Accounts, Stock Count Variance and other reconciliation reports when investigating differences.'
 ],mistakes:['Downloading before setting the correct date/branch.','Using browser Print instead of Download PDF.','Reading a KPI without checking source-level rows when investigating a problem.'],practice:'Generate a Sales Detail report for one branch and confirm that the exported PDF uses the same filter.',ready:'Your on-screen rows and exported report represent the same date range and branch.',screenshot:{src:'/training/sales-report.webp',caption:'Real MauzoPOS generated Sales Detail PDF. Reports are generated as branded business documents, not screenshots of the web page.'}},

 {id:'accounting',title:'Accounting for Non-Accountants',role:'Manager / Accountant',icon:Landmark,goal:'Understand what Mauzo posts automatically and when manual journals are appropriate.',why:'Most operational activity already creates accounting entries. Duplicate manual posting creates errors.',steps:[
  'Use Accounting to review journals, balances and financial statements.',
  'Remember that sales, purchases, expenses, refunds, stock counts and other workflows already post accounting automatically.',
  'Use manual journals only for genuine accounting adjustments that do not have an operational source workflow.',
  'Trace a suspicious balance to its source transaction before correcting it.',
  'Use Inventory vs Accounts reconciliation when checking stock value against the ledger.'
 ],mistakes:['Manually posting a journal for a sale or expense that Mauzo already posted.','Correcting a balance without finding the source cause.'],practice:'Open one posted journal and identify its source module/reference.',ready:'You can distinguish an automatic operational journal from a genuine manual accounting adjustment.'},

 {id:'staff',title:'Users, Roles, Branch Access and Attendance',role:'Administrator / Manager',icon:UserRoundCog,goal:'Give each person only the access needed for their work.',why:'Correct access protects cash, stock, reports and approvals.',steps:[
  'Create the staff account with correct name, email and temporary password.',
  'Assign the actual work role(s).',
  'Assign only the branches the person should access.',
  'Set a private Quick PIN when shared-terminal switching is used.',
  'Review the Role Permission Matrix for sensitive capabilities.',
  'Use Attendance for clock in/out where enabled.',
  'Disable/revoke access when a staff member leaves.'
 ],mistakes:['Giving manager/admin access to ordinary staff.','Leaving former staff accounts active.','Sharing one account among several people.'],practice:'Review one user and identify their role, branch access and sensitive permissions.',ready:'You can explain exactly why a user can or cannot open a given module.'},

 {id:'settings',title:'Business Setup, Branches and Settings',role:'Administrator / Owner',icon:Settings,goal:'Configure the system once so normal staff can operate simply.',why:'Daily users should not need to repeatedly change tax, printer, branch or restaurant rules.',steps:[
  'Keep business name, currency, contacts and branding correct.',
  'Create real branches and avoid duplicates.',
  'Configure terminals/counters used for sale attribution and shifts.',
  'Create stock locations for each physical store, kitchen, bar or warehouse.',
  'Configure restaurant floors/tables, menu categories and kitchen stations where relevant.',
  'Set normal tax/service-charge defaults in Settings.',
  'Configure receipt/bill templates, printer profiles and document rules.',
  'Review security, passwords and role permissions after major staffing changes.'
 ],mistakes:['Using Settings during a sale to fix a one-off transaction.','Creating duplicate branches/locations.'],practice:'Identify where your business logo, branch, printer and restaurant configuration are maintained.',ready:'Normal staff can operate without needing access to Settings.'},

 {id:'printing',title:'Printing, Receipts and Business Documents',role:'Everyone',icon:Printer,goal:'Use generated documents rather than screenshots/browser printing.',why:'Generated Mauzo documents preserve branding, references, totals and print audit.',steps:[
  'Use the generated receipt/bill after completing a sale/order.',
  'Use KOT print/reprint from the order or Kitchen workflow.',
  'Use Download PDF from Report Centre for reports.',
  'Use reprint/document history where available instead of recreating transactions.',
  'If a PDF does not download, confirm the browser allows downloads and that your session is still active.'
 ],mistakes:['Printing the web application screen.','Creating another sale/order just to print again.'],practice:'Open a generated receipt or report PDF and identify business name, reference number and totals.',ready:'You know which generated document to use for receipts, KOTs and reports.',screenshot:{src:'/training/receipt.webp',caption:'Generated receipt example. The business document is separate from the application screen.'}},

 {id:'endday',title:'End-of-Day Routine',role:'Cashier / Manager',icon:ClipboardCheck,goal:'Finish the day with open orders, cash, approvals and reports under control.',why:'Closing properly prevents unexplained cash, forgotten tickets and unfinished transactions.',steps:[
  'Finish genuine open orders or clearly leave legitimate outstanding orders.',
  'Confirm Kitchen has no forgotten active tickets.',
  'Record legitimate final cash movements.',
  'Count physical cash and close shifts.',
  'Managers review pending approvals, refunds, losses/spoilage, low stock and unusual cash differences.',
  'Run the required daily Sales, Cash Flow, Shift and other reports.',
  'Store/share exported PDF or Excel reports according to business policy.'
 ],mistakes:['Closing the shift before resolving genuine open cash transactions.','Ignoring pending approvals at day end.'],practice:'Use the system to identify open shifts, pending approvals and the daily reports your business needs.',ready:'The next shift can start without inheriting unexplained cash or unfinished work.'},

 {id:'troubleshooting',title:'Troubleshooting Safely',role:'Everyone',icon:HelpCircle,goal:'Solve common problems without damaging financial or inventory records.',why:'Repeated retries or manual corrections can create duplicate transactions.',steps:[
  'If a sale will not complete, check open shift, stock availability, required approval and payment source.',
  'If stock is wrong, check Stock History before using Count Stock or Correct Stock.',
  'If a user cannot see a module, check their role, permissions and branch assignment.',
  'If cash does not match, review opening cash, cash sales, payouts, drops and deposits before correcting anything.',
  'If a PDF will not download, allow downloads and confirm you are still signed in.',
  'For persistent errors, record the screen, action, time, branch, error message and transaction/reference number before contacting support.',
  'Do not repeatedly retry financial actions when you are unsure whether the first attempt posted.'
 ],mistakes:['Refreshing/retrying a payment many times.','Changing stock or cash to hide a discrepancy before investigation.'],practice:'Describe what information you would send support for a failed sale or report.',ready:'You can investigate first and avoid creating a second problem while trying to fix the first.'}
]

const rolePaths=[
 ['Cashier','orientation,cashier,customer,shift,printing,endday'],
 ['Waiter','orientation,restaurant,customer,printing,endday'],
 ['Kitchen / Bar','orientation,kitchen,printing,endday'],
 ['Storekeeper','orientation,products,inventory,purchasing,printing,troubleshooting'],
 ['Manager','orientation,restaurant,inventory,shift,expenses,approvals,reports,staff,endday,troubleshooting'],
 ['Accountant','orientation,expenses,reports,accounting,printing,endday'],
 ['Administrator / Owner','orientation,products,inventory,purchasing,approvals,reports,accounting,staff,settings,printing,troubleshooting']
]

export default function Training({onBack}:{onBack?:()=>void}){
 const [query,setQuery]=useState('')
 const [active,setActive]=useState('orientation')
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return lessons;return lessons.filter(l=>(l.title+' '+l.role+' '+l.goal+' '+l.why+' '+l.steps.join(' ')+' '+l.mistakes.join(' ')).toLowerCase().includes(q))},[query])
 const shareUrl=window.location.origin+'/training'
 const copy=async()=>{await navigator.clipboard?.writeText(shareUrl);alert('Training manual link copied')}
 const share=async()=>{if(navigator.share){await navigator.share({title:'MauzoPOS Training Manual',text:'MauzoPOS Training Manual',url:shareUrl})}else await copy()}
 const whatsapp=()=>window.open('https://wa.me/?text='+encodeURIComponent('MauzoPOS Training Manual\n'+shareUrl),'_blank','noopener,noreferrer')
 const email=()=>window.location.href='mailto:?subject='+encodeURIComponent('MauzoPOS Training Manual')+'&body='+encodeURIComponent('MauzoPOS Training Manual: '+shareUrl)
 const download=()=>{const a=document.createElement('a');a.href='/api/training/pdf';a.download='MauzoPOS-Training-Manual.pdf';document.body.appendChild(a);a.click();a.remove()}
 const go=(id:string)=>{setActive(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}

 return <div className="min-h-screen bg-[#F3F6F8] text-slate-900">
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
   <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
    <MauzoLogo/>
    <div className="hidden h-8 w-px bg-slate-200 sm:block"/>
    <div className="min-w-0"><div className="ui-eyebrow">Learning Centre</div><div className="truncate text-[13px] font-semibold text-slate-700">Complete Training Manual</div></div>
    <div className="ml-auto flex items-center gap-2">
     {onBack&&<button onClick={onBack} className="ui-btn hidden sm:inline-flex"><ArrowLeft size={14}/>Back to MauzoPOS</button>}
     <button onClick={download} className="ui-btn ui-btn-primary"><Download size={14}/><span className="hidden sm:inline">Download PDF</span></button>
     <button onClick={share} className="ui-btn"><Share2 size={14}/><span className="hidden sm:inline">Share</span></button>
    </div>
   </div>
  </header>

  <section className="border-b border-slate-200 bg-white">
   <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
    <div className="max-w-4xl">
     <div className="ui-eyebrow">MauzoPOS Training Manual</div>
     <h1 className="mt-2 text-[30px] font-bold tracking-[-.04em] text-slate-950 sm:text-[38px]">Learn the system by doing the real work.</h1>
     <p className="mt-3 max-w-3xl text-[13px] leading-6 text-slate-600">This manual teaches staff how to use MauzoPOS. Each lesson explains the goal, the workflow, mistakes to avoid, a practical exercise and a readiness check. It complements the shorter SOP rather than replacing it.</p>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
     <button onClick={download} className="ui-btn ui-btn-primary"><Download size={14}/>Download Training PDF</button>
     <button onClick={share} className="ui-btn"><Share2 size={14}/>Share</button>
     <button onClick={copy} className="ui-btn"><Copy size={14}/>Copy Link</button>
     <button onClick={whatsapp} className="ui-btn"><Link2 size={14}/>WhatsApp</button>
     <button onClick={email} className="ui-btn"><Mail size={14}/>Email</button>
     <button onClick={()=>window.location.href='/sop'} className="ui-btn"><FileText size={14}/>Open SOP</button>
    </div>
   </div>
  </section>

  <section className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6">
   <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-[12px] font-bold text-slate-900">Recommended learning paths</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{rolePaths.map(([role,ids])=><div key={role} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-[11px] font-bold text-slate-800">{role}</div><div className="mt-1 text-[10px] leading-5 text-slate-500">{ids.split(',').map(id=>lessons.find(x=>x.id===id)?.title).filter(Boolean).join(' → ')}</div></div>)}</div>
   </div>
  </section>

  <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[285px_minmax(0,1fr)]">
   <aside className="lg:sticky lg:top-[88px] lg:self-start">
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
     <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search training" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-[var(--brand-primary)]"/></div>
     <div className="mt-3 max-h-[calc(100vh-180px)] space-y-0.5 overflow-y-auto pr-1">{filtered.map(l=>{const Icon=l.icon;return <button key={l.id} onClick={()=>go(l.id)} className={'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold transition '+(active===l.id?'bg-[var(--brand-soft)] text-[var(--brand-primary)]':'text-slate-600 hover:bg-slate-50')}><Icon size={15}/><span className="min-w-0 truncate">{l.title}</span></button>})}</div>
    </div>
   </aside>

   <main className="space-y-5">
    {filtered.map((l,i)=>{const Icon=l.icon;return <section id={l.id} key={l.id} onMouseEnter={()=>setActive(l.id)} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
     <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)]"><Icon size={18}/></div><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Lesson {String(i+1).padStart(2,'0')} · {l.role}</div><h2 className="mt-0.5 text-[18px] font-bold text-slate-900">{l.title}</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">{l.goal}</p></div></div>
     </div>
     <div className="p-4 sm:p-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5"><div className="text-[10px] font-bold uppercase tracking-[.08em] text-blue-700">Why this matters</div><p className="mt-1 text-[11px] leading-5 text-blue-900">{l.why}</p></div>

      {l.screenshot&&<figure className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><img src={l.screenshot.src} alt={l.title+' screenshot'} className="max-h-[520px] w-full object-contain"/><figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-[10px] leading-4 text-slate-500"><b className="text-slate-700">Screen example:</b> {l.screenshot.caption}</figcaption></figure>}

      <div className="mt-4"><div className="ui-section-label">Step by step</div><div className="mt-2 space-y-2.5">{l.steps.map((step,n)=><div key={step} className="grid gap-3 rounded-xl border border-slate-100 p-3.5 sm:grid-cols-[32px_1fr]"><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-[11px] font-bold text-white">{n+1}</div><p className="text-[11px] leading-5 text-slate-650">{step}</p></div>)}</div></div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
       <div className="rounded-xl border border-red-100 bg-red-50 p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-red-700"><AlertTriangle size={13}/>Common mistakes</div><ul className="mt-2 space-y-1.5 pl-4 text-[10.5px] leading-5 text-red-900">{l.mistakes.map(x=><li key={x} className="list-disc">{x}</li>)}</ul></div>
       <div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-amber-700"><BookOpen size={13}/>Practice</div><p className="mt-2 text-[10.5px] leading-5 text-amber-900">{l.practice}</p></div>
       <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-emerald-700"><BadgeCheck size={13}/>You are ready when</div><p className="mt-2 text-[10.5px] leading-5 text-emerald-900">{l.ready}</p></div>
      </div>
     </div>
    </section>})}
    {!filtered.length&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-[12px] text-slate-500">No training lesson matches “{query}”.</div>}
   </main>
  </div>

  <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[10.5px] text-slate-500 sm:flex-row sm:justify-between sm:px-6"><div><b className="text-slate-700">MauzoPOS</b> · Complete Training Manual</div><div>Training explains how to learn the system. The SOP remains the approved daily procedure.</div></div></footer>
 </div>
}
