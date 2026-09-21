import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

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
export async function postReceivablePaymentAccounting(client,{bid,payment,userId=null,referenceType='sale_payment'}){
  if(!payment||!(Number(payment.amount)>0))return null;
  return postJournal(client,{bid,branchId:payment.branch_id,cashSessionId:payment.cash_session_id,entryDate:isoDateValue(payment.received_at),postingKey:'payment:'+payment.id,sourceModule:'payments',sourceReference:payment.payment_no,referenceType,referenceId:Number(payment.id),description:'Receivable payment '+payment.payment_no,userId,lines:[
    {accountKey:paymentAccountKey(payment.payment_method),debit:Number(payment.amount),memo:'Payment received'},
    {accountKey:'accounts_receivable',credit:Number(payment.amount),memo:'Accounts receivable cleared'}
  ]});
}
export async function postGrnAccounting(client,{bid,grnId,userId=null}){
  const q=await client.query("SELECT g.*,coalesce(sum(i.qty_received*i.unit_cost),0)::numeric total FROM goods_receipts g JOIN goods_receipt_items i ON i.goods_receipt_id=g.id WHERE g.id=$1 AND g.business_id=$2 GROUP BY g.id",[grnId,bid]);
  if(!q.rowCount)throw new Error('Goods receipt not found for accounting');
  const x=q.rows[0],amount=positive(x.total); if(amount<=0)return null;
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:x.cash_session_id,entryDate:isoDateValue(x.received_at),postingKey:'grn:'+grnId,sourceModule:'purchasing',sourceReference:x.grn_no,referenceType:'goods_receipt',referenceId:grnId,description:'Inventory received '+x.grn_no,userId,lines:[
    {accountKey:'raw_material_inventory',debit:amount,memo:'Inventory received'},
    {accountKey:'accounts_payable',credit:amount,memo:'Supplier payable'}
  ]});
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
  return postJournal(client,{bid,branchId:x.branch_id,cashSessionId:x.cash_session_id,entryDate:isoDateValue(x.expense_date),postingKey:'expense:'+expenseId,sourceModule:'expenses',sourceReference:x.reference_no,referenceType:'expense',referenceId:expenseId,description:x.description,userId,lines:[debit,{accountKey:paymentAccountKey(x.payment_method||'cash'),credit:amount,memo:'Expense payment'}]});
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
  const h=hq.rows[0],rows=(await client.query("SELECT sai.*,p.name product_name,p.cost product_cost,EXISTS(SELECT 1 FROM recipes r WHERE r.business_id=$2 AND r.product_id=sai.product_id AND r.active=true) finished FROM stock_adjustment_items sai JOIN products p ON p.id=sai.product_id WHERE sai.adjustment_id=$1",[adjustmentId,bid])).rows;
  const lines=[];let loss=0;
  for(const x of rows){
    const amount=positive(Math.abs(Number(x.qty_change||0))*Number(x.unit_cost||x.product_cost||0));if(amount<=0)continue;
    const invKey=x.finished?'finished_goods_inventory':'raw_material_inventory';
    if(Number(x.qty_change)<0){
      lines.push({accountKey:h.adjustment_type==='wastage'||h.adjustment_type==='spoilage'?'waste_expense':'production_variance',debit:amount,memo:niceMemo(h.adjustment_type)+' · '+x.product_name});
      lines.push({accountKey:invKey,credit:amount,memo:'Inventory reduction · '+x.product_name});
      loss=money(loss+amount);
    }else{
      lines.push({accountKey:invKey,debit:amount,memo:'Inventory increase · '+x.product_name});
      lines.push({accountKey:'production_variance',credit:amount,memo:'Stock count gain · '+x.product_name});
    }
  }
  if(!lines.length)return null;
  return postJournal(client,{bid,branchId:h.branch_id,entryDate:isoDateValue(h.approved_at||h.created_at),postingKey:'stock_adjustment:'+adjustmentId,sourceModule:'inventory',sourceReference:h.reference_no,referenceType:'stock_adjustment',referenceId:adjustmentId,description:niceMemo(h.adjustment_type)+' '+h.reference_no,notes:h.reason,userId,lines});
}
function niceMemo(v){return String(v||'adjustment').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}

export async function postPurchaseReturnAccounting(client,{bid,purchaseReturnId,userId=null}){
  const q=await client.query("SELECT pr.*,coalesce(sum(pri.line_total),0)::numeric amount FROM purchase_returns pr JOIN purchase_return_items pri ON pri.purchase_return_id=pr.id WHERE pr.id=$1 AND pr.business_id=$2 GROUP BY pr.id",[purchaseReturnId,bid]);
  if(!q.rowCount)throw new Error('Purchase return not found for accounting');
  const x=q.rows[0],amount=positive(x.amount);if(amount<=0)return null;
  return postJournal(client,{bid,branchId:x.branch_id,entryDate:isoDateValue(x.created_at),postingKey:'purchase_return:'+purchaseReturnId,sourceModule:'purchasing',sourceReference:x.return_no,referenceType:'purchase_return',referenceId:purchaseReturnId,description:'Purchase return '+x.return_no,userId,lines:[
    {accountKey:'accounts_payable',debit:amount,memo:'Supplier payable reduced'},
    {accountKey:'raw_material_inventory',credit:amount,memo:'Inventory returned to supplier'}
  ]});
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

export function registerAccountingRoutes(app,{pool,auth,tenant,getBiz,permit,rolesAllowed,audit}){
  const documentDir='uploads/documents';fs.mkdirSync(documentDir,{recursive:true});
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
      pool.query("SELECT count(DISTINCT p.id)::int products,coalesce(sum(ib.qty*ib.avg_cost),0)::numeric valuation,count(DISTINCT p.id) FILTER (WHERE coalesce(t.qty,0)<=p.reorder_level)::int low_stock FROM products p LEFT JOIN inventory_balances ib ON ib.product_id=p.id AND ib.business_id=p.business_id LEFT JOIN LATERAL (SELECT sum(qty) qty FROM inventory_balances z WHERE z.business_id=p.business_id AND z.product_id=p.id) t ON true WHERE p.business_id=$1 AND p.active=true",[bid]),
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
      pool.query("SELECT extract(hour from created_at)::int hour,count(*)::int transactions,coalesce(sum(total),0)::numeric sales FROM sales WHERE business_id=$1 AND voided=false AND ($2::date IS NULL OR created_at::date >= $2::date) AND ($3::date IS NULL OR created_at::date <= $3::date) AND ($4::bigint IS NULL OR branch_id=$4) GROUP BY extract(hour from created_at)::int ORDER BY hour",p),
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
      hourlySales:hourlySales.rows.map(x=>({...x,sales:Number(x.sales)})),
      categorySales:categorySales.rows.map(x=>({...x,qty:Number(x.qty),revenue:Number(x.revenue)})),
      cashiers:cashiers.rows.map(x=>({...x,sales:Number(x.sales),avg_check:Number(x.avg_check)}))
    });
  });
  app.get('/api/reports/activity',auth,tenant,permit('reports.activity'),async(req,res)=>{const bid=await getBiz(req),limit=Math.min(500,Math.max(1,Number(req.query.limit||150))),entity=String(req.query.entity||'').trim(),p=[bid];let extra='';if(entity){p.push(entity);extra=' AND entity=$2'}p.push(limit);const q=await pool.query("SELECT id,user_email,action,entity,entity_id,details,created_at FROM audit_logs WHERE business_id=$1"+extra+" ORDER BY id DESC LIMIT $"+p.length,p);res.json(q.rows)});
}
