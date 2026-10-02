import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, Banknote, BarChart3, Boxes, Building2,
  CheckCircle2, ChefHat, ClipboardCheck, Copy, Download, HelpCircle, Landmark,
  Link2, Mail, PackageCheck, Printer, ReceiptText, Search, Settings, Share2,
  ShieldCheck, ShoppingCart, Store, Truck, UserRoundCog, UsersRound, UtensilsCrossed
} from 'lucide-react'
import { MauzoLogo } from '../Brand'

type Step={title:string;body:string}
type SOPSection={id:string;title:string;icon:any;summary:string;steps:Step[];notes?:string[]}

const sections:SOPSection[]=[
 {id:'start',title:'Start of Day',icon:CheckCircle2,summary:'What every staff member should do before transactions begin.',steps:[
  {title:'Sign in using your own account',body:'Use your own MauzoPOS account. On shared terminals, use Switch Staff by PIN only after management has assigned your Quick PIN.'},
  {title:'Confirm the business and branch',body:'Check the business name, branch and terminal before doing any transaction.'},
  {title:'Open your shift',body:'Go to My Shift, confirm the correct counter, enter the physical opening cash in the drawer, then open the shift.'},
  {title:'Check alerts',body:'Review notifications for approvals, low stock, offline devices or other issues that need attention before service starts.'}
 ],notes:['Never share passwords or Quick PINs.','Do not use another cashier’s open shift.']},

 {id:'sales',title:'POS / Retail Sales',icon:ShoppingCart,summary:'Make a normal counter, retail or supermarket sale.',steps:[
  {title:'Open Sell or Checkout',body:'Use Sell for standard POS businesses or Checkout for supermarket/retail businesses.'},
  {title:'Find products',body:'Search by name, SKU or barcode. Confirm the item and quantity before adding it to the sale.'},
  {title:'Add customer only when needed',body:'Select or create a customer when the sale needs customer history, credit/balance tracking or a named receipt.'},
  {title:'Review the bill',body:'Check items, quantities, discount, tax/service charge and total before payment.'},
  {title:'Apply Discount / FOC correctly',body:'Enter the reason. If approval is required, send the request and wait for approval before completing the sale.'},
  {title:'Take the real payment method',body:'Choose Cash, MTN MoMo, Airtel Money, Card, Bank or another enabled method exactly as the customer paid. Use split payment only when the customer truly used more than one method.'},
  {title:'Complete the sale',body:'Finish the sale and print/download the generated receipt if required. The sale is then available in Sales History and reports.'}
 ],notes:['Never select Cash for a mobile-money or bank payment.','Do not edit tax/service settings during a normal sale unless authorised.']},

 {id:'customers',title:'Customers & Balances',icon:UsersRound,summary:'Maintain customer records and open balances clearly.',steps:[
  {title:'Create or find the customer',body:'Use Customers to search by name or phone. Avoid duplicate customer records.'},
  {title:'Use customer credit only when authorised',body:'If a sale is allowed on account, confirm the customer and balance before completing it.'},
  {title:'Record repayments properly',body:'When a customer pays an outstanding balance, record the payment against that customer so the balance reduces correctly.'},
  {title:'Check history before disputes',body:'Use customer and sales history to confirm receipts, payments and outstanding balances.'}
 ]},

 {id:'restaurant',title:'Restaurant Service',icon:UtensilsCrossed,summary:'Tables, dine-in, takeaway, delivery and reservations.',steps:[
  {title:'Open Tables / Floor',body:'Use the Restaurant Floor to see available, occupied, reserved and dirty tables.'},
  {title:'Seat the guest',body:'Select an available table and start/open the order. Do not create a second active order for the same table.'},
  {title:'Add items and notes',body:'Add menu items, quantities and any kitchen notes before sending.'},
  {title:'Send to kitchen/bar',body:'Send the order so the correct station receives the KOT.'},
  {title:'Follow order status',body:'Use Orders and Kitchen to follow New, Preparing and Ready items.'},
  {title:'Bill and receive payment',body:'Open the table bill, review all items, take the correct payment and complete the order.'},
  {title:'Reset the table',body:'After payment, follow the configured cleaning policy so the table becomes available again.'},
  {title:'Reservations, waitlist and delivery',body:'Use the matching Restaurant tabs. Record guest name, contact and service notes clearly for the next staff member.'}
 ]},

 {id:'kitchen',title:'Kitchen / Bar',icon:ChefHat,summary:'Handle live KOTs without losing order status.',steps:[
  {title:'Watch Live Tickets',body:'New tickets appear automatically. Read the table/order number, station, quantities and notes.'},
  {title:'Start preparation',body:'Press Start only when preparation actually begins.'},
  {title:'Mark Ready',body:'Press Ready only when the full item is ready for service or pickup.'},
  {title:'Mark Served when applicable',body:'Complete the final status when the item has left the station.'},
  {title:'Use Rush only when necessary',body:'Rush highlights urgent tickets; do not use it for every order.'},
  {title:'Reprint KOT when needed',body:'Use the generated KOT PDF/reprint action rather than creating another order.'}
 ]},

 {id:'products',title:'Products & Menu Items',icon:Boxes,summary:'Create items correctly so sales and stock remain accurate.',steps:[
  {title:'Create the product',body:'Enter a clear product name, selling price, cost, category and barcode/SKU where available.'},
  {title:'Set opening stock carefully',body:'If the item already has stock, enter the opening quantity and choose where the stock is physically located.'},
  {title:'Set reorder level',body:'Use the default reorder level or location-specific levels in Inventory.'},
  {title:'Enable batch/expiry tracking when needed',body:'Turn on Require batch / expiry for food, drinks, medicine or other expiry-sensitive stock.'},
  {title:'Choose how the item is restocked',body:'Set Bought from supplier, Prepared / produced here, or Both. This controls the correct refill action shown in Inventory.'},
  {title:'Use Inventory for later quantity changes',body:'After creation, never edit stock by changing the product record. Use Add / Refill Stock, Receive Delivery, Move Stock, Count Stock or Correct Stock as appropriate.'}
 ]},

 {id:'inventory',title:'Inventory / Stock',icon:Store,summary:'Know what stock exists, where it is and why it changed.',steps:[
  {title:'Check Stock on Hand',body:'Review product, branch/location, quantity, reorder level, average cost and stock value.'},
  {title:'Add / Refill Stock',body:'Use when your team prepares or produces more of an item. Example: Chapati 10 + prepared 50 = 60 available.'},
  {title:'Receive Delivery',body:'Use Purchasing when a supplier brings stock. Creating a Purchase Order alone does not increase stock; receiving the delivery does.'},
  {title:'Correct Stock',body:'Use only when physical stock is unexpectedly different from Mauzo: found extra stock, missing stock, damage, wastage, expiry or spoilage. Enter a clear reason.'},
  {title:'Move Stock',body:'Select From location, To location, product and quantity. Mauzo records both sides of the transfer automatically.'},
  {title:'Count Stock',body:'Start a physical count for one location, count every item, enter actual quantities, save as draft if unfinished, then Post Count & Correct Stock when complete.'},
  {title:'Manage stock locations',body:'Create stores, kitchens, bars or warehouses under Locations.'},
  {title:'Assign batch / expiry',body:'Use Batches & Expiry only to label stock already on hand. This action does not increase stock.'},
  {title:'Prepare kitchen batches',body:'Use Kitchen Prep to convert recipe ingredients into prepared/finished quantities while Mauzo calculates the cost.'}
 ],notes:['Supplier deliveries should normally enter stock through Purchasing / Goods Receipt.','Wastage and spoilage may require manager approval before stock changes.']},

 {id:'purchasing',title:'Purchasing & Receiving',icon:Truck,summary:'Order from suppliers and receive deliveries into stock.',steps:[
  {title:'Create the Purchase Order',body:'Choose supplier, branch/location and the required items/quantities.'},
  {title:'Submit / approve when required',body:'Follow the approval workflow before receiving if the business requires approval.'},
  {title:'Receive the delivery',body:'Open the approved PO and receive the actual quantities delivered. Do not receive more than the outstanding PO quantity.'},
  {title:'Enter batch / expiry when required',body:'For batch-controlled products, lot number and expiry date must be entered before receiving.'},
  {title:'Confirm unit cost',body:'Use the actual supplier cost shown on the delivery/invoice.'},
  {title:'Post Goods Receipt',body:'When received, Mauzo increases stock, updates weighted cost, records the GRN and posts the supplier/inventory accounting automatically.'},
  {title:'Handle supplier returns',body:'Use the Purchase Return workflow so stock and supplier payable are both corrected.'}
 ]},

 {id:'suppliers',title:'Suppliers',icon:PackageCheck,summary:'Keep supplier records clean and usable.',steps:[
  {title:'Create one record per supplier',body:'Use the supplier’s real name, phone/email and payment details where available.'},
  {title:'Link products to suppliers',body:'This makes purchasing faster and improves supplier/product traceability.'},
  {title:'Use Purchasing for stock deliveries',body:'Do not manually increase inventory to represent a supplier delivery.'}
 ]},

 {id:'shifts',title:'Shifts & Cash Drawer',icon:Banknote,summary:'Control physical cash from opening to close.',steps:[
  {title:'Open Shift',body:'Enter the cash physically in the drawer at the start of the shift.'},
  {title:'Use the correct cash action',body:'Add Float for extra starting cash, Pay Out for approved cash expenses, Cash Drop for removing excess cash and Deposit where configured.'},
  {title:'Check Expected Cash',body:'Mauzo calculates what should be in the drawer from opening cash, cash sales and cash movements.'},
  {title:'Count physical cash at close',body:'Enter actual cash counted and review any difference.'},
  {title:'Close Shift',body:'Close only after all sales and cash movements are complete. Managers/accountants can review reconciliation and discrepancies.'}
 ],notes:['Never use a cash payout to hide an expense. Record the real reason/payee.']},

 {id:'expenses',title:'Expenses & Allowances',icon:ReceiptText,summary:'Record money leaving the business with full traceability.',steps:[
  {title:'Choose the expense category',body:'Select the real type of expense or staff allowance.'},
  {title:'Enter payee / staff member',body:'Record who received the money and a useful description.'},
  {title:'Choose how it was paid',body:'Select the actual Cash, Bank, MTN, Airtel, Card or other payment source.'},
  {title:'Attach evidence',body:'Add receipt/invoice/evidence where available.'},
  {title:'Use approvals when required',body:'Large cash payouts or controlled expenses may require manager approval.'},
  {title:'Save once',body:'Mauzo records the expense register and accounting automatically. Cash expenses also affect the active shift.'}
 ]},

 {id:'approvals',title:'Approvals',icon:ShieldCheck,summary:'Approve controlled actions without bypassing controls.',steps:[
  {title:'Open Approvals',body:'Review pending discounts, FOC, wastage/spoilage, refunds, voids, cash payouts or other controlled requests.'},
  {title:'Read the source details',body:'Confirm branch, user, amount/items and reason before deciding.'},
  {title:'Approve or reject',body:'Approve only when justified. Reject unclear or incorrect requests and ask staff to correct the source transaction.'},
  {title:'Never share manager credentials',body:'Approvals must identify the real person who authorised the action.'}
 ]},

 {id:'accounting',title:'Accounting',icon:Landmark,summary:'Management/accounting review; operational staff do not need debit/credit knowledge.',steps:[
  {title:'Review accounting dashboards',body:'Use the Accounting module to review journals, profit/loss, balances and financial reports.'},
  {title:'Do not duplicate operational entries',body:'Sales, purchases, expenses, refunds, stock counts and many other activities already post accounting automatically.'},
  {title:'Use manual journals only when necessary',body:'Manual accounting entries should be made only by authorised accounting users and must include a clear reference and description.'},
  {title:'Investigate before correcting',body:'If a balance looks wrong, trace it to the source transaction before posting a manual adjustment.'}
 ]},

 {id:'reports',title:'Reports & Analytics',icon:BarChart3,summary:'Generate filtered on-screen reports and downloadable files.',steps:[
  {title:'Open Report Centre',body:'Choose the report first.'},
  {title:'Choose filters',body:'Set From date, To date and Branch directly under the selected report.'},
  {title:'Generate',body:'Click Generate to view the same filtered source-level records on screen.'},
  {title:'Download',body:'Use Excel, CSV or Download PDF. PDF reports are generated as branded business documents—not browser screenshots.'},
  {title:'Use the right report',body:'Sales, Cash Flow, Expenses, Inventory, Stock Movements, Reorder, Stock Count Variance, Batch/Lot Movement, Inventory vs Accounts, Ledger and other reports are available according to role/permissions.'}
 ]},

 {id:'staff',title:'Users, Roles & Attendance',icon:UserRoundCog,summary:'Give people only the access they need.',steps:[
  {title:'Create the staff account',body:'Enter name, email and temporary password.'},
  {title:'Assign role(s)',body:'Choose the real job role such as Cashier, Waiter, Kitchen, Storekeeper, Accountant or Manager.'},
  {title:'Assign branch access',body:'Restrict staff to the branches they actually work in unless their job requires wider access.'},
  {title:'Set Quick PIN for shared terminals',body:'Use a private Quick PIN only for fast staff switching on an already authorised terminal.'},
  {title:'Review permissions',body:'Managers can use the Role Permission Matrix to control what each role can view or change.'},
  {title:'Clock in/out where used',body:'Use Attendance for staff time tracking when enabled.'}
 ]},

 {id:'branches',title:'Branches & Business Setup',icon:Building2,summary:'Maintain the physical business structure.',steps:[
  {title:'Create branches correctly',body:'Use the real branch name and location. Avoid duplicate branches.'},
  {title:'Create terminals / counters',body:'Configure counters used for cashier attribution and shift control.'},
  {title:'Create stock locations',body:'Under Inventory, add Main Store, Kitchen, Bar, Warehouse or other real stock locations for each branch.'},
  {title:'Review branch access',body:'Ensure users are assigned only where they should work.'}
 ]},

 {id:'settings',title:'Settings & Branding',icon:Settings,summary:'Configure business rules once, then let daily staff operate simply.',steps:[
  {title:'Business profile',body:'Keep company name, currency, contacts and identity correct.'},
  {title:'Branding',body:'Upload the correct business logo and document branding assets. Company name and logo appear on receipts and reports.'},
  {title:'Document settings',body:'Configure receipt/bill template, printer profiles, print/reprint audit and direct-print mappings.'},
  {title:'Restaurant setup',body:'Create floors/areas, tables, menu categories, kitchen stations and restaurant policies.'},
  {title:'Tax & service charge',body:'Set normal defaults here instead of changing them repeatedly during checkout.'},
  {title:'Security',body:'Change passwords when needed and revoke/disable access when a staff member leaves.'}
 ]},

 {id:'printing',title:'Printing & Documents',icon:Printer,summary:'Use generated documents, not screenshots of the application.',steps:[
  {title:'Receipts and bills',body:'Use Mauzo-generated receipt/bill PDFs. Business logo and name are included automatically.'},
  {title:'Kitchen tickets',body:'Print/reprint the generated KOT from the kitchen/order workflow.'},
  {title:'Reports',body:'Use Download PDF from Report Centre for a branded report with filters, summary, records and page numbering.'},
  {title:'Reprints',body:'Use the system reprint/document history where available so the print action is traceable.'}
 ]},

 {id:'end',title:'End of Day',icon:ClipboardCheck,summary:'Close operations cleanly before staff leave.',steps:[
  {title:'Finish open orders',body:'Complete, transfer or properly leave open only genuine outstanding orders.'},
  {title:'Review Kitchen',body:'Confirm no forgotten New/Preparing/Ready tickets remain.'},
  {title:'Record final cash movements',body:'Post any legitimate cash drop, payout or deposit before shift close.'},
  {title:'Count and close shifts',body:'Enter actual cash, review difference, then close the shift.'},
  {title:'Review exceptions',body:'Managers should review pending approvals, low stock, wastage/spoilage, refunds and unusual cash differences.'},
  {title:'Run daily reports',body:'Use Sales, Cash Flow, Shift and other required daily reports. Download PDF/Excel when records must be stored or shared.'}
 ]},

 {id:'troubleshoot',title:'Troubleshooting',icon:HelpCircle,summary:'Safe first checks when something looks wrong.',steps:[
  {title:'Sale will not complete',body:'Check that the shift is open, stock is available, required approval is completed and the payment method/source is valid.'},
  {title:'Stock is wrong',body:'Do not edit the product quantity. Check Stock History first, then use Count Stock or Correct Stock with a clear reason.'},
  {title:'Receipt/report will not download',body:'Allow downloads for the MauzoPOS site, retry once, and confirm you are still signed in. Use generated PDF buttons rather than browser Print.'},
  {title:'User cannot see a module',body:'Check their role, permissions and branch assignment in Users & Roles.'},
  {title:'Cash does not match',body:'Review opening cash, cash sales, payouts, drops and deposits before creating any correction.'},
  {title:'System error persists',body:'Record the exact screen, action, time, branch and error message, then contact the system administrator. Do not repeatedly retry financial transactions if you are unsure whether they posted.'}
 ],notes:['When reporting an issue, include a screenshot and transaction/reference number whenever possible.']}
]

export default function SOP({onBack}:{onBack?:()=>void}){
 const [query,setQuery]=useState('')
 const [active,setActive]=useState('start')
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return sections;return sections.filter(s=>(s.title+' '+s.summary+' '+s.steps.map(x=>x.title+' '+x.body).join(' ')).toLowerCase().includes(q))},[query])
 const shareUrl=window.location.origin+'/sop'
 const copy=async()=>{await navigator.clipboard?.writeText(shareUrl);alert('SOP link copied')}
 const share=async()=>{if(navigator.share){await navigator.share({title:'MauzoPOS Standard Operating Procedure',text:'MauzoPOS Standard Operating Procedure',url:shareUrl})}else await copy()}
 const whatsapp=()=>window.open('https://wa.me/?text='+encodeURIComponent('MauzoPOS Standard Operating Procedure\n'+shareUrl),'_blank','noopener,noreferrer')
 const email=()=>window.location.href='mailto:?subject='+encodeURIComponent('MauzoPOS Standard Operating Procedure')+'&body='+encodeURIComponent('MauzoPOS SOP: '+shareUrl)
 const download=()=>{const a=document.createElement('a');a.href='/api/public/sop/pdf';a.download='MauzoPOS-SOP.pdf';document.body.appendChild(a);a.click();a.remove()}
 const go=(id:string)=>{setActive(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}

 return <div className="min-h-screen bg-[#F3F6F8] text-slate-900">
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
   <div className="mx-auto flex h-[68px] max-w-[1500px] items-center gap-4 px-4 sm:px-6">
    <MauzoLogo/>
    <div className="hidden h-8 w-px bg-slate-200 sm:block"/>
    <div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--brand-primary)]">Official Guide</div><div className="truncate text-[13px] font-semibold text-slate-700">Standard Operating Procedure</div></div>
    <div className="ml-auto flex items-center gap-2">
     {onBack&&<button onClick={onBack} className="ui-btn hidden sm:inline-flex"><ArrowLeft size={14}/>Back to MauzoPOS</button>}
     <button onClick={download} className="ui-btn ui-btn-primary"><Download size={14}/><span className="hidden sm:inline">Download PDF</span></button>
     <button onClick={share} className="ui-btn"><Share2 size={14}/><span className="hidden sm:inline">Share</span></button>
    </div>
   </div>
  </header>

  <section className="border-b border-slate-200 bg-white">
   <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:py-10">
    <div className="max-w-4xl">
     <div className="ui-eyebrow">MauzoPOS SOP</div>
     <h1 className="mt-2 text-[30px] font-bold tracking-[-.04em] text-slate-950 sm:text-[38px]">Run MauzoPOS correctly, every time.</h1>
     <p className="mt-3 max-w-3xl text-[13px] leading-6 text-slate-600">A straightforward operating guide for cashiers, waiters, kitchen staff, storekeepers, managers, accountants and business owners. Follow the steps in order; Mauzo handles the accounting and audit trail in the background.</p>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
     <button onClick={download} className="ui-btn ui-btn-primary"><Download size={14}/>Download SOP PDF</button>
     <button onClick={share} className="ui-btn"><Share2 size={14}/>Share</button>
     <button onClick={copy} className="ui-btn"><Copy size={14}/>Copy Link</button>
     <button onClick={whatsapp} className="ui-btn"><Link2 size={14}/>WhatsApp</button>
     <button onClick={email} className="ui-btn"><Mail size={14}/>Email</button>
    </div>
   </div>
  </section>

  <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[285px_minmax(0,1fr)]">
   <aside className="lg:sticky lg:top-[88px] lg:self-start">
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
     <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the SOP" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-[var(--brand-primary)]"/></div>
     <div className="mt-3 max-h-[calc(100vh-180px)] space-y-0.5 overflow-y-auto pr-1">{filtered.map(s=>{const Icon=s.icon;return <button key={s.id} onClick={()=>go(s.id)} className={'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold transition '+(active===s.id?'bg-[var(--brand-soft)] text-[var(--brand-primary)]':'text-slate-600 hover:bg-slate-50')}><Icon size={15}/><span>{s.title}</span></button>})}</div>
    </div>
   </aside>

   <main className="space-y-4">
    {filtered.map((s,si)=>{const Icon=s.icon;return <section id={s.id} key={s.id} onMouseEnter={()=>setActive(s.id)} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
     <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)]"><Icon size={18}/></div>
      <div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">SOP {String(si+1).padStart(2,'0')}</div><h2 className="mt-0.5 text-[17px] font-bold text-slate-900">{s.title}</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">{s.summary}</p></div>
     </div>
     <div className="p-4 sm:p-5">
      <div className="space-y-3">{s.steps.map((st,i)=><div key={st.title} className="grid gap-3 rounded-xl border border-slate-100 p-3.5 sm:grid-cols-[32px_1fr]"><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-[11px] font-bold text-white">{i+1}</div><div><h3 className="text-[12px] font-bold text-slate-800">{st.title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-600">{st.body}</p></div></div>)}</div>
      {s.notes?.length&&<div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3.5"><div className="flex items-center gap-2 text-[11px] font-bold text-amber-900"><AlertTriangle size={14}/>Important</div><ul className="mt-2 space-y-1.5 pl-5 text-[10.5px] leading-5 text-amber-800">{s.notes.map(n=><li key={n} className="list-disc">{n}</li>)}</ul></div>}
     </div>
    </section>})}
    {!filtered.length&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-[12px] text-slate-500">No SOP section matches “{query}”.</div>}
   </main>
  </div>

  <footer className="mt-4 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-4 py-6 text-[10.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><b className="text-slate-700">MauzoPOS</b> · Sell Smarter. Grow Faster.</div><div>Standard Operating Procedure · Use the current live system as the source of truth.</div></div></footer>
 </div>
}
