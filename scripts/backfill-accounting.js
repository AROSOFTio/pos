import pg from 'pg';
import {
  ensureSaleAccounting, postGrnAccounting, postProductionAccounting, postExpenseAccounting,
  postSupplierPaymentAccounting, postRefundAccounting, postStockAdjustmentAccounting,
  postPurchaseReturnAccounting, postSupplierInvoiceAccounting
} from '../accounting.js';

const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const dry=String(process.env.BACKFILL_DRY_RUN||'').toLowerCase();
const dryRun=['1','true','yes'].includes(dry);
const c=await pool.connect();
const stats={businesses:0,sales:0,refunds:0,grns:0,production:0,expenses:0,supplierPayments:0,stockAdjustments:0,purchaseReturns:0,supplierInvoices:0};
try{
  await c.query('BEGIN');
  const businesses=(await c.query('SELECT id FROM businesses ORDER BY id')).rows;
  for(const b of businesses){
    const bid=Number(b.id);stats.businesses++;
    await c.query('SELECT seed_business_accounting($1)',[bid]);

    for(const x of (await c.query('SELECT id FROM sales WHERE business_id=$1 ORDER BY id',[bid])).rows){
      await ensureSaleAccounting(c,{bid,saleId:Number(x.id),userId:null});stats.sales++;
    }
    for(const x of (await c.query("SELECT id FROM refunds WHERE business_id=$1 AND status='approved' ORDER BY id",[bid])).rows){
      await postRefundAccounting(c,{bid,refundId:Number(x.id),userId:null});stats.refunds++;
    }
    for(const x of (await c.query('SELECT id FROM goods_receipts WHERE business_id=$1 ORDER BY id',[bid])).rows){
      await postGrnAccounting(c,{bid,grnId:Number(x.id),userId:null});stats.grns++;
    }
    for(const x of (await c.query("SELECT id FROM recipe_batches WHERE business_id=$1 AND status='completed' ORDER BY id",[bid])).rows){
      await postProductionAccounting(c,{bid,batchId:Number(x.id),userId:null});stats.production++;
    }
    for(const x of (await c.query("SELECT id FROM expenses WHERE business_id=$1 AND status='posted' AND coalesce(auto_generated,false)=false AND coalesce(source_type,'manual')='manual' ORDER BY id",[bid])).rows){
      await postExpenseAccounting(c,{bid,expenseId:Number(x.id),userId:null});stats.expenses++;
    }
    for(const x of (await c.query('SELECT id FROM supplier_payments WHERE business_id=$1 ORDER BY id',[bid])).rows){
      await postSupplierPaymentAccounting(c,{bid,supplierPaymentId:Number(x.id),userId:null});stats.supplierPayments++;
    }
    for(const x of (await c.query("SELECT id FROM stock_adjustments WHERE business_id=$1 AND status='posted' ORDER BY id",[bid])).rows){
      await postStockAdjustmentAccounting(c,{bid,adjustmentId:Number(x.id),userId:null});stats.stockAdjustments++;
    }
    for(const x of (await c.query("SELECT id FROM purchase_returns WHERE business_id=$1 AND status='posted' ORDER BY id",[bid])).rows){
      await postPurchaseReturnAccounting(c,{bid,purchaseReturnId:Number(x.id),userId:null});stats.purchaseReturns++;
    }
    for(const x of (await c.query("SELECT id FROM supplier_invoices WHERE business_id=$1 AND status<>'cancelled' ORDER BY id",[bid])).rows){
      await postSupplierInvoiceAccounting(c,{bid,supplierInvoiceId:Number(x.id),userId:null});stats.supplierInvoices++;
    }
  }

  const bad=await c.query("SELECT je.business_id,je.entry_no,je.posting_key,round(sum(jl.debit),2) debit,round(sum(jl.credit),2) credit FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.status='posted' GROUP BY je.id HAVING abs(sum(jl.debit)-sum(jl.credit))>0.009");
  if(bad.rowCount)throw new Error('Unbalanced journal entries: '+JSON.stringify(bad.rows));
  const totals=(await c.query("SELECT je.business_id,count(distinct je.id)::int entries,round(sum(jl.debit),2) debit,round(sum(jl.credit),2) credit FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id=je.id WHERE je.status='posted' GROUP BY je.business_id ORDER BY je.business_id")).rows;
  for(const t of totals)if(Math.abs(Number(t.debit)-Number(t.credit))>.009)throw new Error('Business '+t.business_id+' trial balance mismatch');
  if(dryRun)await c.query('ROLLBACK');else await c.query('COMMIT');
  console.log(JSON.stringify({ok:true,dryRun,stats,totals},null,2));
}catch(e){
  try{await c.query('ROLLBACK')}catch{}
  console.error(e);
  process.exitCode=1;
}finally{c.release();await pool.end()}
