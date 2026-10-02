import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Banknote, BarChart3, BookOpen, Boxes,
  ChefHat, ClipboardCheck, Download, FileText, GraduationCap, HelpCircle,
  Landmark, Printer, Search, Settings, Share2, ShieldCheck,
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
 ],mistakes:['Selecting Cash when the customer paid Mobile Money.','Creating a duplicate sale because the screen looked slow.','Changing stock manually instead of correcting the source transaction.'],practice:'Create a sample sale with two items, review the total, choose the correct payment method and locate the receipt.',ready:'The transaction appears in Sales History, stock is reduced where applicable, and the receipt matches the payment.',screenshot:{src:'/training-assets/receipt.webp',caption:'Real MauzoPOS generated receipt example. Use the generated document rather than printing the application screen.'}},

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
 ],mistakes:['Marking Ready before food is actually ready.','Using Rush for every ticket.','Creating a new order just to get another KOT.'],practice:'Identify where ticket number, timer, station and status appear on the Kitchen screen.',ready:'You can process a ticket from New to Ready/Served without asking another user what button to press.',screenshot:{src:'/training-assets/kitchen.webp',caption:'MauzoPOS Kitchen / Live Tickets screen. New kitchen tickets appear here automatically.'}},

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
 ],mistakes:['Downloading before setting the correct date/branch.','Using browser Print instead of Download PDF.','Reading a KPI without checking source-level rows when investigating a problem.'],practice:'Generate a Sales Detail report for one branch and confirm that the exported PDF uses the same filter.',ready:'Your on-screen rows and exported report represent the same date range and branch.',screenshot:{src:'/training-assets/sales-report.webp',caption:'Real MauzoPOS generated Sales Detail PDF. Reports are generated as branded business documents, not screenshots of the web page.'}},

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
 ],mistakes:['Printing the web application screen.','Creating another sale/order just to print again.'],practice:'Open a generated receipt or report PDF and identify business name, reference number and totals.',ready:'You know which generated document to use for receipts, KOTs and reports.',screenshot:{src:'/training-assets/receipt.webp',caption:'Generated receipt example. The business document is separate from the application screen.'}},

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

export default function Training({onBack}:{onBack?:()=>void}){
 const [query,setQuery]=useState('')
 const [active,setActive]=useState('orientation')
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return lessons;return lessons.filter(l=>(l.title+' '+l.role+' '+l.goal+' '+l.why+' '+l.steps.join(' ')+' '+l.mistakes.join(' ')).toLowerCase().includes(q))},[query])
 const current=filtered.find(x=>x.id===active)||filtered[0]||lessons[0]
 const index=lessons.findIndex(x=>x.id===current.id)
 const shareUrl=window.location.origin+'/training'
 const copy=async()=>{await navigator.clipboard?.writeText(shareUrl);alert('Training link copied')}
 const share=async()=>{if(navigator.share){await navigator.share({title:'MauzoPOS Training Manual',url:shareUrl})}else await copy()}
 const download=()=>{const a=document.createElement('a');a.href='/api/training/pdf';a.download='MauzoPOS-Training-Manual.pdf';document.body.appendChild(a);a.click();a.remove()}
 const next=(d:number)=>{const x=lessons[index+d];if(x)setActive(x.id)}

 return <div className="min-h-screen bg-[#F4F6F8] text-slate-900">
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
   <div className="mx-auto flex h-16 max-w-[1460px] items-center gap-3 px-4 sm:px-6">
    <MauzoLogo/>
    <div className="hidden h-7 w-px bg-slate-200 sm:block"/>
    <div className="hidden sm:block"><div className="text-[12px] font-bold text-slate-800">Training Manual</div><div className="text-[11px] text-slate-500">Learn by doing</div></div>
    <div className="ml-auto flex items-center gap-2">
     {onBack&&<button onClick={onBack} className="ui-btn"><ArrowLeft size={15}/>Back</button>}
     <button onClick={download} className="ui-btn ui-btn-primary"><Download size={15}/><span className="hidden sm:inline">PDF</span></button>
     <button onClick={share} className="ui-btn"><Share2 size={15}/><span className="hidden sm:inline">Share</span></button>
    </div>
   </div>
  </header>

  <div className="border-b border-slate-200 bg-white">
   <div className="mx-auto flex max-w-[1460px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
    <a href="/sop" className="rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">SOP</a>
    <a href="/training" className="rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-semibold text-white">Training Manual</a>
    <a href="/docs" className="rounded-lg px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Documentation</a>
    <div className="ml-auto relative w-full sm:w-72"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search training" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--brand-primary)]"/></div>
   </div>
  </div>

  <div className="mx-auto grid max-w-[1460px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[275px_minmax(0,1fr)]">
   <aside className="lg:sticky lg:top-[132px] lg:self-start">
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
     <div className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[.08em] text-slate-400">Lessons</div>
     <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
      {filtered.map(l=>{const Icon=l.icon;return <button key={l.id} onClick={()=>setActive(l.id)} className={'mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12px] font-semibold '+(current.id===l.id?'bg-[var(--brand-soft)] text-[var(--brand-primary)]':'text-slate-600 hover:bg-slate-50')}><Icon size={16}/><span className="min-w-0"><span className="block truncate">{l.title}</span><span className="block truncate text-[10px] font-medium opacity-60">{l.role}</span></span></button>})}
     </div>
    </div>
   </aside>

   <main>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
     <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-4">
       <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)]">{(()=>{const I=current.icon;return <I size={20}/>})()}</div>
       <div><div className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--brand-primary)]">Lesson {String(index+1).padStart(2,'0')} · {current.role}</div><h1 className="mt-1 text-[24px] font-bold tracking-[-.025em] text-slate-950">{current.title}</h1><p className="mt-1 text-[13px] leading-6 text-slate-600">{current.goal}</p></div>
      </div>
     </div>

     <div className="p-5 sm:p-6">
      <div className={'grid gap-5 '+(current.screenshot?'xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]':'')}>
       <div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="text-[11px] font-bold text-blue-800">Why this matters</div><p className="mt-1 text-[13px] leading-6 text-blue-900">{current.why}</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{current.steps.map((step,n)=><div key={step} className="rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 text-[12px] font-bold text-white">{n+1}</div><p className="text-[13px] leading-6 text-slate-650">{step}</p></div></div>)}</div>
       </div>
       {current.screenshot&&<figure className="self-start overflow-hidden rounded-xl border border-slate-200 bg-slate-50 xl:sticky xl:top-[145px]"><img src={current.screenshot.src} alt={current.title} className="max-h-[520px] w-full object-contain"/><figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-[12px] leading-5 text-slate-600">{current.screenshot.caption}</figcaption></figure>}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
       <div className="rounded-xl border border-red-100 bg-red-50 p-4"><div className="flex items-center gap-2 text-[12px] font-bold text-red-800"><AlertTriangle size={15}/>Avoid</div><div className="mt-2 space-y-2">{current.mistakes.map(x=><div key={x} className="flex gap-2 text-[12px] leading-5 text-red-900"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"/><span>{x}</span></div>)}</div></div>
       <div className="rounded-xl border border-amber-100 bg-amber-50 p-4"><div className="flex items-center gap-2 text-[12px] font-bold text-amber-800"><BookOpen size={15}/>Practice</div><p className="mt-2 text-[12px] leading-5 text-amber-900">{current.practice}</p></div>
       <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-[12px] font-bold text-emerald-800"><BadgeCheck size={15}/>Ready when</div><p className="mt-2 text-[12px] leading-5 text-emerald-900">{current.ready}</p></div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
       <button disabled={index<=0} onClick={()=>next(-1)} className="ui-btn disabled:opacity-30"><ArrowLeft size={14}/>Previous</button>
       <div className="text-[11px] font-semibold text-slate-400">{index+1} / {lessons.length}</div>
       <button disabled={index>=lessons.length-1} onClick={()=>next(1)} className="ui-btn disabled:opacity-30">Next<ArrowRight size={14}/></button>
      </div>
     </div>
    </section>
   </main>
  </div>
 </div>
}
