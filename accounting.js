import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const money = n => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const positive = n => Math.max(0, money(n));
function isoDateValue(v){if(!v)return new Date().toISOString().slice(0,10);if(v instanceof Date)return v.toISOString().slice(0,10);const t=String(v);return /^\d{4}-\d{2}-\d{2}/.test(t)?t.slice(0,10):new Date(v).toISOString().slice(0,10)}

async function accountByCode(client,bid,code){
  const q=await client.query('SELECT * FROM accounts WHERE business_id=$1 AND account_code=$2 AND is_active=true',[bid,String(code)]);
  if(!q.rowCount)throw new Error('Accounting account '+code+' is not configured');
  return q.rows[0];
}
export async function mappedAccount(client,bid,key,fallbackCode=null){
  const q=await client.query("SELECT a.* FROM system_account_mappings m JOIN accounts a ON a.id=m.account_id WHERE m.business_id=$1 AND m.operation_key=$2 AND a.is_active=true",[bid,String(key)]);
  if(q.rowCount)return q.rows[0];
  if(fallbackCode)return accountByCode(client,bid,fallbackCode);
  throw new Error('Accounting mapping '+key+' is not configured');
}
export function paymentAccountKey(method){
  const m=String(method||'cash').trim().toLowerCase().replaceAll('_',' ');
  if(m==='cash')return 'cash';
  if(m.includes('airtel'))return 'airtel_money';
  if(m.includes('mtn'))return 'mtn_mobile_money';
  if(m.includes('mobile')||m==='momo')return 'mobile_money';
  if(m.includes('card')||m.includes('visa')||m.includes('master'))return 'card';
  if(m.includes('petty'))return 'petty_cash';
  return 'bank';
}
async function assertAccountingPeriodOpen(client,bid,entryDate){
  const q=await client.query("SELECT status,name FROM accounting_periods WHERE business_id=$1 AND $2::date BETWEEN start_date AND end_date AND status IN ('closed','locked') ORDER BY id DESC LIMIT 1",[bid,entryDate]);
  if(q.rowCount)throw new Error('Accounting period '+q.rows[0].name+' is '+q.rows[0].status+'. Reopen it before posting.');
}
async function nextJournalNo(client,bid,entryDate){
  const d=isoDateValue(entryDate);
  const q=await client.query("INSERT INTO daily_document_sequences(business_id,document_type,business_date,last_number) VALUES($1,'journal',$2,1) ON CONFLICT(business_id,document_type,business_date) DO UPDATE SET last_number=daily_document_sequences.last_number+1 RETURNING last_number",[bid,d]);
  return 'JE-'+d.replaceAll('-','')+'-'+String(q.rows[0].last_number).padStart(4,'0');
}
export async function postJournal(client,{bid,branchId=null,cashSessionId=null,entryDate=null,postingKey,sourceModule=null,sourceReference=null,referenceType=null,referenceId=null,description=null,notes=null,userId=null,lines=[]}){
  if(!postingKey)throw new Error('Accounting posting key is required');
  const existing=await client.query('SELECT * FROM journal_entries WHERE business_id=$1 AND posting_key=$2',[bid,postingKey]);
  if(existing.rowCount)return {entry:existing.rows[0],created:false};
  const date=isoDateValue(entryDate);
  await assertAccountingPeriodOpen(client,bid,date);
  const resolved=[];
  let dr=0,cr=0;
  for(const line of lines){
    const debit=positive(line.debit),credit=positive(line.credit);
    if(debit<=0&&credit<=0)continue;
    if(debit>0&&credit>0)throw new Error('A journal line cannot contain both a debit and a credit');
    let a;
    if(line.accountId){
      const q=await client.query('SELECT * FROM accounts WHERE id=$1 AND business_id=$2 AND is_active=true',[Number(line.accountId),bid]);
      if(!q.rowCount)throw new Error('Journal account not found');
      a=q.rows[0];
    }else if(line.accountKey){
      a=await mappedAccount(client,bid,line.accountKey,line.fallbackCode||null);
    }else if(line.accountCode){
      a=await accountByCode(client,bid,line.accountCode);
    }else throw new Error('Journal account is required');
    dr=money(dr+debit);cr=money(cr+credit);
    resolved.push({accountId:Number(a.id),debit,credit,memo:line.memo||null,branchId:line.branchId??branchId??null});
  }
  if(resolved.length<2)throw new Error('A journal entry requires at least two lines');
  if(Math.abs(dr-cr)>0.01)throw new Error('Unbalanced journal entry: debits '+dr+' do not equal credits '+cr);
  const entryNo=await nextJournalNo(client,bid,date);
  const q=await client.query("INSERT INTO journal_entries(business_id,branch_id,cash_session_id,entry_no,entry_date,posting_key,source_module,source_reference,reference_type,reference_id,description,notes,status,created_by_user_id,posted_by_user_id,posted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'posted',$13,$13,now()) RETURNING *",[bid,branchId||null,cashSessionId||null,entryNo,date,postingKey,sourceModule,sourceReference,referenceType,referenceId,description,notes,userId||null]);
  for(const line of resolved)await client.query('INSERT INTO journal_lines(journal_entry_id,account_id,branch_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)',[q.rows[0].id,line.accountId,line.branchId,line.debit,line.credit,line.memo]);
  return {entry:q.rows[0],created:true,totalDebit:dr,totalCredit:cr};
}
async function paymentsForSale(client,bid,saleId){
  const ro=await client.query('SELECT id FROM restaurant_orders WHERE business_id=$1 AND sale_id=$2 LIMIT 1',[bid,saleId]);
  let rows=[];
  if(ro.rowCount){
    rows=(await client.query("SELECT p.payment_method,coalesce(sum(pa.amount),0)::numeric amount,min(p.cash_session_id) cash_session_id FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id WHERE pa.business_id=$1 AND pa.source_type='restaurant_order' AND pa.source_id=$2 AND p.status='posted' GROUP BY p.payment_method",[bid,ro.rows[0].id])).rows;
  }else{
    rows=(await client.query("SELECT p.payment_method,coalesce(sum(pa.amount),0)::numeric amount,min(p.cash_session_id) cash_session_id FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id WHERE pa.business_id=$1 AND pa.source_type='sale' AND pa.source_id=$2 AND p.status='posted' GROUP BY p.payment_method",[bid,saleId])).rows;
  }
  if(rows.length)return rows;
  const legacy=await client.query("SELECT payment_method,least(greatest(amount_paid,0),greatest(total,0))::numeric amount,NULL::bigint cash_session_id FROM sales WHERE id=$1 AND business_id=$2 AND amount_paid>0",[saleId,bid]);
  return legacy.rows;
}
export async function ensureSaleAccounting(client,{bid,saleId,userId=null}){
  const check=await client.query("SELECT id FROM journal_entries WHERE business_id=$1 AND posting_key=$2",[bid,'sale:'+saleId]);
  if(check.rowCount)return {created:false,entryId:check.rows[0].id};
  const sq=await client.query('SELECT * FROM sales WHERE id=$1 AND business_id=$2 FOR UPDATE',[saleId,bid]);
  if(!sq.rowCount)throw new Error('Sale not found for accounting');
  const sale=sq.rows[0],paymentRows=await paymentsForSale(client,bid,saleId);
  const lines=[],paid=paymentRows.reduce((n,x)=>n+Number(x.amount||0),0),receivable=Math.max(0,Number(sale.total||0)-paid);
  for(const p of paymentRows){
    const amount=positive(p.amount);if(amount<=0)continue;
    lines.push({accountKey:paymentAccountKey(p.payment_method),debit:amount,memo:'Payment · '+p.payment_method});
  }
  if(receivable>0.005)lines.push({accountKey:'accounts_receivable',debit:receivable,memo:'Customer receivable'});
  const base=Math.max(0,Number(sale.subtotal||0)-Number(sale.discount||0)),tax=positive(sale.tax),service=positive(sale.service_charge),tip=positive(sale.tip);
  let revenue=positive(base-(sale.tax_inclusive?tax:0));
  if(revenue<=0.005 && Number(sale.total||0)>0 && tax<=0.005 && service<=0.005 && tip<=0.005)revenue=positive(sale.total);
  if(revenue>0)lines.push({accountKey:String(sale.order_type||'').includes('delivery')?'delivery_sales':String(sale.order_type||'').includes('takeaway')?'takeaway_sales':'food_sales',credit:revenue,memo:'Net sales revenue'});
  if(tax>0)lines.push({accountKey:'vat_output',credit:tax,memo:'Output tax'});
  if(service>0)lines.push({accountKey:'service_charge_revenue',credit:service,memo:'Service charge'});
  if(tip>0)lines.push({accountKey:'tips_payable',credit:tip,memo:'Tips payable'});
  const c=await client.query('SELECT coalesce(sum(qty*unit_cost),0)::numeric total FROM sale_items WHERE sale_id=$1',[saleId]),cogs=positive(c.rows[0].total);
  if(cogs>0){
    lines.push({accountKey:'food_cogs',debit:cogs,memo:'Cost of goods sold'});
    lines.push({accountKey:'finished_goods_inventory',credit:cogs,memo:'Finished stock sold'});
  }
  const shiftId=paymentRows.find(x=>x.cash_session_id)?.cash_session_id||null;
  return postJournal(client,{bid,branchId:sale.branch_id,cashSessionId:shiftId,entryDate:isoDateValue(sale.created_at),postingKey:'sale:'+saleId,sourceModule:'sales',sourceReference:sale.receipt_no,referenceType:'sale',referenceId:saleId,description:'Sale '+sale.receipt_no,userId,lines});
}

export async function postOpeningStockAccounting(client,{bid,productId,locationId,qty,unitCost,userId=null,referenceNo=null}){
  const amount=positive(Number(qty||0)*Number(unitCost||0)); if(amount<=0)return null;
  const q=await client.query("SELECT p.name,p.item_type,p.category,l.branch_id,EXISTS(SELECT 1 FROM recipes r WHERE r.business_id=$1 AND r.product_id=p.id AND r.active=true) finished FROM products p JOIN inventory_locations l ON l.id=$3 WHERE p.id=$2 AND p.business_id=$1",[bid,productId,locationId]);
  if(!q.rowCount)throw new Error('Opening stock item not found for accounting');
  const x=q.rows[0],invKey=x.finished||(!String(x.item_type||'').includes('ingredient')&&String(x.category||'').toLowerCase()!=='ingredient')?'finished_goods_inventory':'raw_material_inventory';
  const capital=await accountByCode(client,bid,'3100');
  return postJournal(client,{bid,branchId:x.branch_id,entryDate:isoDateValue(new Date()),postingKey:'opening_stock:'+productId,sourceModule:'inventory',sourceReference:referenceNo||('OPENING-'+productId),referenceType:'opening_stock',referenceId:productId,description:'Opening stock · '+x.name,userId,lines:[
    {accountKey:invKey,debit:amount,memo:'Opening inventory'},
    {accountId:capital.id,credit:amount,memo:'Opening balance / owner capital'}
  ]});
}

export async function postStockCountAccounting(client,{bid,countId,userId=null}){
  const hq=await client.query("SELECT c.*,l.branch_id FROM stock_counts c JOIN inventory_locations l ON l.id=c.location_id WHERE c.id=$1 AND c.business_id=$2",[countId,bid]);
  if(!hq.rowCount)throw new Error('Stock count not found for accounting');
  const h=hq.rows[0];
  const rows=(await client.query("SELECT i.*,p.name,p.item_type,p.category,EXISTS(SELECT 1 FROM recipes r WHERE r.business_id=$2 AND r.product_id=p.id AND r.active=true) finished FROM stock_count_items i JOIN products p ON p.id=i.product_id WHERE i.stock_count_id=$1",[countId,bid])).rows;
  const lines=[];
  for(const x of rows){
    if(x.counted_qty==null)continue;
    const diff=Number(x.counted_qty)-Number(x.expected_qty),amount=positive(Math.abs(diff)*Number(x.unit_cost||0));
    if(Math.abs(diff)<=0.000001||amount<=0)continue;
    const invKey=x.finished||(!String(x.item_type||'').includes('ingredient')&&String(x.category||'').toLowerCase()!=='ingredient')?'finished_goods_inventory':'raw_material_inventory';
    if(diff<0){
      lines.push({accountKey:'production_variance',debit:amount,memo:'Count shortage · '+x.name});
      lines.push({accountKey:invKey,credit:amount,memo:'Inventory count reduction · '+x.name});
    }else{
      lines.push({accountKey:invKey,debit:amount,memo:'Inventory count increase · '+x.name});
      lines.push({accountKey:'production_variance',credit:amount,memo:'Count gain · '+x.name});
    }
  }
  if(!lines.length)return null;
  return postJournal(client,{bid,branchId:h.branch_id,entryDate:isoDateValue(h.posted_at||new Date()),postingKey:'stock_count:'+countId,sourceModule:'inventory',sourceReference:h.reference_no,referenceType:'stock_count',referenceId:countId,description:'Physical stock count '+h.reference_no,userId,lines});
}

export async function postReceivablePaymentAccounting(client,{bid,payment,userId=null,referenceType='sale_payment'}){
  if(!payment||!(Number(payment.amount)>0))return null;
  return postJournal(client,{bid,branchId:payment.branch_id,cashSessionId:payment.cash_session_id,entryDate:isoDateValue(payment.received_at),postingKey:'payment:'+payment.id,sourceModule:'payments',sourceReference:payment.payment_no,referenceType,referenceId:Number(payment.id),description:'Receivable payment '+payment.payment_no,userId,lines:[
    {accountKey:paymentAccountKey(payment.payment_method),debit:Number(payment.amount),memo:'Payment received'},
    {accountKey:'accounts_receivable',credit:Number(payment.amount),memo:'Accounts receivable cleared'}
  ]});
}
export async function postGrnAccounting(client,{bid,grnId,userId=null}){
  const q=await client.query("SELECT * FROM goods_receipts WHERE id=$1 AND business_id=$2",[grnId,bid]);
  if(!q.rowCount)throw new Error('Goods receipt not found for accounting');
  const x=q.rows[0];
  const buckets=await client.query("SELECT CASE WHEN p.item_type='ingredient' OR lower(coalesce(p.category,''))='ingredient' THEN 'raw_material_inventory' ELSE 'finished_goods_inventory' END account_key,coalesce(sum(i.qty_received*i.unit_cost),0)::numeric amount FROM goods_receipt_items i JOIN products p ON p.id=i.product_id WHERE i.goods_receipt_id=$1 GROUP BY 1",[grnId]);
  const lines=[];let amount=0;
  for(const row of buckets.rows){const v=positive(row.amount);if(v>0){amount=money(amount+v);lines.push({accountKey:row.account_key,debit:v,memo:'Inventory received'})}}
  if(amount<=0)return null;
  lines.push({accountKey:'accounts_payable',credit:amount,memo:'Supplier payable'});
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:x.cash_session_id,entryDate:isoDateValue(x.received_at),postingKey:'grn:'+grnId,sourceModule:'purchasing',sourceReference:x.grn_no,referenceType:'goods_receipt',referenceId:grnId,description:'Inventory received '+x.grn_no,userId,lines});
}
export async function postProductionAccounting(client,{bid,batchId,userId=null}){
  const q=await client.query("SELECT rb.*,p.name product_name FROM recipe_batches rb JOIN recipes r ON r.id=rb.recipe_id JOIN products p ON p.id=r.product_id WHERE rb.id=$1 AND rb.business_id=$2",[batchId,bid]);
  if(!q.rowCount)throw new Error('Production batch not found for accounting');
  const x=q.rows[0],amount=positive(x.total_cost);if(amount<=0)return null;
  return postJournal(client,{bid,entryDate:isoDateValue(x.prepared_at),postingKey:'production:'+batchId,sourceModule:'production',sourceReference:x.batch_no,referenceType:'recipe_batch',referenceId:batchId,description:'Kitchen production '+x.batch_no+' · '+x.product_name,userId,lines:[
    {accountKey:'finished_goods_inventory',debit:amount,memo:'Finished products produced'},
    {accountKey:'raw_material_inventory',credit:amount,memo:'Raw materials consumed'}
  ]});
}
export async function postExpenseAccounting(client,{bid,expenseId,userId=null}){
  const q=await client.query('SELECT * FROM expenses WHERE id=$1 AND business_id=$2',[expenseId,bid]);if(!q.rowCount)throw new Error('Expense not found for accounting');
  const x=q.rows[0],amount=positive(x.amount);if(amount<=0)return null;
  const debit=x.expense_account_id?{accountId:Number(x.expense_account_id),debit:amount,memo:x.description}:{accountKey:'default_expense',debit:amount,memo:x.description};
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:x.cash_session_id,entryDate:isoDateValue(x.expense_date),postingKey:'expense:'+expenseId,sourceModule:'expenses',sourceReference:x.reference_no,referenceType:'expense',referenceId:expenseId,description:x.description,userId,lines:[debit,{...(x.payment_account_id?{accountId:Number(x.payment_account_id)}:{accountKey:paymentAccountKey(x.payment_method||'cash')}),credit:amount,memo:'Expense payment'}]});
}
export async function postInventoryConsumptionAccounting(client,{bid,consumptionId,userId=null}){
  const q=await client.query("SELECT ic.*,coalesce(sum(ici.qty*ici.unit_cost),0)::numeric total FROM inventory_consumptions ic JOIN inventory_consumption_items ici ON ici.consumption_id=ic.id WHERE ic.id=$1 AND ic.business_id=$2 GROUP BY ic.id",[consumptionId,bid]);
  if(!q.rowCount)throw new Error('Inventory consumption not found for accounting');
  const x=q.rows[0],amount=positive(x.total);if(amount<=0)return null;
  const debit=x.consumption_type==='staff_meal'?await accountByCode(client,bid,'6115'):await accountByCode(client,bid,'6550');
  const buckets=await client.query("SELECT CASE WHEN p.item_type='ingredient' OR lower(coalesce(p.category,''))='ingredient' THEN 'raw_material_inventory' ELSE 'finished_goods_inventory' END account_key,coalesce(sum(ici.qty*ici.unit_cost),0)::numeric amount FROM inventory_consumption_items ici JOIN products p ON p.id=ici.product_id WHERE ici.consumption_id=$1 GROUP BY 1",[consumptionId]);
  const lines=[{accountId:debit.id,debit:amount,memo:'Internal food consumption'}];
  for(const row of buckets.rows){const v=positive(row.amount);if(v>0)lines.push({accountKey:row.account_key,credit:v,memo:'Inventory consumed'})}
  return postJournal(client,{bid,entryDate:isoDateValue(x.created_at),postingKey:'inventory_consumption:'+consumptionId,sourceModule:'inventory',sourceReference:x.reference_no,referenceType:'inventory_consumption',referenceId:consumptionId,description:(x.consumption_type==='staff_meal'?'Staff meal':'Complimentary food')+' · '+x.reference_no,userId,lines});
}
export async function postSupplierPaymentAccounting(client,{bid,supplierPaymentId,userId=null}){
  const q=await client.query('SELECT * FROM supplier_payments WHERE id=$1 AND business_id=$2',[supplierPaymentId,bid]);if(!q.rowCount)throw new Error('Supplier payment not found for accounting');
  const x=q.rows[0],amount=positive(x.amount);if(amount<=0)return null;
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:x.cash_session_id,entryDate:isoDateValue(x.paid_at),postingKey:'supplier_payment:'+supplierPaymentId,sourceModule:'purchasing',sourceReference:x.reference,referenceType:'supplier_payment',referenceId:supplierPaymentId,description:'Supplier payment '+(x.reference||supplierPaymentId),userId,lines:[
    {accountKey:'accounts_payable',debit:amount,memo:'Supplier payable cleared'},
    {accountKey:paymentAccountKey(x.payment_method),credit:amount,memo:'Supplier payment'}
  ]});
}
export async function postRefundAccounting(client,{bid,refundId,userId=null}){
  const q=await client.query("SELECT r.*,s.branch_id,s.total sale_total,s.tax sale_tax,s.service_charge sale_service,s.tip sale_tip,s.receipt_no FROM refunds r JOIN sales s ON s.id=r.sale_id WHERE r.id=$1 AND r.business_id=$2",[refundId,bid]);if(!q.rowCount)throw new Error('Refund not found for accounting');
  const x=q.rows[0],amount=positive(x.total);if(amount<=0)return null;
  const tenders=(await client.query('SELECT payment_method,amount,cash_session_id FROM refund_tenders WHERE refund_id=$1 ORDER BY id',[refundId])).rows;
  const refundBase=Math.max(0,Number(x.sale_total||0)-Number(x.sale_tip||0)),ratio=refundBase>0?Math.min(1,amount/refundBase):1;
  const tax=positive(Number(x.sale_tax||0)*ratio),service=positive(Number(x.sale_service||0)*ratio),revenue=positive(amount-tax-service);
  const lines=[];
  if(revenue>0)lines.push({accountKey:'sales_returns',debit:revenue,memo:'Sales refund'});
  if(tax>0)lines.push({accountKey:'vat_output',debit:tax,memo:'Tax reversal'});
  if(service>0)lines.push({accountKey:'service_charge_revenue',debit:service,memo:'Service charge reversal'});
  for(const t of tenders)lines.push({accountKey:paymentAccountKey(t.payment_method),credit:Number(t.amount),memo:'Refund · '+t.payment_method});
  if(x.restock){
    const c=await client.query('SELECT coalesce(sum(ri.qty*si.unit_cost),0)::numeric total FROM refund_items ri JOIN sale_items si ON si.id=ri.sale_item_id WHERE ri.refund_id=$1',[refundId]),cogs=positive(c.rows[0].total);
    if(cogs>0){lines.push({accountKey:'finished_goods_inventory',debit:cogs,memo:'Returned finished stock'});lines.push({accountKey:'food_cogs',credit:cogs,memo:'COGS reversal'});}
  }
  const shiftId=tenders.find(t=>t.cash_session_id)?.cash_session_id||null;
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:shiftId,entryDate:isoDateValue(x.approved_at),postingKey:'refund:'+refundId,sourceModule:'refunds',sourceReference:x.refund_no,referenceType:'refund',referenceId:refundId,description:'Refund '+x.refund_no+' for '+x.receipt_no,userId,lines});
}

export async function postStockAdjustmentAccounting(client,{bid,adjustmentId,userId=null}){
  const hq=await client.query("SELECT sa.*,l.branch_id FROM stock_adjustments sa JOIN inventory_locations l ON l.id=sa.location_id WHERE sa.id=$1 AND sa.business_id=$2",[adjustmentId,bid]);
  if(!hq.rowCount)throw new Error('Stock adjustment not found for accounting');
  const h=hq.rows[0],rows=(await client.query("SELECT sai.*,p.name product_name,p.cost product_cost,p.item_type,p.category,EXISTS(SELECT 1 FROM recipes r WHERE r.business_id=$2 AND r.product_id=sai.product_id AND r.active=true) finished FROM stock_adjustment_items sai JOIN products p ON p.id=sai.product_id WHERE sai.adjustment_id=$1",[adjustmentId,bid])).rows;
  const lines=[];let loss=0;
  for(const x of rows){
    const amount=positive(Math.abs(Number(x.qty_change||0))*Number(x.unit_cost||x.product_cost||0));if(amount<=0)continue;
    const invKey=x.finished||(!String(x.item_type||'').includes('ingredient')&&String(x.category||'').toLowerCase()!=='ingredient')?'finished_goods_inventory':'raw_material_inventory';
    if(Number(x.qty_change)<0){
      lines.push({accountKey:h.adjustment_type==='wastage'||h.adjustment_type==='spoilage'?'waste_expense':'production_variance',debit:amount,memo:niceMemo(h.adjustment_type)+' · '+x.product_name});
      lines.push({accountKey:invKey,credit:amount,memo:'Inventory reduction · '+x.product_name});
      loss=money(loss+amount);
    }else{
      lines.push({accountKey:invKey,debit:amount,memo:'Inventory increase · '+x.product_name});
      lines.push({accountKey:'production_variance',credit:amount,memo:(h.adjustment_type==='prepared_stock'?'Prepared / added stock':'Stock count gain')+' · '+x.product_name});
    }
  }
  if(!lines.length)return null;
  return postJournal(client,{bid,branchId:h.branch_id,entryDate:isoDateValue(h.approved_at||h.created_at),postingKey:'stock_adjustment:'+adjustmentId,sourceModule:'inventory',sourceReference:h.reference_no,referenceType:'stock_adjustment',referenceId:adjustmentId,description:niceMemo(h.adjustment_type)+' '+h.reference_no,notes:h.reason,userId,lines});
}
function niceMemo(v){return String(v||'adjustment').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}

export async function postPurchaseReturnAccounting(client,{bid,purchaseReturnId,userId=null}){
  const q=await client.query("SELECT * FROM purchase_returns WHERE id=$1 AND business_id=$2",[purchaseReturnId,bid]);
  if(!q.rowCount)throw new Error('Purchase return not found for accounting');
  const x=q.rows[0],buckets=await client.query("SELECT CASE WHEN p.item_type='ingredient' OR lower(coalesce(p.category,''))='ingredient' THEN 'raw_material_inventory' ELSE 'finished_goods_inventory' END account_key,coalesce(sum(pri.line_total),0)::numeric amount FROM purchase_return_items pri JOIN products p ON p.id=pri.product_id WHERE pri.purchase_return_id=$1 GROUP BY 1",[purchaseReturnId]);
  const lines=[];let amount=0;
  for(const row of buckets.rows){const v=positive(row.amount);if(v>0){amount=money(amount+v);lines.push({accountKey:row.account_key,credit:v,memo:'Inventory returned to supplier'})}}
  if(amount<=0)return null;
  lines.unshift({accountKey:'accounts_payable',debit:amount,memo:'Supplier payable reduced'});
  return postJournal(client,{bid,branchId:x.branch_id,entryDate:isoDateValue(x.created_at),postingKey:'purchase_return:'+purchaseReturnId,sourceModule:'purchasing',sourceReference:x.return_no,referenceType:'purchase_return',referenceId:purchaseReturnId,description:'Purchase return '+x.return_no,userId,lines});
}

export async function postSupplierInvoiceAccounting(client,{bid,supplierInvoiceId,userId=null}){
  const q=await client.query('SELECT * FROM supplier_invoices WHERE id=$1 AND business_id=$2',[supplierInvoiceId,bid]);
  if(!q.rowCount)throw new Error('Supplier invoice not found for accounting');
  const x=q.rows[0],amount=positive(x.total);if(amount<=0)return null;
  if(x.grn_id)return null; // GRN already recognized inventory and AP.
  return postJournal(client,{bid,branchId:x.branch_id,entryDate:isoDateValue(x.invoice_date),postingKey:'supplier_invoice:'+supplierInvoiceId,sourceModule:'purchasing',sourceReference:x.invoice_no,referenceType:'supplier_invoice',referenceId:supplierInvoiceId,description:'Supplier invoice '+x.invoice_no,userId,lines:[
    {accountKey:'default_expense',debit:amount,memo:'Supplier invoice expense'},
    {accountKey:'accounts_payable',credit:amount,memo:'Supplier payable'}
  ]});
}

async function accountBalanceRows(pool,bid,{from=null,to=null,asOf=null,branchId=null,types=null}={}){
  const params=[bid],where=["a.business_id=$1","a.is_active=true","je.status='posted'"];
  const add=(value,cast='')=>{params.push(value);return '$'+params.length+cast};
  if(from)where.push('je.entry_date >= '+add(from,'::date'));
  if(to)where.push('je.entry_date <= '+add(to,'::date'));
  if(asOf)where.push('je.entry_date <= '+add(asOf,'::date'));
  if(branchId)where.push('coalesce(jl.branch_id,je.branch_id)='+add(branchId,'::bigint'));
  if(types?.length)where.push('a.account_type=ANY('+add(types,'::text[]')+')');
  const q=await pool.query("SELECT a.id,a.account_code,a.name,a.account_type,a.normal_balance,coalesce(sum(jl.debit),0)::numeric debit,coalesce(sum(jl.credit),0)::numeric credit FROM accounts a LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id WHERE "+where.join(' AND ')+" GROUP BY a.id ORDER BY a.account_code",params);
  return q.rows.map(x=>({...x,debit:Number(x.debit||0),credit:Number(x.credit||0),balance:x.normal_balance==='debit'?Number(x.debit||0)-Number(x.credit||0):Number(x.credit||0)-Number(x.debit||0)}));
}
function parseDate(v){return v?isoDateValue(v):null;}

export function registerAccountingRoutes(app,{pool,auth,tenant,getBiz,permit,rolesAllowed,audit,hasPermission,pdfHeader,pdfFooter,pdfMetaGrid,pdfSectionTitle,pdfTable,pdfMetricCards,pdfMoney,pdfPageNumbers,pdfReportHeader,pdfReportMetaStrip,pdfReportMetricStrip}){
  const documentDir='uploads/documents';fs.mkdirSync(documentDir,{recursive:true});
  async function reportBranchIds(req,bid,requestedBranchId=null){
    if(req.user?.role==='saas_admin'||await hasPermission(req,bid,'branch.all'))return requestedBranchId?[Number(requestedBranchId)]:null;
    const q=await pool.query('SELECT branch_id FROM user_branch_assignments WHERE business_id=$1 AND user_id=$2 ORDER BY branch_id',[bid,req.user.id]);
    const ids=q.rows.map(x=>Number(x.branch_id));
    if(requestedBranchId){
      if(ids.length&&!ids.includes(Number(requestedBranchId)))throw new Error('You are not assigned to the selected branch');
      return [Number(requestedBranchId)];
    }
    return ids.length?ids:null;
  }
  async function validatePaymentSourceAccount(client,bid,method,accountId){
    const a=await client.query("SELECT id,account_code,name FROM accounts WHERE id=$1 AND business_id=$2 AND account_type='asset' AND is_active=true AND allow_manual_entries=true",[Number(accountId),bid]);
    if(!a.rowCount)throw new Error('Payment/source account is invalid');
    const x=a.rows[0],m=String(method||'cash').toLowerCase(),label=(String(x.account_code||'')+' '+String(x.name||'')).toLowerCase();
    const ok=m==='cash'?/(1111|1116|cash|petty)/.test(label)
      :m.includes('mtn')?/(1113|mtn|mobile|wallet)/.test(label)
      :m.includes('airtel')?/(1114|airtel|mobile|wallet)/.test(label)
      :m.includes('mobile')||m==='momo'?/(1113|1114|mobile|wallet)/.test(label)
      :m.includes('card')?/(1115|card)/.test(label)
      :/(1112|bank)/.test(label);
    if(!ok)throw new Error('The selected source account does not match the payment method');
    return x;
  }
  async function allowanceDebitAccount(client,bid,type){
    const t=String(type||'').trim().toLowerCase();
    const code=t==='transport'||t==='field'||t==='accommodation'?'6415':t==='meal'?'6115':t==='airtime'?'6515':t==='advance'?'1140':'6800';
    return accountByCode(client,bid,code);
  }
  const documentUpload=multer({storage:multer.diskStorage({destination:(_req,_file,cb)=>cb(null,documentDir),filename:(_req,file,cb)=>{const ext=path.extname(file.originalname||'').toLowerCase().slice(0,10);cb(null,'doc-'+Date.now()+'-'+crypto.randomBytes(6).toString('hex')+ext)}}),limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>cb(null,/^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(file.mimetype))});

  app.get('/api/accounting/accounts',auth,tenant,permit('accounting.view'),async(req,res)=>{try{const bid=await getBiz(req),q=await pool.query("SELECT a.*,p.account_code parent_code,p.name parent_name,coalesce(sum(CASE WHEN je.status='posted' THEN jl.debit ELSE 0 END),0)::numeric total_debit,coalesce(sum(CASE WHEN je.status='posted' THEN jl.credit ELSE 0 END),0)::numeric total_credit FROM accounts a LEFT JOIN accounts p ON p.id=a.parent_account_id LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id WHERE a.business_id=$1 GROUP BY a.id,p.account_code,p.name ORDER BY a.account_code",[bid]);res.json(q.rows.map(x=>({...x,current_balance:x.normal_balance==='debit'?Number(x.total_debit)-Number(x.total_credit):Number(x.total_credit)-Number(x.total_debit)})))}catch(e){res.status(400).json({error:e.message})}});
  app.post('/api/accounting/accounts',auth,tenant,permit('accounting.manage'),async(req,res)=>{const bid=await getBiz(req),{accountCode,name,accountType,normalBalance,parentAccountId=null,description=null,allowManualEntries=true}=req.body||{};if(!accountCode||!name||!['asset','liability','equity','revenue','cost_of_sales','expense'].includes(accountType)||!['debit','credit'].includes(normalBalance))return res.status(400).json({error:'Complete all required account fields'});try{const q=await pool.query("INSERT INTO accounts(business_id,account_code,name,account_type,normal_balance,parent_account_id,description,allow_manual_entries,is_system) VALUES($1,$2,$3,$4,$5,$6,$7,$8,false) RETURNING *",[bid,String(accountCode).trim(),String(name).trim(),accountType,normalBalance,parentAccountId||null,description||null,!!allowManualEntries]);await audit(req.user,bid,'create','account',q.rows[0].id,{accountCode});res.json(q.rows[0])}catch(e){res.status(400).json({error:e.message})}});
  app.put('/api/accounting/accounts/:id',auth,tenant,permit('accounting.manage'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id),x=req.body||{};try{const a=await pool.query('SELECT * FROM accounts WHERE id=$1 AND business_id=$2',[id,bid]);if(!a.rowCount)return res.status(404).json({error:'Account not found'});if(a.rows[0].is_system&&x.isActive===false)return res.status(400).json({error:'System accounts cannot be deactivated'});const q=await pool.query("UPDATE accounts SET name=coalesce($1,name),description=$2,parent_account_id=$3,allow_manual_entries=coalesce($4,allow_manual_entries),is_active=coalesce($5,is_active) WHERE id=$6 AND business_id=$7 RETURNING *",[x.name??null,x.description??null,x.parentAccountId??a.rows[0].parent_account_id,x.allowManualEntries??null,x.isActive??null,id,bid]);await audit(req.user,bid,'update','account',id,x);res.json(q.rows[0])}catch(e){res.status(400).json({error:e.message})}});

  app.get('/api/accounting/mappings',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req);res.json((await pool.query("SELECT m.*,a.account_code,a.name account_name FROM system_account_mappings m JOIN accounts a ON a.id=m.account_id WHERE m.business_id=$1 ORDER BY m.operation_key",[bid])).rows)});
  app.put('/api/accounting/mappings/:key',auth,tenant,permit('accounting.manage'),async(req,res)=>{const bid=await getBiz(req),accountId=Number(req.body?.accountId);if(!accountId)return res.status(400).json({error:'Account is required'});const a=await pool.query('SELECT id FROM accounts WHERE id=$1 AND business_id=$2',[accountId,bid]);if(!a.rowCount)return res.status(400).json({error:'Account not found'});const q=await pool.query("INSERT INTO system_account_mappings(business_id,operation_key,account_id) VALUES($1,$2,$3) ON CONFLICT(business_id,operation_key) DO UPDATE SET account_id=EXCLUDED.account_id RETURNING *",[bid,String(req.params.key),accountId]);await audit(req.user,bid,'update_mapping','accounting',req.params.key,{accountId});res.json(q.rows[0])});

  app.get('/api/accounting/journals',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),from=parseDate(req.query.from),to=parseDate(req.query.to),branchId=Number(req.query.branchId||0)||null;const q=await pool.query("SELECT je.*,coalesce(b.name,'-') branch_name,coalesce(sum(jl.debit),0)::numeric total_debit,coalesce(sum(jl.credit),0)::numeric total_credit,count(jl.id)::int line_count FROM journal_entries je LEFT JOIN branches b ON b.id=je.branch_id LEFT JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.business_id=$1 AND ($2::date IS NULL OR je.entry_date >= $2::date) AND ($3::date IS NULL OR je.entry_date <= $3::date) AND ($4::bigint IS NULL OR je.branch_id=$4) GROUP BY je.id,b.name ORDER BY je.entry_date DESC,je.id DESC LIMIT 500",[bid,from,to,branchId]);res.json(q.rows)});
  app.get('/api/accounting/journals/:id',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id),e=await pool.query('SELECT * FROM journal_entries WHERE id=$1 AND business_id=$2',[id,bid]);if(!e.rowCount)return res.status(404).json({error:'Journal not found'});const lines=await pool.query("SELECT jl.*,a.account_code,a.name account_name FROM journal_lines jl JOIN accounts a ON a.id=jl.account_id WHERE jl.journal_entry_id=$1 ORDER BY jl.id",[id]);res.json({entry:e.rows[0],lines:lines.rows})});
  app.post('/api/accounting/journals',auth,tenant,permit('accounting.post'),async(req,res)=>{const bid=await getBiz(req),{entryDate,description,notes=null,branchId=null,lines=[]}=req.body||{},client=await pool.connect();try{await client.query('BEGIN');if(!description||!Array.isArray(lines)||lines.length<2)throw new Error('Description and at least two journal lines are required');for(const l of lines){const q=await client.query('SELECT allow_manual_entries FROM accounts WHERE id=$1 AND business_id=$2',[Number(l.accountId),bid]);if(!q.rowCount||!q.rows[0].allow_manual_entries)throw new Error('One or more selected accounts do not allow manual posting')}const x=await postJournal(client,{bid,branchId:branchId||null,entryDate:entryDate||null,postingKey:'manual:'+crypto.randomUUID(),sourceModule:'accounting',referenceType:'manual_journal',description,notes,userId:req.user.id,lines:lines.map(l=>({accountId:Number(l.accountId),debit:Number(l.debit||0),credit:Number(l.credit||0),memo:l.memo||null}))});await client.query('COMMIT');await audit(req.user,bid,'post','journal_entry',x.entry.id,{entryNo:x.entry.entry_no});res.json(x.entry)}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
  app.post('/api/accounting/journals/:id/reverse',auth,tenant,permit('accounting.post'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id),client=await pool.connect();try{await client.query('BEGIN');const e=await client.query("SELECT * FROM journal_entries WHERE id=$1 AND business_id=$2 AND status='posted' FOR UPDATE",[id,bid]);if(!e.rowCount)throw new Error('Posted journal not found');if(e.rows[0].is_reversed)throw new Error('Journal is already reversed');const lines=(await client.query('SELECT * FROM journal_lines WHERE journal_entry_id=$1 ORDER BY id',[id])).rows;const x=await postJournal(client,{bid,branchId:e.rows[0].branch_id,cashSessionId:e.rows[0].cash_session_id,entryDate:new Date().toISOString().slice(0,10),postingKey:'reverse:'+id,sourceModule:'accounting',sourceReference:e.rows[0].entry_no,referenceType:'journal_reversal',referenceId:id,description:'Reversal of '+e.rows[0].entry_no,notes:req.body?.reason||null,userId:req.user.id,lines:lines.map(l=>({accountId:l.account_id,debit:Number(l.credit),credit:Number(l.debit),memo:'Reversal · '+(l.memo||'')}))});await client.query('UPDATE journal_entries SET is_reversed=true WHERE id=$1',[id]);await client.query('UPDATE journal_entries SET reversal_of_id=$1 WHERE id=$2',[id,x.entry.id]);await client.query('COMMIT');await audit(req.user,bid,'reverse','journal_entry',id,{reversalId:x.entry.id});res.json(x.entry)}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});

  app.get('/api/accounting/trial-balance',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),rows=await accountBalanceRows(pool,bid,{asOf:parseDate(req.query.asOf),branchId:Number(req.query.branchId||0)||null});const data=rows.filter(x=>Math.abs(x.debit)>0.005||Math.abs(x.credit)>0.005),totalDebit=money(data.reduce((n,x)=>n+x.debit,0)),totalCredit=money(data.reduce((n,x)=>n+x.credit,0));res.json({rows:data,totalDebit,totalCredit,isBalanced:Math.abs(totalDebit-totalCredit)<=0.01})});
  app.get('/api/accounting/profit-loss',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),rows=await accountBalanceRows(pool,bid,{from:parseDate(req.query.from),to:parseDate(req.query.to),branchId:Number(req.query.branchId||0)||null,types:['revenue','cost_of_sales','expense']});const revenue=rows.filter(x=>x.account_type==='revenue').map(x=>({...x,amount:money(x.credit-x.debit)})),cogs=rows.filter(x=>x.account_type==='cost_of_sales').map(x=>({...x,amount:money(x.debit-x.credit)})),expenses=rows.filter(x=>x.account_type==='expense').map(x=>({...x,amount:money(x.debit-x.credit)})),totalRevenue=money(revenue.reduce((n,x)=>n+x.amount,0)),totalCogs=money(cogs.reduce((n,x)=>n+x.amount,0)),totalExpenses=money(expenses.reduce((n,x)=>n+x.amount,0)),grossProfit=money(totalRevenue-totalCogs);res.json({revenue,costOfSales:cogs,expenses,totalRevenue,totalCogs,totalExpenses,grossProfit,netProfit:money(grossProfit-totalExpenses)})});
  app.get('/api/accounting/balance-sheet',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),asOf=parseDate(req.query.asOf),branchId=Number(req.query.branchId||0)||null,rows=await accountBalanceRows(pool,bid,{asOf,branchId,types:['asset','liability','equity']}),profitRows=await accountBalanceRows(pool,bid,{asOf,branchId,types:['revenue','cost_of_sales','expense']}),assets=rows.filter(x=>x.account_type==='asset'),liabilities=rows.filter(x=>x.account_type==='liability'),equity=rows.filter(x=>x.account_type==='equity'),currentEarnings=money(profitRows.filter(x=>x.account_type==='revenue').reduce((n,x)=>n+(x.credit-x.debit),0)-profitRows.filter(x=>x.account_type==='cost_of_sales').reduce((n,x)=>n+(x.debit-x.credit),0)-profitRows.filter(x=>x.account_type==='expense').reduce((n,x)=>n+(x.debit-x.credit),0)),totalAssets=money(assets.reduce((n,x)=>n+x.balance,0)),totalLiabilities=money(liabilities.reduce((n,x)=>n+x.balance,0)),postedEquity=money(equity.reduce((n,x)=>n+x.balance,0)),totalEquity=money(postedEquity+currentEarnings);res.json({assets,liabilities,equity,currentEarnings,totalAssets,totalLiabilities,postedEquity,totalEquity,totalLiabilitiesAndEquity:money(totalLiabilities+totalEquity),isBalanced:Math.abs(totalAssets-(totalLiabilities+totalEquity))<=0.01})});
  app.get('/api/accounting/general-ledger',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),accountId=Number(req.query.accountId||0);if(!accountId)return res.status(400).json({error:'accountId is required'});const a=await pool.query('SELECT * FROM accounts WHERE id=$1 AND business_id=$2',[accountId,bid]);if(!a.rowCount)return res.status(404).json({error:'Account not found'});const from=parseDate(req.query.from),to=parseDate(req.query.to),branchId=Number(req.query.branchId||0)||null,q=await pool.query("SELECT je.entry_date,je.entry_no,je.description,je.reference_type,je.reference_id,je.source_reference,jl.debit,jl.credit,jl.memo,coalesce(b.name,'-') branch_name FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id LEFT JOIN branches b ON b.id=coalesce(jl.branch_id,je.branch_id) WHERE jl.account_id=$1 AND je.business_id=$2 AND je.status='posted' AND ($3::date IS NULL OR je.entry_date >= $3::date) AND ($4::date IS NULL OR je.entry_date <= $4::date) AND ($5::bigint IS NULL OR coalesce(jl.branch_id,je.branch_id)=$5) ORDER BY je.entry_date,je.id,jl.id",[accountId,bid,from,to,branchId]);let balance=0;const rows=q.rows.map(x=>{balance=money(balance+(a.rows[0].normal_balance==='debit'?Number(x.debit)-Number(x.credit):Number(x.credit)-Number(x.debit)));return {...x,balance}});res.json({account:a.rows[0],rows,closingBalance:balance})});
  app.get('/api/accounting/cashbook',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),from=parseDate(req.query.from),to=parseDate(req.query.to),accounts=(await pool.query("SELECT * FROM accounts WHERE business_id=$1 AND is_active=true AND account_type='asset' AND (account_code LIKE '111%' OR lower(name) ~ '(cash|bank|mobile|card|wallet)') ORDER BY account_code",[bid])).rows;const result=[];for(const a of accounts){const q=await pool.query("SELECT coalesce(sum(jl.debit),0)::numeric debit,coalesce(sum(jl.credit),0)::numeric credit FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id WHERE jl.account_id=$1 AND je.status='posted' AND ($2::date IS NULL OR je.entry_date >= $2::date) AND ($3::date IS NULL OR je.entry_date <= $3::date)",[a.id,from,to]);result.push({...a,debit:Number(q.rows[0].debit),credit:Number(q.rows[0].credit),balance:Number(q.rows[0].debit)-Number(q.rows[0].credit)})}res.json(result)});

  app.get('/api/accounting/periods',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req);res.json((await pool.query('SELECT * FROM accounting_periods WHERE business_id=$1 ORDER BY start_date DESC',[bid])).rows)});
  app.post('/api/accounting/periods',auth,tenant,permit('accounting.close'),async(req,res)=>{const bid=await getBiz(req),{name,startDate,endDate}=req.body||{};try{const q=await pool.query("INSERT INTO accounting_periods(business_id,name,start_date,end_date,status) VALUES($1,$2,$3,$4,'open') RETURNING *",[bid,name,startDate,endDate]);res.json(q.rows[0])}catch(e){res.status(400).json({error:e.message})}});
  app.put('/api/accounting/periods/:id/status',auth,tenant,permit('accounting.close'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id),status=String(req.body?.status||'');if(!['open','closing','closed','locked'].includes(status))return res.status(400).json({error:'Invalid period status'});const q=await pool.query("UPDATE accounting_periods SET status=$1,closed_by_user_id=CASE WHEN $1 IN ('closed','locked') THEN $2 ELSE NULL END,closed_at=CASE WHEN $1 IN ('closed','locked') THEN now() ELSE NULL END WHERE id=$3 AND business_id=$4 RETURNING *",[status,req.user.id,id,bid]);res.json(q.rows[0])});

  app.post('/api/expenses/:id/attachments',auth,tenant,rolesAllowed('owner','administrator','admin','branch_manager','accountant','auditor'),documentUpload.single('file'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id);if(!req.file)return res.status(400).json({error:'Choose an image or PDF under 10MB'});const e=await pool.query('SELECT id FROM expenses WHERE id=$1 AND business_id=$2',[id,bid]);if(!e.rowCount){try{fs.unlinkSync(req.file.path)}catch{};return res.status(404).json({error:'Expense not found'})}const url='/uploads/documents/'+req.file.filename,q=await pool.query("INSERT INTO document_attachments(business_id,entity_type,entity_id,document_type,original_filename,stored_filename,mime_type,file_size,file_url,uploaded_by_user_id,uploaded_by_name) VALUES($1,'expense',$2,'receipt',$3,$4,$5,$6,$7,$8,$9) RETURNING *",[bid,id,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,url,req.user.id,req.user.name]);await audit(req.user,bid,'attach','expense',id,{attachmentId:q.rows[0].id});res.json(q.rows[0])});
  app.get('/api/expenses/:id/attachments',auth,tenant,rolesAllowed('owner','administrator','admin','branch_manager','accountant','auditor'),async(req,res)=>{const bid=await getBiz(req),id=Number(req.params.id);res.json((await pool.query("SELECT * FROM document_attachments WHERE business_id=$1 AND entity_type='expense' AND entity_id=$2 ORDER BY id DESC",[bid,id])).rows)});
  app.delete('/api/expenses/:expenseId/attachments/:id',auth,tenant,permit('accounting.manage'),async(req,res)=>{const bid=await getBiz(req),expenseId=Number(req.params.expenseId),id=Number(req.params.id),q=await pool.query("DELETE FROM document_attachments WHERE id=$1 AND business_id=$2 AND entity_type='expense' AND entity_id=$3 RETURNING *",[id,bid,expenseId]);if(!q.rowCount)return res.status(404).json({error:'Attachment not found'});try{const f=q.rows[0].file_url;if(f?.startsWith('/uploads/documents/'))fs.unlinkSync(f.replace(/^\/uploads\//,'uploads/'))}catch{}res.json({ok:true})});

  app.get('/api/accounting/dashboard',auth,tenant,permit('accounting.view'),async(req,res)=>{
    const bid=await getBiz(req),from=parseDate(req.query.from),to=parseDate(req.query.to),branchId=Number(req.query.branchId||0)||null;
    const [pnl,tb,cash,journals,ap,ar,trend,recent]=await Promise.all([
      accountBalanceRows(pool,bid,{from,to,branchId,types:['revenue','cost_of_sales','expense']}),
      accountBalanceRows(pool,bid,{asOf:to,branchId}),
      pool.query("SELECT a.account_code,a.name,coalesce(sum(CASE WHEN je.status='posted' AND ($2::date IS NULL OR je.entry_date <= $2::date) AND ($3::bigint IS NULL OR coalesce(jl.branch_id,je.branch_id)=$3) THEN jl.debit-jl.credit ELSE 0 END),0)::numeric balance FROM accounts a LEFT JOIN journal_lines jl ON jl.account_id=a.id LEFT JOIN journal_entries je ON je.id=jl.journal_entry_id WHERE a.business_id=$1 AND a.account_code LIKE '111%' GROUP BY a.id ORDER BY a.account_code",[bid,to,branchId]),
      pool.query("SELECT count(*)::int count FROM journal_entries WHERE business_id=$1 AND status='posted' AND ($2::date IS NULL OR entry_date >= $2::date) AND ($3::date IS NULL OR entry_date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",[bid,from,to,branchId]),
      pool.query("SELECT coalesce(sum(balance_due),0)::numeric v FROM supplier_invoices WHERE business_id=$1 AND status NOT IN ('paid','cancelled')",[bid]),
      pool.query("SELECT coalesce(sum(balance),0)::numeric v FROM customers WHERE business_id=$1",[bid]),
      pool.query("SELECT je.entry_date d,coalesce(sum(CASE WHEN a.account_type='revenue' THEN jl.credit-jl.debit ELSE 0 END),0)::numeric revenue,coalesce(sum(CASE WHEN a.account_type='cost_of_sales' THEN jl.debit-jl.credit ELSE 0 END),0)::numeric cogs,coalesce(sum(CASE WHEN a.account_type='expense' THEN jl.debit-jl.credit ELSE 0 END),0)::numeric expenses FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id JOIN accounts a ON a.id=jl.account_id WHERE je.business_id=$1 AND je.status='posted' AND ($2::date IS NULL OR je.entry_date >= $2::date) AND ($3::date IS NULL OR je.entry_date <= $3::date) AND ($4::bigint IS NULL OR coalesce(jl.branch_id,je.branch_id)=$4) GROUP BY je.entry_date ORDER BY je.entry_date",[bid,from,to,branchId]),
      pool.query("SELECT je.entry_date,je.entry_no,je.source_module,je.description,coalesce(sum(jl.debit),0)::numeric amount FROM journal_entries je LEFT JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.business_id=$1 AND je.status='posted' AND ($2::date IS NULL OR je.entry_date >= $2::date) AND ($3::date IS NULL OR je.entry_date <= $3::date) AND ($4::bigint IS NULL OR je.branch_id=$4) GROUP BY je.id ORDER BY je.entry_date DESC,je.id DESC LIMIT 8",[bid,from,to,branchId])
    ]);
    const revenue=pnl.filter(x=>x.account_type==='revenue').reduce((n,x)=>n+x.credit-x.debit,0),
      cogs=pnl.filter(x=>x.account_type==='cost_of_sales').reduce((n,x)=>n+x.debit-x.credit,0),
      expenses=pnl.filter(x=>x.account_type==='expense').reduce((n,x)=>n+x.debit-x.credit,0),
      grossProfit=revenue-cogs,netProfit=grossProfit-expenses,totalDr=tb.reduce((n,x)=>n+x.debit,0),totalCr=tb.reduce((n,x)=>n+x.credit,0),
      totalAssets=tb.filter(x=>x.account_type==='asset').reduce((n,x)=>n+x.balance,0),
      totalLiabilities=tb.filter(x=>x.account_type==='liability').reduce((n,x)=>n+x.balance,0),
      postedEquity=tb.filter(x=>x.account_type==='equity').reduce((n,x)=>n+x.balance,0),
      cashRows=cash.rows.map(x=>({...x,balance:Number(x.balance||0)})),
      cashTotal=cashRows.reduce((n,x)=>n+Number(x.balance||0),0);
    res.json({
      revenue:money(revenue),cogs:money(cogs),grossProfit:money(grossProfit),expenses:money(expenses),netProfit:money(netProfit),
      grossMargin:revenue?money((grossProfit/revenue)*100):0,netMargin:revenue?money((netProfit/revenue)*100):0,
      accountsPayable:Number(ap.rows[0].v||0),accountsReceivable:Number(ar.rows[0].v||0),journalCount:journals.rows[0].count,
      totalAssets:money(totalAssets),totalLiabilities:money(totalLiabilities),totalEquity:money(postedEquity+netProfit),cashTotal:money(cashTotal),
      trialBalance:{debit:money(totalDr),credit:money(totalCr),balanced:Math.abs(totalDr-totalCr)<=0.01},
      cash:cashRows,
      trend:trend.rows.map(x=>({d:x.d,revenue:Number(x.revenue||0),cogs:Number(x.cogs||0),expenses:Number(x.expenses||0),netProfit:Number(x.revenue||0)-Number(x.cogs||0)-Number(x.expenses||0)})),
      recentJournals:recent.rows.map(x=>({...x,amount:Number(x.amount||0)}))
    });
  });

  app.get('/api/reports/management-dashboard',auth,tenant,permit('reports.profit'),async(req,res)=>{
    try{
    const bid=await getBiz(req),from=parseDate(req.query.from),to=parseDate(req.query.to),branchId=Number(req.query.branchId||0)||null,p=[bid,from,to,branchId];
    const [
      sales,orders,payments,refunds,expenses,purchases,inventory,production,kitchen,tables,customers,staff,
      trend,paymentMix,branches,shifts,top,orderTypes,expenseCategories,hourlySales,categorySales,cashiers
    ]=await Promise.all([
      pool.query("SELECT count(*)::int count,coalesce(sum(total),0)::numeric total,coalesce(sum(discount),0)::numeric discount,coalesce(sum(tax),0)::numeric tax,coalesce(sum(service_charge),0)::numeric service_charge,coalesce(avg(total),0)::numeric avg_check FROM sales WHERE business_id=$1 AND voided=false AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",p),
      pool.query("SELECT count(*)::int count,coalesce(sum(total),0)::numeric total,coalesce(sum(guest_count),0)::int covers FROM restaurant_orders WHERE business_id=$1 AND status<>'cancelled' AND ($2::date IS NULL OR opened_at::date >= $2::date) AND ($3::date IS NULL OR opened_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",p),
      pool.query("SELECT count(*)::int count,coalesce(sum(amount),0)::numeric total FROM payments WHERE business_id=$1 AND status='posted' AND ($2::date IS NULL OR received_at::date >= $2::date) AND ($3::date IS NULL OR received_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",p),
      pool.query("SELECT count(*)::int count,coalesce(sum(r.total),0)::numeric total FROM refunds r JOIN sales s ON s.id=r.sale_id WHERE r.business_id=$1 AND r.status='approved' AND ($2::date IS NULL OR r.approved_at::date >= $2::date) AND ($3::date IS NULL OR r.approved_at::date <= $3::date) AND ($4::bigint IS NULL OR s.branch_id=$4)",p),
      pool.query("SELECT count(*)::int count,coalesce(sum(amount),0)::numeric total FROM expenses WHERE business_id=$1 AND status='posted' AND ($2::date IS NULL OR expense_date >= $2::date) AND ($3::date IS NULL OR expense_date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",p),
      pool.query("SELECT count(*)::int count,coalesce(sum(total),0)::numeric total FROM purchase_orders WHERE business_id=$1 AND status NOT IN ('rejected','cancelled') AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4)",p),
      pool.query("SELECT count(DISTINCT p.id)::int products,coalesce(sum(ib.qty*ib.avg_cost),0)::numeric valuation,count(DISTINCT p.id) FILTER (WHERE ib.qty<=coalesce(rl.reorder_level,p.reorder_level))::int low_stock FROM products p LEFT JOIN inventory_balances ib ON ib.product_id=p.id AND ib.business_id=p.business_id LEFT JOIN inventory_reorder_levels rl ON rl.business_id=ib.business_id AND rl.product_id=ib.product_id AND rl.location_id=ib.location_id WHERE p.business_id=$1 AND p.active=true",[bid]),
      pool.query("SELECT count(*)::int count,coalesce(sum(actual_yield),0)::numeric yield,coalesce(sum(total_cost),0)::numeric cost FROM recipe_batches WHERE business_id=$1 AND status='completed' AND ($2::date IS NULL OR prepared_at::date >= $2::date) AND ($3::date IS NULL OR prepared_at::date <= $3::date)",[bid,from,to]),
      pool.query("SELECT count(*)::int tickets,coalesce(avg(extract(epoch from (coalesce(ready_at,now())-created_at))/60.0),0)::numeric avg_minutes,count(*) FILTER (WHERE status='ready')::int ready,count(*) FILTER (WHERE status IN ('new','preparing'))::int active FROM kitchen_tickets WHERE business_id=$1 AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date)",[bid,from,to]),
      pool.query("SELECT count(*)::int total,count(*) FILTER (WHERE status='occupied')::int occupied,count(*) FILTER (WHERE status='waiting_for_bill')::int waiting,count(*) FILTER (WHERE status='available')::int available,count(*) FILTER (WHERE cleanliness_status='dirty')::int dirty FROM restaurant_tables WHERE business_id=$1 AND active=true",[bid]),
      pool.query("SELECT count(*)::int count,coalesce(sum(balance),0)::numeric receivable FROM customers WHERE business_id=$1",[bid]),
      pool.query("SELECT count(*)::int count FROM user_businesses WHERE business_id=$1 AND active=true AND coalesce(staff_status,'active')='active'",[bid]),
      pool.query("WITH days AS (SELECT generate_series(coalesce($2::date,current_date-29),coalesce($3::date,current_date),'1 day')::date d) SELECT days.d,coalesce((SELECT sum(s.total) FROM sales s WHERE s.business_id=$1 AND s.voided=false AND s.created_at::date=days.d AND ($4::bigint IS NULL OR s.branch_id=$4)),0)::numeric sales,coalesce((SELECT sum(e.amount) FROM expenses e WHERE e.business_id=$1 AND e.status='posted' AND e.expense_date=days.d AND ($4::bigint IS NULL OR e.branch_id=$4)),0)::numeric expenses,coalesce((SELECT sum(r.total) FROM refunds r JOIN sales s ON s.id=r.sale_id WHERE r.business_id=$1 AND r.status='approved' AND r.approved_at::date=days.d AND ($4::bigint IS NULL OR s.branch_id=$4)),0)::numeric refunds FROM days ORDER BY days.d",p),
      pool.query("SELECT payment_method,count(*)::int transactions,coalesce(sum(amount),0)::numeric total FROM payments WHERE business_id=$1 AND status='posted' AND ($2::date IS NULL OR received_at::date >= $2::date) AND ($3::date IS NULL OR received_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY payment_method ORDER BY total DESC",p),
      pool.query("SELECT b.id,b.name,count(s.id)::int transactions,coalesce(sum(s.total),0)::numeric sales FROM branches b LEFT JOIN sales s ON s.branch_id=b.id AND s.voided=false AND ($2::date IS NULL OR s.created_at::date >= $2::date) AND ($3::date IS NULL OR s.created_at::date <= $3::date) WHERE b.business_id=$1 AND b.active=true GROUP BY b.id ORDER BY sales DESC",[bid,from,to]),
      pool.query("SELECT cs.shift_no,cs.opened_by,coalesce(b.name,'-') branch,cs.status,cs.opened_at,cs.closed_at,coalesce(sum(p.amount),0)::numeric collected,coalesce(cs.variance,0)::numeric variance,coalesce(cs.expected_cash,0)::numeric expected_cash,coalesce(cs.closing_cash,0)::numeric closing_cash FROM cash_sessions cs LEFT JOIN branches b ON b.id=cs.branch_id LEFT JOIN payments p ON p.cash_session_id=cs.id AND p.status='posted' WHERE cs.business_id=$1 AND ($2::date IS NULL OR cs.opened_at::date >= $2::date) AND ($3::date IS NULL OR cs.opened_at::date <= $3::date) AND ($4::bigint IS NULL OR cs.branch_id=$4) GROUP BY cs.id,b.name ORDER BY cs.id DESC LIMIT 30",p),
      pool.query("SELECT si.product_name,sum(si.qty)::numeric qty,sum(si.line_total)::numeric revenue,sum(si.qty*si.unit_cost)::numeric cogs FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.business_id=$1 AND s.voided=false AND ($2::date IS NULL OR s.created_at::date >= $2::date) AND ($3::date IS NULL OR s.created_at::date <= $3::date) AND ($4::bigint IS NULL OR s.branch_id=$4) GROUP BY si.product_name ORDER BY revenue DESC LIMIT 10",p),
      pool.query("SELECT coalesce(nullif(order_type,''),'other') order_type,count(*)::int transactions,coalesce(sum(total),0)::numeric total FROM sales WHERE business_id=$1 AND voided=false AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY coalesce(nullif(order_type,''),'other') ORDER BY total DESC",p),
      pool.query("SELECT coalesce(nullif(category,''),'General') category,count(*)::int transactions,coalesce(sum(amount),0)::numeric total FROM expenses WHERE business_id=$1 AND status='posted' AND ($2::date IS NULL OR expense_date >= $2::date) AND ($3::date IS NULL OR expense_date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY coalesce(nullif(category,''),'General') ORDER BY total DESC LIMIT 8",p),
      pool.query("SELECT extract(hour from created_at)::int AS sale_hour,count(*)::int transactions,coalesce(sum(total),0)::numeric sales FROM sales WHERE business_id=$1 AND voided=false AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY extract(hour from created_at)::int ORDER BY sale_hour",p),
      pool.query("SELECT coalesce(nullif(p.category,''),'Uncategorised') category,sum(si.qty)::numeric qty,coalesce(sum(si.line_total),0)::numeric revenue FROM sale_items si JOIN sales s ON s.id=si.sale_id LEFT JOIN products p ON p.id=si.product_id WHERE s.business_id=$1 AND s.voided=false AND ($2::date IS NULL OR s.created_at::date >= $2::date) AND ($3::date IS NULL OR s.created_at::date <= $3::date) AND ($4::bigint IS NULL OR s.branch_id=$4) GROUP BY coalesce(nullif(p.category,''),'Uncategorised') ORDER BY revenue DESC LIMIT 8",p),
      pool.query("SELECT coalesce(nullif(cashier,''),'Unknown') cashier,count(*)::int transactions,coalesce(sum(total),0)::numeric sales,coalesce(avg(total),0)::numeric avg_check FROM sales WHERE business_id=$1 AND voided=false AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY coalesce(nullif(cashier,''),'Unknown') ORDER BY sales DESC LIMIT 8",p)
    ]);
    res.json({
      sales:sales.rows[0],restaurant:orders.rows[0],payments:payments.rows[0],refunds:refunds.rows[0],expenses:expenses.rows[0],
      purchases:purchases.rows[0],inventory:inventory.rows[0],production:production.rows[0],kitchen:kitchen.rows[0],tables:tables.rows[0],
      customers:customers.rows[0],staff:staff.rows[0],
      trend:trend.rows.map(x=>({...x,sales:Number(x.sales),expenses:Number(x.expenses),refunds:Number(x.refunds)})),
      paymentMix:paymentMix.rows.map(x=>({...x,total:Number(x.total)})),
      branches:branches.rows.map(x=>({...x,sales:Number(x.sales)})),
      shifts:shifts.rows.map(x=>({...x,collected:Number(x.collected),variance:Number(x.variance),expected_cash:Number(x.expected_cash),closing_cash:Number(x.closing_cash)})),
      topItems:top.rows.map(x=>({...x,qty:Number(x.qty),revenue:Number(x.revenue),cogs:Number(x.cogs),contribution:Number(x.revenue)-Number(x.cogs)})),
      orderTypes:orderTypes.rows.map(x=>({...x,total:Number(x.total)})),
      expenseCategories:expenseCategories.rows.map(x=>({...x,total:Number(x.total)})),
      hourlySales:hourlySales.rows.map(x=>({...x,hour:Number(x.sale_hour),sales:Number(x.sales)})),
      categorySales:categorySales.rows.map(x=>({...x,qty:Number(x.qty),revenue:Number(x.revenue)})),
      cashiers:cashiers.rows.map(x=>({...x,sales:Number(x.sales),avg_check:Number(x.avg_check)}))
    });
      }catch(e){
      console.error('management-dashboard error',e);
      if(!res.headersSent)res.status(500).json({error:'Management analytics could not be loaded'});
    }
  });

  /* Mauzo detailed reporting v2 */
  async function detailedReport(bid,type,{from=null,to=null,branchIds=null,expiryDays=30}={}){
    const p=[bid,from,to,branchIds];
    const dateSql=(col)=>`(\$2::date IS NULL OR ${col} >= \$2::date) AND (\$3::date IS NULL OR ${col} <= \$3::date)`;
    const branchSql=(col)=>`(\$4::bigint[] IS NULL OR ${col}=ANY(\$4::bigint[]))`;
    const n=v=>Number(v||0);
    if(type==='sales'){
      const q=await pool.query(`SELECT s.id,s.created_at,s.receipt_no,coalesce(b.name,'-') branch,coalesce(s.order_type,'counter') order_type,coalesce(pc.counter,'Unassigned') counter,coalesce(s.cashier,'-') cashier,s.subtotal,s.discount,s.tax,s.total,s.payment_method,s.amount_paid,s.balance_due,coalesce(sum(si.qty),0)::numeric items,coalesce(sum(si.qty*si.unit_cost),0)::numeric cogs
        FROM sales s LEFT JOIN branches b ON b.id=s.branch_id LEFT JOIN sale_items si ON si.sale_id=s.id
        LEFT JOIN LATERAL (SELECT string_agg(DISTINCT coalesce(t.name,cs.shift_no),' · ') counter FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id LEFT JOIN cash_sessions cs ON cs.id=p.cash_session_id LEFT JOIN terminals t ON t.id=coalesce(p.terminal_id,cs.terminal_id) WHERE pa.business_id=s.business_id AND ((pa.source_type='sale' AND pa.source_id=s.id) OR (pa.source_type='restaurant_order' AND EXISTS(SELECT 1 FROM restaurant_orders ro WHERE ro.id=pa.source_id AND ro.sale_id=s.id)))) pc ON true
        WHERE s.business_id=$1 AND s.voided=false AND ${dateSql('s.created_at::date')} AND ${branchSql('s.branch_id')}
        GROUP BY s.id,b.name,pc.counter ORDER BY s.created_at DESC,s.id DESC`,p);
      const rows=q.rows.map(x=>({...x,subtotal:n(x.subtotal),discount:n(x.discount),tax:n(x.tax),total:n(x.total),amount_paid:n(x.amount_paid),balance_due:n(x.balance_due),items:n(x.items),cogs:n(x.cogs),gross_profit:n(x.total)-n(x.cogs)}));
      return {title:'Sales Detail',columns:[['created_at','Date'],['receipt_no','Receipt'],['branch','Branch'],['counter','Counter / Terminal'],['order_type','Sale / Order Type'],['cashier','Cashier'],['payment_method','Payment'],['items','Items'],['subtotal','Gross'],['discount','Discount'],['tax','Tax'],['total','Net Sales'],['cogs','COGS'],['gross_profit','Gross Profit'],['balance_due','Balance Due']],rows,summary:{grossSales:rows.reduce((a,x)=>a+x.subtotal,0),discounts:rows.reduce((a,x)=>a+x.discount,0),netSales:rows.reduce((a,x)=>a+x.total,0),cogs:rows.reduce((a,x)=>a+x.cogs,0),grossProfit:rows.reduce((a,x)=>a+x.gross_profit,0),transactions:rows.length}};
    }
    if(type==='counters'){
      const q=await pool.query(`SELECT coalesce(b.name,'-') branch,coalesce(t.name,cs.shift_no,'Unassigned counter') counter,coalesce(p.received_by,cs.opened_by,'-') cashier,p.payment_method,count(*)::int transactions,coalesce(sum(p.amount),0)::numeric total
        FROM payments p LEFT JOIN cash_sessions cs ON cs.id=p.cash_session_id LEFT JOIN terminals t ON t.id=coalesce(p.terminal_id,cs.terminal_id) LEFT JOIN branches b ON b.id=coalesce(p.branch_id,cs.branch_id)
        WHERE p.business_id=$1 AND p.status='posted' AND ${dateSql('p.received_at::date')} AND ${branchSql('coalesce(p.branch_id,cs.branch_id)')}
        GROUP BY b.name,t.name,cs.shift_no,p.received_by,cs.opened_by,p.payment_method ORDER BY total DESC`,p);
      const rows=q.rows.map(x=>({...x,transactions:n(x.transactions),total:n(x.total)}));
      return {title:'Sales by Counter / Bar',columns:[['branch','Branch'],['counter','Counter / Bar'],['cashier','Cashier'],['payment_method','Payment Method'],['transactions','Transactions'],['total','Amount']],rows,summary:{total:rows.reduce((a,x)=>a+x.total,0),transactions:rows.reduce((a,x)=>a+x.transactions,0)}};
    }
    if(type==='cash_flow'){
      const q=await pool.query(`SELECT je.entry_date,je.entry_no,coalesce(b.name,'-') branch,coalesce(a.name,a.account_code) payment_account,je.source_module,coalesce(je.source_reference,je.reference_type,'-') source,je.description,jl.debit,jl.credit
        FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id JOIN accounts a ON a.id=jl.account_id LEFT JOIN branches b ON b.id=coalesce(jl.branch_id,je.branch_id)
        WHERE je.business_id=$1 AND je.status='posted' AND a.account_type='asset' AND (a.account_code LIKE '111%' OR lower(a.name) ~ '(cash|bank|mobile|card|wallet)') AND ${dateSql('je.entry_date')} AND ${branchSql('coalesce(jl.branch_id,je.branch_id)')}
        ORDER BY je.entry_date DESC,je.id DESC,jl.id DESC`,p);
      const rows=q.rows.map(x=>({...x,cash_in:n(x.debit),cash_out:n(x.credit),net:n(x.debit)-n(x.credit)}));
      return {title:'Cash Flow',columns:[['entry_date','Date'],['entry_no','Journal'],['branch','Branch'],['payment_account','Cash / Bank / Mobile Account'],['source_module','Source Module'],['source','Source Transaction'],['description','Description'],['cash_in','Cash In'],['cash_out','Cash Out'],['net','Net']],rows,summary:{cashIn:rows.reduce((a,x)=>a+x.cash_in,0),cashOut:rows.reduce((a,x)=>a+x.cash_out,0),net:rows.reduce((a,x)=>a+x.net,0)}};
    }
    if(type==='expenses'){
      const q=await pool.query(`SELECT e.id,e.expense_date,e.reference_no,e.category,e.description,e.amount,e.payee,coalesce(emp.name,e.payee,'-') recipient,coalesce(b.name,'-') branch,coalesce(t.name,'-') counter,e.department,e.payment_method,coalesce(pa.name,src.name,'-') source_account,coalesce(e.created_by_name,'-') recorded_by,coalesce(e.approved_by_name,'-') approved_by,coalesce(e.paid_by_name,e.created_by_name,'-') paid_by,e.source_type,e.source_id,e.status
        FROM expenses e LEFT JOIN users emp ON emp.id=e.employee_id LEFT JOIN branches b ON b.id=e.branch_id LEFT JOIN terminals t ON t.id=e.terminal_id LEFT JOIN accounts pa ON pa.id=e.payment_account_id
        LEFT JOIN LATERAL (SELECT a.name FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id JOIN accounts a ON a.id=jl.account_id WHERE je.business_id=e.business_id AND je.reference_id=e.id AND je.status='posted' AND a.account_type='asset' AND jl.credit>0 ORDER BY jl.credit DESC LIMIT 1) src ON true
        WHERE e.business_id=$1 AND e.status='posted' AND ${dateSql('e.expense_date')} AND ${branchSql('e.branch_id')}
        ORDER BY e.expense_date DESC,e.id DESC`,p);
      const rows=q.rows.map(x=>({...x,amount:n(x.amount)}));
      return {title:'Expense & Cash-Out Detail',columns:[['expense_date','Date'],['reference_no','Reference'],['category','Category'],['description','Description'],['amount','Amount'],['recipient','Recipient / Payee'],['branch','Branch'],['counter','Counter'],['department','Department'],['payment_method','Payment Method'],['source_account','Paid From'],['recorded_by','Recorded By'],['approved_by','Approved By'],['paid_by','Paid By'],['source_type','Source']],rows,summary:{expenses:rows.reduce((a,x)=>a+x.amount,0),count:rows.length}};
    }
    if(type==='allowances'){
      const q=await pool.query(`SELECT ea.id,ea.allowance_date,ea.reference_no,u.name employee,ea.allowance_type,ea.reason,ea.amount,coalesce(b.name,'-') branch,coalesce(t.name,'-') counter,ea.department,ea.payment_method,coalesce(a.name,'-') source_account,coalesce(ea.approved_by_name,'-') approved_by,coalesce(ea.paid_by_name,'-') paid_by,ea.notes
        FROM employee_allowances ea JOIN users u ON u.id=ea.employee_id LEFT JOIN branches b ON b.id=ea.branch_id LEFT JOIN terminals t ON t.id=ea.terminal_id LEFT JOIN accounts a ON a.id=ea.payment_account_id
        WHERE ea.business_id=$1 AND ea.status='posted' AND ${dateSql('ea.allowance_date')} AND ${branchSql('ea.branch_id')} ORDER BY ea.allowance_date DESC,ea.id DESC`,p);
      const rows=q.rows.map(x=>({...x,amount:n(x.amount)}));
      return {title:'Employee Allowances',columns:[['allowance_date','Date'],['reference_no','Reference'],['employee','Employee'],['allowance_type','Allowance Type'],['reason','Reason'],['amount','Amount'],['branch','Branch'],['counter','Counter'],['department','Department'],['payment_method','Payment Method'],['source_account','Paid From'],['approved_by','Approved By'],['paid_by','Paid By'],['notes','Notes']],rows,summary:{allowances:rows.reduce((a,x)=>a+x.amount,0),count:rows.length}};
    }
    if(type==='stock'){
      const q=await pool.query(`SELECT sm.created_at,sm.reference_no,p.name product,p.sku,coalesce(b.name,'-') branch,coalesce(lf.name,lt.name,'-') location,sm.movement_type,sm.quantity,sm.stock_before,sm.stock_after,sm.unit_cost,(sm.quantity*sm.unit_cost)::numeric value,sm.reason,sm.created_by
        FROM stock_movements sm JOIN products p ON p.id=sm.product_id LEFT JOIN branches b ON b.id=sm.branch_id LEFT JOIN inventory_locations lf ON lf.id=sm.from_location_id LEFT JOIN inventory_locations lt ON lt.id=sm.to_location_id
        WHERE sm.business_id=$1 AND ${dateSql('sm.created_at::date')} AND ${branchSql('sm.branch_id')} ORDER BY sm.created_at DESC,sm.id DESC`,p);
      const rows=q.rows.map(x=>({...x,quantity:n(x.quantity),stock_before:n(x.stock_before),stock_after:n(x.stock_after),unit_cost:n(x.unit_cost),value:n(x.value)}));
      return {title:'Stock Movement',columns:[['created_at','Date / Time'],['reference_no','Reference'],['product','Product'],['sku','SKU'],['branch','Branch'],['location','Location'],['movement_type','Movement'],['quantity','Qty Change'],['stock_before','Before'],['stock_after','After'],['unit_cost','Unit Cost'],['value','Value'],['reason','Reason'],['created_by','User']],rows,summary:{movementValue:rows.reduce((a,x)=>a+Math.abs(x.value),0),movements:rows.length}};
    }
    if(type==='expiry'){
      const days=Math.max(0,Math.min(3650,Number(expiryDays||30)));
      const q=await pool.query(`SELECT il.id,p.name product,p.sku,il.lot_no,il.expiry_date,il.qty,il.unit_cost,(il.qty*il.unit_cost)::numeric stock_value,coalesce(s.name,'-') supplier,il.received_at,coalesce(b.name,'-') branch,l.name location,(il.expiry_date-current_date)::int days_to_expiry,
        CASE WHEN il.expiry_date<current_date THEN 'expired' WHEN il.expiry_date<=current_date+$2::int THEN 'expiring_soon' ELSE 'ok' END status
        FROM inventory_lots il JOIN products p ON p.id=il.product_id JOIN inventory_locations l ON l.id=il.location_id LEFT JOIN branches b ON b.id=l.branch_id LEFT JOIN suppliers s ON s.id=il.supplier_id
        WHERE il.business_id=$1 AND il.active=true AND il.qty>0 AND il.expiry_date IS NOT NULL AND (il.expiry_date<=current_date+$2::int OR $2::int=0) AND ($3::bigint[] IS NULL OR l.branch_id=ANY($3::bigint[]))
        ORDER BY il.expiry_date,p.name`,[bid,days,branchIds]);
      const rows=q.rows.map(x=>({...x,qty:n(x.qty),unit_cost:n(x.unit_cost),stock_value:n(x.stock_value),days_to_expiry:n(x.days_to_expiry)}));
      return {title:'Stock Expiry',columns:[['status','Status'],['expiry_date','Expiry Date'],['days_to_expiry','Days'],['product','Product'],['sku','SKU'],['lot_no','Batch / Lot'],['qty','Qty'],['unit_cost','Unit Cost'],['stock_value','Stock Value'],['supplier','Supplier'],['received_at','Received'],['branch','Branch'],['location','Location']],rows,summary:{expiredValue:rows.filter(x=>x.status==='expired').reduce((a,x)=>a+x.stock_value,0),expiringValue:rows.filter(x=>x.status==='expiring_soon').reduce((a,x)=>a+x.stock_value,0),batches:rows.length}};
    }
    if(type==='food'){
      const q=await pool.query(`SELECT x.created_at,x.reference_no,x.activity,x.product,x.qty,x.unit_cost,(x.qty*x.unit_cost)::numeric value,x.location,x.user_name FROM (
        SELECT ic.created_at,ic.reference_no,CASE ic.consumption_type WHEN 'staff_meal' THEN 'Food Consumed Internally' WHEN 'complimentary' THEN 'Complimentary Food' ELSE initcap(replace(ic.consumption_type,'_',' ')) END activity,p.name product,ici.qty,ici.unit_cost,l.name location,ic.created_by user_name
        FROM inventory_consumptions ic JOIN inventory_consumption_items ici ON ici.consumption_id=ic.id JOIN products p ON p.id=ici.product_id JOIN inventory_locations l ON l.id=ic.location_id
        WHERE ic.business_id=$1 AND ${dateSql('ic.created_at::date')} AND (\$4::bigint IS NULL OR l.branch_id=\$4)
        UNION ALL
        SELECT sa.created_at,sa.reference_no,CASE WHEN sa.adjustment_type='spoilage' THEN 'Food Spoilage' ELSE 'Food Wastage' END,p.name,abs(sai.qty_change),sai.unit_cost,l.name,sa.created_by
        FROM stock_adjustments sa JOIN stock_adjustment_items sai ON sai.adjustment_id=sa.id JOIN products p ON p.id=sai.product_id JOIN inventory_locations l ON l.id=sa.location_id
        WHERE sa.business_id=$1 AND sa.status='posted' AND sa.adjustment_type IN ('wastage','spoilage') AND ${dateSql('sa.created_at::date')} AND (\$4::bigint IS NULL OR l.branch_id=\$4)
      ) x ORDER BY x.created_at DESC`,p);
      const rows=q.rows.map(x=>({...x,qty:n(x.qty),unit_cost:n(x.unit_cost),value:n(x.value)}));
      return {title:'Food Consumption & Wastage',columns:[['created_at','Date / Time'],['reference_no','Reference'],['activity','Activity'],['product','Product'],['qty','Qty'],['unit_cost','Unit Cost'],['value','Value'],['location','Location'],['user_name','Recorded By']],rows,summary:{internalConsumption:rows.filter(x=>/Consumed Internally|Complimentary/.test(x.activity)).reduce((a,x)=>a+x.value,0),wastage:rows.filter(x=>/Wastage|Spoilage/.test(x.activity)).reduce((a,x)=>a+x.value,0)}};
    }
    if(type==='financial'){
      const [sales,exp,pay]=await Promise.all([
        pool.query("SELECT coalesce(sum(total),0)::numeric gross,coalesce(sum(discount),0)::numeric discounts,coalesce(sum(tax),0)::numeric tax,coalesce(sum(service_charge),0)::numeric service FROM sales WHERE business_id=$1 AND voided=false AND "+dateSql('created_at::date')+" AND "+branchSql('branch_id'),p),
        pool.query("SELECT coalesce(sum(amount),0)::numeric expenses FROM expenses WHERE business_id=$1 AND status='posted' AND "+dateSql('expense_date')+" AND "+branchSql('branch_id'),p),
        pool.query("SELECT payment_method,count(*)::int transactions,coalesce(sum(amount),0)::numeric total FROM payments WHERE business_id=$1 AND status='posted' AND "+dateSql('received_at::date')+" AND "+branchSql('branch_id')+" GROUP BY payment_method ORDER BY total DESC",p)
      ]);
      const x=sales.rows[0],gross=n(x.gross),expenses=n(exp.rows[0].expenses),rows=[
        {metric:'Gross Sales',amount:gross},{metric:'Discounts',amount:n(x.discounts)},{metric:'Tax',amount:n(x.tax)},{metric:'Service Charge',amount:n(x.service)},{metric:'Expenses',amount:expenses},{metric:'Net After Expenses',amount:gross-expenses},
        ...pay.rows.map(r=>({metric:'Payments · '+r.payment_method,amount:n(r.total),transactions:n(r.transactions)}))
      ];
      return {title:'Financial Summary',columns:[['metric','Metric'],['amount','Amount'],['transactions','Transactions']],rows,summary:{grossSales:gross,expenses,net:gross-expenses}};
    }
    if(type==='restaurant'){
      const q=await pool.query("SELECT ro.opened_at,ro.order_no,ro.order_type,coalesce(rt.name,'-') table_name,ro.guest_count,ro.subtotal,ro.discount,ro.tax,ro.service_charge,ro.tip,ro.total,ro.amount_paid,ro.balance_due,ro.status,coalesce(ro.waiter_name,'-') waiter,coalesce(b.name,'-') branch FROM restaurant_orders ro LEFT JOIN restaurant_tables rt ON rt.id=ro.table_id LEFT JOIN branches b ON b.id=ro.branch_id WHERE ro.business_id=$1 AND ro.status<>'cancelled' AND "+dateSql('ro.opened_at::date')+" AND "+branchSql('ro.branch_id')+" ORDER BY ro.opened_at DESC",p);
      const rows=q.rows.map(x=>({...x,guest_count:n(x.guest_count),subtotal:n(x.subtotal),discount:n(x.discount),tax:n(x.tax),service_charge:n(x.service_charge),tip:n(x.tip),total:n(x.total),amount_paid:n(x.amount_paid),balance_due:n(x.balance_due)}));
      return {title:'Restaurant Operations',columns:[['opened_at','Opened'],['order_no','Order'],['branch','Branch'],['order_type','Type'],['table_name','Table'],['waiter','Waiter'],['guest_count','Covers'],['subtotal','Subtotal'],['discount','Discount'],['tax','Tax'],['service_charge','Service'],['tip','Tip'],['total','Total'],['amount_paid','Paid'],['balance_due','Balance'],['status','Status']],rows,summary:{orders:rows.length,covers:rows.reduce((a,x)=>a+x.guest_count,0),sales:rows.reduce((a,x)=>a+x.total,0),outstanding:rows.reduce((a,x)=>a+x.balance_due,0)}};
    }
    if(type==='payments'){
      const q=await pool.query("SELECT p.received_at,p.payment_no,coalesce(b.name,'-') branch,coalesce(t.name,cs.shift_no,'Unassigned') counter,coalesce(p.received_by,'-') received_by,p.payment_method,p.amount,p.tendered_amount,p.change_amount,p.reference,p.status FROM payments p LEFT JOIN cash_sessions cs ON cs.id=p.cash_session_id LEFT JOIN terminals t ON t.id=coalesce(p.terminal_id,cs.terminal_id) LEFT JOIN branches b ON b.id=coalesce(p.branch_id,cs.branch_id) WHERE p.business_id=$1 AND p.status='posted' AND "+dateSql('p.received_at::date')+" AND "+branchSql('coalesce(p.branch_id,cs.branch_id)')+" ORDER BY p.received_at DESC",p);
      const rows=q.rows.map(x=>({...x,amount:n(x.amount),tendered_amount:n(x.tendered_amount),change_amount:n(x.change_amount)}));
      return {title:'Payment Reconciliation',columns:[['received_at','Date / Time'],['payment_no','Payment'],['branch','Branch'],['counter','Counter / Terminal'],['received_by','Received By'],['payment_method','Method'],['amount','Amount'],['tendered_amount','Tendered'],['change_amount','Change'],['reference','Reference']],rows,summary:{payments:rows.length,total:rows.reduce((a,x)=>a+x.amount,0),change:rows.reduce((a,x)=>a+x.change_amount,0)}};
    }
    if(type==='refunds'){
      const q=await pool.query("SELECT r.created_at,r.refund_no,s.receipt_no,coalesce(b.name,'-') branch,r.request_kind,r.reason,r.total,r.status,r.requested_by_name,r.approved_by_name,r.approved_at FROM refunds r JOIN sales s ON s.id=r.sale_id LEFT JOIN branches b ON b.id=s.branch_id WHERE r.business_id=$1 AND "+dateSql('r.created_at::date')+" AND "+branchSql('s.branch_id')+" ORDER BY r.created_at DESC",p);
      const rows=q.rows.map(x=>({...x,total:n(x.total)}));
      return {title:'Refunds & Voids',columns:[['created_at','Date / Time'],['refund_no','Refund'],['receipt_no','Receipt'],['branch','Branch'],['request_kind','Type'],['reason','Reason'],['total','Amount'],['status','Status'],['requested_by_name','Requested By'],['approved_by_name','Approved By'],['approved_at','Approved At']],rows,summary:{requests:rows.length,approvedAmount:rows.filter(x=>x.status==='approved').reduce((a,x)=>a+x.total,0)}};
    }
    if(type==='inventory'){
      const q=await pool.query("SELECT p.sku,p.name product,p.category,coalesce(b.name,'-') branch,l.name location,ib.qty,ib.avg_cost,(ib.qty*ib.avg_cost)::numeric valuation,coalesce(rl.reorder_level,p.reorder_level)::numeric reorder_level,p.lot_tracking_required,greatest(0,ib.qty-coalesce(ls.assigned_qty,0))::numeric unassigned_batch_qty,CASE WHEN ib.qty<=coalesce(rl.reorder_level,p.reorder_level) THEN 'low' WHEN p.lot_tracking_required AND greatest(0,ib.qty-coalesce(ls.assigned_qty,0))>0 THEN 'batch_missing' ELSE 'ok' END status FROM inventory_balances ib JOIN products p ON p.id=ib.product_id JOIN inventory_locations l ON l.id=ib.location_id LEFT JOIN branches b ON b.id=l.branch_id LEFT JOIN inventory_reorder_levels rl ON rl.business_id=ib.business_id AND rl.product_id=ib.product_id AND rl.location_id=ib.location_id LEFT JOIN LATERAL (SELECT sum(il.qty) assigned_qty FROM inventory_lots il WHERE il.business_id=ib.business_id AND il.product_id=ib.product_id AND il.location_id=ib.location_id AND il.active=true AND il.qty>0) ls ON true WHERE ib.business_id=$1 AND p.active=true AND ($2::bigint[] IS NULL OR l.branch_id=ANY($2::bigint[])) ORDER BY p.name,l.name",[bid,branchIds]);
      const rows=q.rows.map(x=>({...x,qty:n(x.qty),avg_cost:n(x.avg_cost),valuation:n(x.valuation),reorder_level:n(x.reorder_level)}));
      return {title:'Stock On Hand & Valuation',columns:[['status','Status'],['sku','SKU'],['product','Product'],['category','Category'],['branch','Branch'],['location','Location'],['qty','On Hand'],['reorder_level','Reorder Level'],['unassigned_batch_qty','Batch Qty Missing'],['avg_cost','Average Cost'],['valuation','Valuation']],rows,summary:{products:new Set(rows.map(x=>x.sku||x.product)).size,quantity:rows.reduce((a,x)=>a+x.qty,0),valuation:rows.reduce((a,x)=>a+x.valuation,0),lowStock:rows.filter(x=>x.status==='low').length}};
    }
    if(type==='stock_counts'){
      const q=await pool.query(`SELECT c.posted_at,c.reference_no,coalesce(b.name,'-') branch,l.name location,p.name product,p.sku,i.expected_qty,i.counted_qty,(i.counted_qty-i.expected_qty)::numeric difference,i.unit_cost,((i.counted_qty-i.expected_qty)*i.unit_cost)::numeric value_difference,c.created_by
        FROM stock_counts c JOIN stock_count_items i ON i.stock_count_id=c.id JOIN products p ON p.id=i.product_id JOIN inventory_locations l ON l.id=c.location_id LEFT JOIN branches b ON b.id=l.branch_id
        WHERE c.business_id=$1 AND c.status='posted' AND ${dateSql('c.posted_at::date')} AND ${branchSql('l.branch_id')} ORDER BY c.posted_at DESC,c.id DESC,p.name`,p);
      const rows=q.rows.map(x=>({...x,expected_qty:n(x.expected_qty),counted_qty:n(x.counted_qty),difference:n(x.difference),unit_cost:n(x.unit_cost),value_difference:n(x.value_difference)}));
      return {title:'Stock Count Variance',columns:[['posted_at','Posted'],['reference_no','Count'],['branch','Branch'],['location','Location'],['product','Product'],['sku','SKU'],['expected_qty','Mauzo Qty'],['counted_qty','Counted Qty'],['difference','Difference'],['unit_cost','Unit Cost'],['value_difference','Value Difference'],['created_by','Counted By']],rows,summary:{counts:new Set(rows.map(x=>x.reference_no)).size,shortageValue:Math.abs(rows.filter(x=>x.value_difference<0).reduce((a,x)=>a+x.value_difference,0)),gainValue:rows.filter(x=>x.value_difference>0).reduce((a,x)=>a+x.value_difference,0)}};
    }
    if(type==='stock_transfers'){
      const q=await pool.query(`SELECT t.created_at,t.reference_no,coalesce(bf.name,'-') from_branch,f.name from_location,coalesce(bt.name,'-') to_branch,tol.name to_location,p.name product,p.sku,i.qty,t.status,t.notes,t.created_by
        FROM stock_transfers t JOIN stock_transfer_items i ON i.transfer_id=t.id JOIN products p ON p.id=i.product_id JOIN inventory_locations f ON f.id=t.from_location_id JOIN branches bf ON bf.id=f.branch_id JOIN inventory_locations tol ON tol.id=t.to_location_id JOIN branches bt ON bt.id=tol.branch_id
        WHERE t.business_id=$1 AND ${dateSql('t.created_at::date')} AND ($4::bigint[] IS NULL OR f.branch_id=ANY($4::bigint[]) OR tol.branch_id=ANY($4::bigint[])) ORDER BY t.created_at DESC,t.id DESC,p.name`,p);
      const rows=q.rows.map(x=>({...x,qty:n(x.qty)}));
      return {title:'Stock Transfers',columns:[['created_at','Date'],['reference_no','Transfer'],['from_branch','From Branch'],['from_location','From'],['to_branch','To Branch'],['to_location','To'],['product','Product'],['sku','SKU'],['qty','Qty'],['status','Status'],['notes','Notes'],['created_by','Moved By']],rows,summary:{transfers:new Set(rows.map(x=>x.reference_no)).size,quantity:rows.reduce((a,x)=>a+x.qty,0)}};
    }
    if(type==='reorder'){
      const q=await pool.query(`SELECT CASE WHEN ib.qty<=coalesce(rl.reorder_level,p.reorder_level) THEN 'reorder' ELSE 'ok' END status,p.sku,p.name product,coalesce(b.name,'-') branch,l.name location,ib.qty,coalesce(rl.reorder_level,p.reorder_level)::numeric reorder_level,greatest(0,coalesce(rl.reorder_level,p.reorder_level)-ib.qty)::numeric shortage,ib.avg_cost,(ib.qty*ib.avg_cost)::numeric stock_value
        FROM inventory_balances ib JOIN products p ON p.id=ib.product_id JOIN inventory_locations l ON l.id=ib.location_id LEFT JOIN branches b ON b.id=l.branch_id LEFT JOIN inventory_reorder_levels rl ON rl.business_id=ib.business_id AND rl.product_id=ib.product_id AND rl.location_id=ib.location_id
        WHERE ib.business_id=$1 AND p.active=true AND ($2::bigint[] IS NULL OR l.branch_id=ANY($2::bigint[])) ORDER BY status DESC,p.name,l.name`,[bid,branchIds]);
      const rows=q.rows.map(x=>({...x,qty:n(x.qty),reorder_level:n(x.reorder_level),shortage:n(x.shortage),avg_cost:n(x.avg_cost),stock_value:n(x.stock_value)}));
      return {title:'Reorder Report',columns:[['status','Status'],['sku','SKU'],['product','Product'],['branch','Branch'],['location','Location'],['qty','On Hand'],['reorder_level','Reorder At'],['shortage','Qty Needed'],['avg_cost','Avg Cost'],['stock_value','Stock Value']],rows,summary:{needsReorder:rows.filter(x=>x.status==='reorder').length,estimatedQtyNeeded:rows.reduce((a,x)=>a+x.shortage,0)}};
    }
    if(type==='lot_movement'){
      const q=await pool.query(`SELECT lm.created_at,coalesce(b.name,'-') branch,l.name location,p.name product,p.sku,coalesce(il.lot_no,'-') lot_no,il.expiry_date,lm.movement_type,lm.quantity,lm.balance_effect,lm.reference_no,lm.notes,lm.created_by
        FROM inventory_lot_movements lm JOIN products p ON p.id=lm.product_id JOIN inventory_locations l ON l.id=lm.location_id LEFT JOIN branches b ON b.id=l.branch_id LEFT JOIN inventory_lots il ON il.id=lm.lot_id
        WHERE lm.business_id=$1 AND ${dateSql('lm.created_at::date')} AND ${branchSql('l.branch_id')} ORDER BY lm.created_at DESC,lm.id DESC`,p);
      const rows=q.rows.map(x=>({...x,quantity:n(x.quantity)}));
      return {title:'Batch / Lot Movement',columns:[['created_at','Date / Time'],['branch','Branch'],['location','Location'],['product','Product'],['sku','SKU'],['lot_no','Batch / Lot'],['expiry_date','Expiry'],['movement_type','Activity'],['quantity','Qty'],['balance_effect','Changes Stock'],['reference_no','Reference'],['notes','Notes'],['created_by','User']],rows,summary:{movements:rows.length,trackedQuantity:rows.reduce((a,x)=>a+Math.abs(x.quantity),0)}};
    }
    if(type==='inventory_reconciliation'){
      const q=await pool.query(`WITH inv AS (
          SELECT l.branch_id,coalesce(sum(ib.qty*ib.avg_cost),0)::numeric inventory_value
          FROM inventory_balances ib JOIN inventory_locations l ON l.id=ib.location_id
          WHERE ib.business_id=$1 AND ($2::bigint[] IS NULL OR l.branch_id=ANY($2::bigint[]))
          GROUP BY l.branch_id
        ), gl AS (
          SELECT coalesce(jl.branch_id,je.branch_id) branch_id,coalesce(sum(jl.debit-jl.credit),0)::numeric ledger_value
          FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id JOIN accounts a ON a.id=jl.account_id
          WHERE je.business_id=$1 AND je.status='posted' AND a.account_code IN ('1131','1132','1133','1134') AND ($2::bigint[] IS NULL OR coalesce(jl.branch_id,je.branch_id)=ANY($2::bigint[]))
          GROUP BY coalesce(jl.branch_id,je.branch_id)
        )
        SELECT coalesce(b.name,'Unassigned') branch,coalesce(inv.inventory_value,0)::numeric inventory_value,coalesce(gl.ledger_value,0)::numeric ledger_value,(coalesce(inv.inventory_value,0)-coalesce(gl.ledger_value,0))::numeric difference
        FROM inv FULL JOIN gl ON gl.branch_id=inv.branch_id LEFT JOIN branches b ON b.id=coalesce(inv.branch_id,gl.branch_id) ORDER BY b.name`,[bid,branchIds]);
      const rows=q.rows.map(x=>({...x,inventory_value:n(x.inventory_value),ledger_value:n(x.ledger_value),difference:n(x.difference),status:Math.abs(n(x.difference))<=.01?'balanced':'review'}));
      return {title:'Inventory vs Accounts Reconciliation',columns:[['status','Status'],['branch','Branch'],['inventory_value','Stock Valuation'],['ledger_value','Inventory in Accounts'],['difference','Difference']],rows,summary:{stockValue:rows.reduce((a,x)=>a+x.inventory_value,0),ledgerValue:rows.reduce((a,x)=>a+x.ledger_value,0),difference:rows.reduce((a,x)=>a+x.difference,0)}};
    }
    if(type==='kitchen'){
      const q=await pool.query("SELECT kt.created_at,kt.ticket_no,coalesce(b.name,'-') branch,coalesce(ks.name,'Kitchen') station,ro.order_no,kt.status,kt.priority,round(extract(epoch from (coalesce(kt.ready_at,now())-kt.created_at))/60.0,1)::numeric prep_minutes,kt.printed_count FROM kitchen_tickets kt LEFT JOIN kitchen_stations ks ON ks.id=kt.station_id JOIN restaurant_orders ro ON ro.id=kt.order_id LEFT JOIN branches b ON b.id=kt.branch_id WHERE kt.business_id=$1 AND "+dateSql('kt.created_at::date')+" AND "+branchSql('kt.branch_id')+" ORDER BY kt.created_at DESC",p);
      const rows=q.rows.map(x=>({...x,prep_minutes:n(x.prep_minutes),printed_count:n(x.printed_count)}));
      return {title:'Kitchen Performance',columns:[['created_at','Created'],['ticket_no','Ticket'],['branch','Branch'],['station','Station'],['order_no','Order'],['status','Status'],['priority','Priority'],['prep_minutes','Prep Minutes'],['printed_count','Print Count']],rows,summary:{tickets:rows.length,avgMinutes:rows.length?rows.reduce((a,x)=>a+x.prep_minutes,0)/rows.length:0,ready:rows.filter(x=>x.status==='ready').length}};
    }
    if(type==='purchases'){
      const q=await pool.query(`SELECT po.created_at,po.po_no,coalesce(b.name,'-') branch,s.name supplier,po.status,po.subtotal,po.total,po.created_by,po.approved_by,po.ordered_at
        FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN branches b ON b.id=po.branch_id
        WHERE po.business_id=$1 AND po.status NOT IN ('cancelled','rejected') AND ${dateSql('po.created_at::date')} AND ${branchSql('po.branch_id')} ORDER BY po.created_at DESC,po.id DESC`,p);
      const rows=q.rows.map(x=>({...x,subtotal:n(x.subtotal),total:n(x.total)}));
      return {title:'Purchases',columns:[['created_at','Date'],['po_no','PO'],['branch','Branch'],['supplier','Supplier'],['status','Status'],['subtotal','Subtotal'],['total','Total'],['created_by','Created By'],['approved_by','Approved By'],['ordered_at','Ordered At']],rows,summary:{purchases:rows.reduce((a,x)=>a+x.total,0),count:rows.length}};
    }
    if(type==='shifts'){
      const q=await pool.query(`SELECT cs.opened_at,cs.closed_at,cs.shift_no,coalesce(b.name,'-') branch,coalesce(t.name,'-') counter,cs.opened_by cashier,cs.opening_cash,cs.expected_cash,cs.closing_cash,cs.variance,cs.status,cs.reconciliation_status,cs.manager_confirmed_by,cs.variance_reason
        FROM cash_sessions cs LEFT JOIN branches b ON b.id=cs.branch_id LEFT JOIN terminals t ON t.id=cs.terminal_id
        WHERE cs.business_id=$1 AND ${dateSql('cs.opened_at::date')} AND ${branchSql('cs.branch_id')} ORDER BY cs.opened_at DESC,cs.id DESC`,p);
      const rows=q.rows.map(x=>({...x,opening_cash:n(x.opening_cash),expected_cash:n(x.expected_cash),closing_cash:n(x.closing_cash),variance:n(x.variance)}));
      return {title:'End-of-Day / Shift Reconciliation',columns:[['opened_at','Opened'],['closed_at','Closed'],['shift_no','Shift'],['branch','Branch'],['counter','Counter'],['cashier','Cashier'],['opening_cash','Opening Cash'],['expected_cash','Expected Cash'],['closing_cash','Actual Cash'],['variance','Over / Short'],['status','Status'],['reconciliation_status','Reconciliation'],['manager_confirmed_by','Manager'],['variance_reason','Variance Reason']],rows,summary:{expected:rows.reduce((a,x)=>a+x.expected_cash,0),actual:rows.reduce((a,x)=>a+x.closing_cash,0),variance:rows.reduce((a,x)=>a+x.variance,0)}};
    }
    if(type==='ledger'){
      const q=await pool.query(`SELECT je.entry_date,je.entry_no,a.account_code,a.name account,je.description,jl.debit,jl.credit,coalesce(b.name,'-') branch,je.source_module,coalesce(je.source_reference,je.reference_type,'-') source_transaction
        FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id JOIN accounts a ON a.id=jl.account_id LEFT JOIN branches b ON b.id=coalesce(jl.branch_id,je.branch_id)
        WHERE je.business_id=$1 AND je.status='posted' AND ${dateSql('je.entry_date')} AND ${branchSql('coalesce(jl.branch_id,je.branch_id)')} ORDER BY je.entry_date DESC,je.id DESC,jl.id DESC`,p);
      const rows=q.rows.map(x=>({...x,debit:n(x.debit),credit:n(x.credit)}));
      return {title:'General Ledger Detail',columns:[['entry_date','Date'],['entry_no','Journal'],['account_code','Account Code'],['account','Account'],['description','Description'],['debit','Debit'],['credit','Credit'],['branch','Branch'],['source_module','Source Module'],['source_transaction','Source Transaction']],rows,summary:{debit:rows.reduce((a,x)=>a+x.debit,0),credit:rows.reduce((a,x)=>a+x.credit,0)}};
    }
    throw new Error('Unknown report type');
  }

  app.get('/api/accounting/reporting/export',auth,tenant,permit('accounting.export'),async(req,res)=>{try{
    const bid=await getBiz(req),type=String(req.query.type||'sales'),format=String(req.query.format||'xlsx'),requestedBranchId=Number(req.query.branchId||0)||null,branchIds=await reportBranchIds(req,bid,requestedBranchId),report=await detailedReport(bid,type,{from:parseDate(req.query.from),to:parseDate(req.query.to),branchIds,expiryDays:Number(req.query.expiryDays||30)});
    const cols=report.columns||[],rows=report.rows||[],safeName='MauzoPOS-'+type+'-'+new Date().toISOString().slice(0,10);
    if(format==='csv'){
      const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';
      res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="'+safeName+'.csv"');
      return res.send([cols.map(x=>esc(x[1])).join(','),...rows.map(r=>cols.map(x=>esc(r[x[0]])).join(','))].join('\n'));
    }
    if(format==='pdf'){
      const [bizQ,branchQ]=await Promise.all([
        pool.query('SELECT * FROM businesses WHERE id=$1',[bid]),
        requestedBranchId?pool.query('SELECT name FROM branches WHERE id=$1 AND business_id=$2',[requestedBranchId,bid]):Promise.resolve({rows:[]})
      ]);
      const biz=bizQ.rows[0]||{},branchName=requestedBranchId?(branchQ.rows[0]?.name||'Selected branch'):(branchIds?.length?('Assigned branches · '+branchIds.length):'All branches');
      const landscape=cols.length>6,size=cols.length>11?'A3':'A4',doc=new PDFDocument({size,layout:landscape?'landscape':'portrait',margin:36,bufferPages:true,info:{Title:report.title||'MauzoPOS Report',Author:biz.name||'MauzoPOS',Subject:'Business report generated by MauzoPOS'}});
      res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','inline; filename="'+safeName+'.pdf"');doc.pipe(res);
      const reportNo='REPORT · '+new Date().toISOString().slice(0,10);
      pdfReportHeader(doc,biz,report.title||'REPORT',reportNo);
      pdfReportMetaStrip(doc,[['Period',(req.query.from||'Beginning')+' — '+(req.query.to||'Today')],['Branch',branchName],['Generated',new Date().toLocaleString()],['Prepared by',req.user.name||req.user.email||'MauzoPOS user'],['Rows',rows.length],['Currency',biz.currency||'-']]);
      const monetary=/sales|profit|cogs|cash|amount|value|expense|allowance|net|debit|credit|expected|actual|variance|purchases|wastage|consumption|total|cost/i;
      const summaryEntries=Object.entries(report.summary||{});
      if(summaryEntries.length){
        pdfReportMetricStrip(doc,biz,summaryEntries.slice(0,6).map(([k,v])=>({label:String(k).replaceAll('_',' ').replace(/([a-z])([A-Z])/g,'$1 $2'),value:typeof v==='number'&&monetary.test(k)?pdfMoney(biz,v):String(v??'-'),tone:/difference|variance|shortage/i.test(k)&&Math.abs(Number(v||0))>.01?'warn':undefined})));
      }
      pdfSectionTitle(doc,'Detailed Records',rows.length+' source-level record'+(rows.length===1?'':'s'));
      const tableRows=rows.map(r=>cols.map(([key])=>{
        const v=r[key];
        if(v==null||v==='')return '-';
        if(typeof v==='boolean')return v?'Yes':'No';
        if(typeof v==='number')return v;
        if(/_at$|date/.test(String(key))){const d=new Date(v);if(!Number.isNaN(d.getTime()))return d.toLocaleString()}
        return String(v).replaceAll('_',' ');
      }));
      pdfTable(doc,biz,cols.map(x=>x[1]),tableRows,{title:report.title||'REPORT',number:reportNo,fontSize:cols.length>11?5.5:cols.length>8?6.1:6.8,compactReport:true});
      pdfFooter(doc,biz);
      pdfPageNumbers(doc,biz);
      doc.end();return;
    }
    const wb=new ExcelJS.Workbook();wb.creator='MauzoPOS';wb.created=new Date();const ws=wb.addWorksheet(String(report.title||'Report').slice(0,31));
    ws.addRow([report.title||'MauzoPOS Report']);ws.addRow(['Generated',new Date().toLocaleString()]);ws.addRow(['From',req.query.from||'All']);ws.addRow(['To',req.query.to||'All']);ws.addRow([]);ws.addRow(cols.map(x=>x[1]));
    for(const r of rows)ws.addRow(cols.map(x=>r[x[0]]));
    ws.getRow(1).font={bold:true,size:16};ws.getRow(6).font={bold:true};ws.getRow(6).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE2E8F0'}};ws.views=[{state:'frozen',ySplit:6}];ws.autoFilter={from:{row:6,column:1},to:{row:6,column:Math.max(1,cols.length)}};
    ws.columns=cols.map((col,i)=>({width:Math.min(38,Math.max(12,String(col[1]).length+2,...rows.slice(0,100).map(r=>String(r[col[0]]??'').length+2)))}));
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="'+safeName+'.xlsx"');await wb.xlsx.write(res);res.end();
  }catch(e){if(!res.headersSent)res.status(400).json({error:e.message})}});

  app.get('/api/accounting/reporting',auth,tenant,permit('accounting.view'),async(req,res)=>{try{const bid=await getBiz(req),branchIds=await reportBranchIds(req,bid,Number(req.query.branchId||0)||null);res.json(await detailedReport(bid,String(req.query.type||'sales'),{from:parseDate(req.query.from),to:parseDate(req.query.to),branchIds,expiryDays:Number(req.query.expiryDays||30)}))}catch(e){res.status(400).json({error:e.message})}});

  app.post('/api/accounting/expenses/detailed',auth,tenant,rolesAllowed('owner','administrator','admin','branch_manager','accountant'),async(req,res)=>{
    const bid=await getBiz(req),x=req.body||{},amount=positive(x.amount),method=String(x.paymentMethod||'cash').trim().toLowerCase().replaceAll('_',' '),client=await pool.connect();
    if(!String(x.description||'').trim()||!(amount>0))return res.status(400).json({error:'Description and positive amount are required'});
    try{
      await client.query('BEGIN');
      const shift=await client.query("SELECT cs.id,cs.branch_id,cs.terminal_id FROM cash_sessions cs WHERE cs.business_id=$1 AND cs.opened_by_user_id=$2 AND cs.status='open' ORDER BY cs.id DESC LIMIT 1",[bid,req.user.id]);
      if(method==='cash'&&!shift.rowCount)throw new Error('Open your cashier shift before recording a cash expense');
      let branchId=Number(x.branchId||shift.rows[0]?.branch_id||0)||null;
      if(method==='cash'&&x.branchId&&Number(x.branchId)!==Number(shift.rows[0].branch_id))throw new Error('Cash expense branch must match the open cashier shift');
      if(method==='cash')branchId=Number(shift.rows[0].branch_id);
      if(branchId){const b=await client.query('SELECT id FROM branches WHERE id=$1 AND business_id=$2 AND active=true',[branchId,bid]);if(!b.rowCount)throw new Error('Branch is not available')}
      const terminalId=method==='cash'?Number(shift.rows[0]?.terminal_id||0)||null:Number(x.terminalId||shift.rows[0]?.terminal_id||0)||null;
      let paymentAccountId=Number(x.paymentAccountId||0)||null;
      if(paymentAccountId)await validatePaymentSourceAccount(client,bid,method,paymentAccountId);
      else paymentAccountId=Number((await mappedAccount(client,bid,paymentAccountKey(method),paymentAccountKey(method)==='cash'?'1111':'1112')).id);
      let approvedByUserId=null,approvedByName=null;
      if(method==='cash'){
        const settings=await client.query('SELECT payout_approval_threshold FROM cash_control_settings WHERE business_id=$1',[bid]),threshold=Number(settings.rows[0]?.payout_approval_threshold||0);
        if(threshold>0&&amount>threshold){
          if(!(await hasPermission(req,bid,'shift.payout.approve'))&&!(await hasPermission(req,bid,'shift.close')))throw new Error('Manager approval is required for a cash expense above '+threshold);
          approvedByUserId=req.user.id;approvedByName=req.user.name;
        }
      }
      const expenseAccountId=Number(x.expenseAccountId||0)||null;
      if(expenseAccountId){const eq=await client.query("SELECT id FROM accounts WHERE id=$1 AND business_id=$2 AND account_type IN ('expense','cost_of_sales') AND is_active=true",[expenseAccountId,bid]);if(!eq.rowCount)throw new Error('Expense account is invalid')}
      const ref='EXP-'+Date.now().toString(36).toUpperCase();
      const q=await client.query("INSERT INTO expenses(business_id,branch_id,terminal_id,cash_session_id,category,description,amount,expense_date,reference_no,source_type,auto_generated,accounting_treatment,status,payment_method,expense_account_id,payment_account_id,payee,employee_id,department,created_by_user_id,created_by_name,paid_by_user_id,paid_by_name,approved_by_user_id,approved_by_name,notes) VALUES($1,$2,$3,$4,$5,$6,$7,coalesce($8,current_date),$9,'manual',false,'operating_expense','posted',$10,$11,$12,$13,$14,$15,$16,$17,$16,$17,$18,$19,$20) RETURNING *",[bid,branchId,terminalId,shift.rows[0]?.id||null,String(x.category||'General'),String(x.description).trim(),amount,x.expenseDate||null,ref,method,expenseAccountId,paymentAccountId,x.payee||null,Number(x.employeeId||0)||null,x.department||null,req.user.id,req.user.name,approvedByUserId,approvedByName,x.notes||null]);
      if(method==='cash'&&shift.rows[0]?.id)await client.query("INSERT INTO cash_movements(business_id,session_id,movement_type,movement_category,amount,reason,reference,expense_category,recipient,created_by_user_id,created_by,approved_by_user_id,approved_by) VALUES($1,$2,'cash_out','expense',$3,$4,$5,$6,$7,$8,$9,$10,$11)",[bid,shift.rows[0].id,amount,String(x.description).trim(),ref,String(x.category||'General'),x.payee||null,req.user.id,req.user.name,approvedByUserId,approvedByName]);
      await postExpenseAccounting(client,{bid,expenseId:Number(q.rows[0].id),userId:req.user.id});
      await client.query('COMMIT');await audit(req.user,bid,'create','expense',q.rows[0].id,{referenceNo:ref,amount,payee:x.payee||null,paymentAccountId});res.json(q.rows[0]);
    }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}
  });

  app.get('/api/accounting/staff-options',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req);const q=await pool.query("SELECT u.id,u.name,u.email,coalesce(string_agg(DISTINCT ubr.role,', '),ub.role) role FROM user_businesses ub JOIN users u ON u.id=ub.user_id LEFT JOIN user_business_roles ubr ON ubr.user_id=u.id AND ubr.business_id=ub.business_id WHERE ub.business_id=$1 AND ub.active=true AND coalesce(ub.staff_status,'active')='active' AND u.active=true GROUP BY u.id,ub.role ORDER BY u.name,u.email",[bid]);res.json(q.rows)});

  app.get('/api/accounting/allowances',auth,tenant,permit('accounting.view'),async(req,res)=>{const bid=await getBiz(req),q=await pool.query("SELECT ea.*,u.name employee_name,b.name branch_name,t.name terminal_name,a.name payment_account_name FROM employee_allowances ea JOIN users u ON u.id=ea.employee_id LEFT JOIN branches b ON b.id=ea.branch_id LEFT JOIN terminals t ON t.id=ea.terminal_id LEFT JOIN accounts a ON a.id=ea.payment_account_id WHERE ea.business_id=$1 ORDER BY ea.allowance_date DESC,ea.id DESC",[bid]);res.json(q.rows)});

  app.post('/api/accounting/allowances',auth,tenant,rolesAllowed('owner','administrator','admin','branch_manager','accountant'),async(req,res)=>{
    const bid=await getBiz(req),x=req.body||{},employeeId=Number(x.employeeId||0),amount=positive(x.amount),method=String(x.paymentMethod||'cash').trim().toLowerCase().replaceAll('_',' '),client=await pool.connect();
    if(!employeeId||!(amount>0)||!String(x.allowanceType||'').trim()||!String(x.reason||'').trim())return res.status(400).json({error:'Employee, allowance type, reason and positive amount are required'});
    try{
      await client.query('BEGIN');
      const emp=await client.query("SELECT u.id,u.name FROM users u JOIN user_businesses ub ON ub.user_id=u.id WHERE ub.business_id=$1 AND u.id=$2 AND ub.active=true",[bid,employeeId]);if(!emp.rowCount)throw new Error('Employee not found');
      const shift=await client.query("SELECT cs.id,cs.branch_id,cs.terminal_id FROM cash_sessions cs WHERE cs.business_id=$1 AND cs.opened_by_user_id=$2 AND cs.status='open' ORDER BY cs.id DESC LIMIT 1",[bid,req.user.id]);
      if(method==='cash'&&!shift.rowCount)throw new Error('Open your cashier shift before paying a cash allowance');
      let branchId=Number(x.branchId||shift.rows[0]?.branch_id||0)||null;
      if(method==='cash'&&x.branchId&&Number(x.branchId)!==Number(shift.rows[0].branch_id))throw new Error('Cash allowance branch must match the open cashier shift');
      if(method==='cash')branchId=Number(shift.rows[0].branch_id);
      if(branchId){const b=await client.query('SELECT id FROM branches WHERE id=$1 AND business_id=$2 AND active=true',[branchId,bid]);if(!b.rowCount)throw new Error('Branch is not available')}
      const terminalId=method==='cash'?Number(shift.rows[0]?.terminal_id||0)||null:Number(x.terminalId||shift.rows[0]?.terminal_id||0)||null,ref='ALL-'+Date.now().toString(36).toUpperCase();
      let paymentAccountId=Number(x.paymentAccountId||0)||null;
      if(paymentAccountId)await validatePaymentSourceAccount(client,bid,method,paymentAccountId);
      else paymentAccountId=Number((await mappedAccount(client,bid,paymentAccountKey(method),paymentAccountKey(method)==='cash'?'1111':'1112')).id);
      let approvedByUserId=null,approvedByName=null;
      if(method==='cash'){
        const settings=await client.query('SELECT payout_approval_threshold FROM cash_control_settings WHERE business_id=$1',[bid]),threshold=Number(settings.rows[0]?.payout_approval_threshold||0);
        if(threshold>0&&amount>threshold){
          if(!(await hasPermission(req,bid,'shift.payout.approve'))&&!(await hasPermission(req,bid,'shift.close')))throw new Error('Manager approval is required for a cash allowance above '+threshold);
          approvedByUserId=req.user.id;approvedByName=req.user.name;
        }
      }
      const q=await client.query("INSERT INTO employee_allowances(business_id,employee_id,branch_id,terminal_id,cash_session_id,allowance_type,amount,allowance_date,reason,department,payment_method,payment_account_id,reference_no,approved_by_user_id,approved_by_name,paid_by_user_id,paid_by_name,notes,status,created_by_user_id,created_by_name) VALUES($1,$2,$3,$4,$5,$6,$7,coalesce($8,current_date),$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'posted',$16,$17) RETURNING *",[bid,employeeId,branchId,terminalId,shift.rows[0]?.id||null,String(x.allowanceType).trim(),amount,x.allowanceDate||null,String(x.reason).trim(),x.department||null,method,paymentAccountId,ref,approvedByUserId,approvedByName,req.user.id,req.user.name,x.notes||null]);
      if(method==='cash'&&shift.rows[0]?.id)await client.query("INSERT INTO cash_movements(business_id,session_id,movement_type,movement_category,amount,reason,reference,expense_category,recipient,created_by_user_id,created_by,approved_by_user_id,approved_by) VALUES($1,$2,'cash_out','expense',$3,$4,$5,'Employee Allowance',$6,$7,$8,$9,$10)",[bid,shift.rows[0].id,amount,String(x.allowanceType).trim()+' · '+String(x.reason).trim(),ref,emp.rows[0].name,req.user.id,req.user.name,approvedByUserId,approvedByName]);
      const expenseAccount=await allowanceDebitAccount(client,bid,x.allowanceType);
      await postJournal(client,{bid,branchId,cashSessionId:shift.rows[0]?.id||null,entryDate:x.allowanceDate||null,postingKey:'employee_allowance:'+q.rows[0].id,sourceModule:'workforce',sourceReference:ref,referenceType:'employee_allowance',referenceId:q.rows[0].id,description:String(x.allowanceType)+' allowance · '+emp.rows[0].name,notes:String(x.reason),userId:req.user.id,lines:[{accountId:expenseAccount.id,debit:amount,memo:String(x.allowanceType)+' · '+emp.rows[0].name},{accountId:paymentAccountId,credit:amount,memo:'Paid from '+method}]});
      await client.query('COMMIT');await audit(req.user,bid,'post','employee_allowance',q.rows[0].id,{employeeId,amount,referenceNo:ref,paymentMethod:method});res.json(q.rows[0]);
    }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}
  });

  app.get('/api/reports/activity',auth,tenant,permit('reports.activity'),async(req,res)=>{const bid=await getBiz(req),limit=Math.min(500,Math.max(1,Number(req.query.limit||150))),entity=String(req.query.entity||'').trim(),p=[bid];let extra='';if(entity){p.push(entity);extra=' AND entity=$2'}p.push(limit);const q=await pool.query("SELECT id,user_email,action,entity,entity_id,details,created_at FROM audit_logs WHERE business_id=$1"+extra+" ORDER BY id DESC LIMIT $"+p.length,p);res.json(q.rows)});
}
