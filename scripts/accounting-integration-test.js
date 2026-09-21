import pg from 'pg';
import {
  ensureSaleAccounting, postGrnAccounting, postProductionAccounting, postExpenseAccounting,
  postSupplierPaymentAccounting, postRefundAccounting, postStockAdjustmentAccounting,
  postPurchaseReturnAccounting, postSupplierInvoiceAccounting
} from '../accounting.js';

const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const c=await pool.connect();
const one=async(sql,args=[])=>{const q=await c.query(sql,args);return q.rows[0]};
try{
 await c.query('BEGIN');
 const b=await one("INSERT INTO businesses(name,country,currency,status,business_type) VALUES('Accounting Integration','Uganda','UGX','active','restaurant') RETURNING id");
 const bid=Number(b.id); await c.query('SELECT seed_business_accounting($1)',[bid]);
 const branch=await one("INSERT INTO branches(business_id,name,location) VALUES($1,'Main','Kampala') RETURNING id",[bid]);
 const user=await one("INSERT INTO users(email,password_hash,name,role) VALUES($1,'x','Integration Owner','tenant_owner') RETURNING id",['acct-it-'+Date.now()+'@example.test']);
 const supplier=await one("INSERT INTO suppliers(business_id,name) VALUES($1,'Test Supplier') RETURNING id",[bid]);
 const loc=await one("INSERT INTO inventory_locations(business_id,branch_id,name,location_type,is_default) VALUES($1,$2,'Kitchen','kitchen',true) RETURNING id",[bid,branch.id]);
 const raw=await one("INSERT INTO products(business_id,name,sku,cost,price,stock,item_type,sellable) VALUES($1,'Raw Ingredient','RAW-IT',5,5,0,'ingredient',false) RETURNING id",[bid]);
 const finished=await one("INSERT INTO products(business_id,name,sku,cost,price,stock,item_type,sellable) VALUES($1,'Finished Meal','FIN-IT',40,50,0,'product',true) RETURNING id",[bid]);
 const session=await one("INSERT INTO cash_sessions(business_id,branch_id,opened_by,opened_by_user_id,opening_cash,status,shift_no) VALUES($1,$2,'Integration Owner',$3,1000,'open','IT-SHIFT') RETURNING id",[bid,branch.id,user.id]);

 const grn=await one("INSERT INTO goods_receipts(business_id,branch_id,supplier_id,grn_no,received_by,cash_session_id) VALUES($1,$2,$3,'GRN-IT','Integration Owner',$4) RETURNING id",[bid,branch.id,supplier.id,session.id]);
 await c.query("INSERT INTO goods_receipt_items(goods_receipt_id,product_id,qty_received,unit_cost,line_total) VALUES($1,$2,100,5,500)",[grn.id,raw.id]);
 await postGrnAccounting(c,{bid,grnId:Number(grn.id),userId:Number(user.id)});

 const recipe=await one("INSERT INTO recipes(business_id,product_id,name,yield_qty,consumption_location_id) VALUES($1,$2,'Meal Recipe',10,$3) RETURNING id",[bid,finished.id,loc.id]);
 await c.query("INSERT INTO recipe_lines(recipe_id,ingredient_product_id,quantity,waste_percent) VALUES($1,$2,20,0)",[recipe.id,raw.id]);
 const batch=await one("INSERT INTO recipe_batches(business_id,recipe_id,location_id,batch_no,planned_yield,actual_yield,total_cost,status,prepared_by) VALUES($1,$2,$3,'BAT-IT',10,10,200,'completed','Integration Owner') RETURNING id",[bid,recipe.id,loc.id]);
 await postProductionAccounting(c,{bid,batchId:Number(batch.id),userId:Number(user.id)});

 const sale=await one("INSERT INTO sales(business_id,branch_id,receipt_no,subtotal,tax,total,payment_method,cashier,payment_status,amount_paid,balance_due,tendered_amount,order_type,tax_rate) VALUES($1,$2,'RCT-IT',100,18,118,'cash','Integration Owner','paid',118,0,118,'dine_in',18) RETURNING id",[bid,branch.id]);
 const saleItem=await one("INSERT INTO sale_items(sale_id,product_id,product_name,qty,unit_price,unit_cost,line_total) VALUES($1,$2,'Finished Meal',2,50,40,100) RETURNING id",[sale.id,finished.id]);
 const pay=await one("INSERT INTO payments(business_id,branch_id,payment_no,payment_method,amount,tendered_amount,status,received_by,received_by_user_id,cash_session_id) VALUES($1,$2,'PAY-IT','cash',118,118,'posted','Integration Owner',$3,$4) RETURNING id",[bid,branch.id,user.id,session.id]);
 await c.query("INSERT INTO payment_allocations(business_id,payment_id,source_type,source_id,amount) VALUES($1,$2,'sale',$3,118)",[bid,pay.id,sale.id]);
 await ensureSaleAccounting(c,{bid,saleId:Number(sale.id),userId:Number(user.id)});

 const refund=await one("INSERT INTO refunds(business_id,sale_id,refund_no,refund_method,total,reason,restock,status,approved_by_user_id,approved_by_name,approved_at) VALUES($1,$2,'RF-IT','cash',59,'Test refund',true,'approved',$3,'Integration Owner',now()) RETURNING id",[bid,sale.id,user.id]);
 await c.query("INSERT INTO refund_items(refund_id,sale_item_id,product_id,product_name,qty,unit_price,line_total) VALUES($1,$2,$3,'Finished Meal',1,50,50)",[refund.id,saleItem.id,finished.id]);
 await c.query("INSERT INTO refund_tenders(refund_id,payment_method,amount,cash_session_id) VALUES($1,'cash',59,$2)",[refund.id,session.id]);
 await postRefundAccounting(c,{bid,refundId:Number(refund.id),userId:Number(user.id)});

 const exp=await one("INSERT INTO expenses(business_id,branch_id,cash_session_id,category,description,amount,expense_date,reference_no,source_type,accounting_treatment,status,payment_method,created_by_user_id,created_by_name) VALUES($1,$2,$3,'Utilities','Test power bill',25,current_date,'EXP-IT','manual','operating_expense','posted','cash',$4,'Integration Owner') RETURNING id",[bid,branch.id,session.id,user.id]);
 await postExpenseAccounting(c,{bid,expenseId:Number(exp.id),userId:Number(user.id)});

 const sp=await one("INSERT INTO supplier_payments(business_id,branch_id,cash_session_id,supplier_id,amount,payment_method,reference,paid_by,created_by_user_id) VALUES($1,$2,$3,$4,100,'cash','SP-IT','Integration Owner',$5) RETURNING id",[bid,branch.id,session.id,supplier.id,user.id]);
 await postSupplierPaymentAccounting(c,{bid,supplierPaymentId:Number(sp.id),userId:Number(user.id)});

 const adj=await one("INSERT INTO stock_adjustments(business_id,location_id,reference_no,adjustment_type,reason,created_by,status,approved_by,approved_at) VALUES($1,$2,'WST-IT','wastage','Test waste','Integration Owner','posted','Integration Owner',now()) RETURNING id",[bid,loc.id]);
 await c.query("INSERT INTO stock_adjustment_items(adjustment_id,product_id,qty_change,unit_cost) VALUES($1,$2,-2,5)",[adj.id,raw.id]);
 await postStockAdjustmentAccounting(c,{bid,adjustmentId:Number(adj.id),userId:Number(user.id)});

 const pr=await one("INSERT INTO purchase_returns(business_id,branch_id,supplier_id,return_no,reason,total,status,created_by) VALUES($1,$2,$3,'PRTN-IT','Supplier return',15,'posted','Integration Owner') RETURNING id",[bid,branch.id,supplier.id]);
 await c.query("INSERT INTO purchase_return_items(purchase_return_id,product_id,location_id,qty,unit_cost,line_total) VALUES($1,$2,$3,3,5,15)",[pr.id,raw.id,loc.id]);
 await postPurchaseReturnAccounting(c,{bid,purchaseReturnId:Number(pr.id),userId:Number(user.id)});

 const si=await one("INSERT INTO supplier_invoices(business_id,branch_id,supplier_id,invoice_no,subtotal,total,balance_due,status,match_status,created_by) VALUES($1,$2,$3,'INV-IT',60,60,60,'open','unmatched','Integration Owner') RETURNING id",[bid,branch.id,supplier.id]);
 await postSupplierInvoiceAccounting(c,{bid,supplierInvoiceId:Number(si.id),userId:Number(user.id)});

 const perEntry=await c.query("SELECT je.entry_no,je.posting_key,round(sum(jl.debit),2) dr,round(sum(jl.credit),2) cr FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.business_id=$1 GROUP BY je.id HAVING abs(sum(jl.debit)-sum(jl.credit))>0.009",[bid]);
 if(perEntry.rowCount)throw new Error('Unbalanced journals: '+JSON.stringify(perEntry.rows));
 const totals=await one("SELECT round(coalesce(sum(jl.debit),0),2) dr,round(coalesce(sum(jl.credit),0),2) cr,count(distinct je.id)::int entries FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.business_id=$1",[bid]);
 if(Math.abs(Number(totals.dr)-Number(totals.cr))>.009)throw new Error('Trial balance mismatch');
 const keys=(await c.query("SELECT posting_key FROM journal_entries WHERE business_id=$1 ORDER BY id",[bid])).rows.map(x=>x.posting_key);
 const expected=['grn:','production:','sale:','refund:','expense:','supplier_payment:','stock_adjustment:','purchase_return:','supplier_invoice:'];
 for(const prefix of expected)if(!keys.some(k=>String(k).startsWith(prefix)))throw new Error('Missing '+prefix+' journal');
 console.log(JSON.stringify({ok:true,businessId:bid,entries:totals.entries,debits:Number(totals.dr),credits:Number(totals.cr),postingKeys:keys},null,2));
 await c.query('ROLLBACK');
}catch(e){try{await c.query('ROLLBACK')}catch{};console.error(e);process.exitCode=1}finally{c.release();await pool.end()}
