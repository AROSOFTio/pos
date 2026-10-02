import pg from 'pg';

const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try{
  await client.query('BEGIN');
  const targets=await client.query(`
    SELECT ib.business_id,l.branch_id,
      CASE WHEN p.item_type='ingredient' OR lower(coalesce(p.category,''))='ingredient' THEN '1131' ELSE '1132' END account_code,
      round(coalesce(sum(ib.qty*ib.avg_cost),0)::numeric,2) target
    FROM inventory_balances ib
    JOIN inventory_locations l ON l.id=ib.location_id
    JOIN products p ON p.id=ib.product_id
    GROUP BY ib.business_id,l.branch_id,3
    ORDER BY ib.business_id,l.branch_id,3
  `);
  const grouped=new Map();
  for(const row of targets.rows){
    const key=row.business_id+':'+row.branch_id;
    if(!grouped.has(key))grouped.set(key,{businessId:Number(row.business_id),branchId:Number(row.branch_id),targets:{}});
    grouped.get(key).targets[row.account_code]=Number(row.target||0);
  }
  let posted=0,skipped=0;
  for(const g of grouped.values()){
    const postingKey='inventory_legacy_reconciliation_v2:'+g.branchId;
    const exists=await client.query('SELECT id FROM journal_entries WHERE business_id=$1 AND posting_key=$2',[g.businessId,postingKey]);
    if(exists.rowCount){skipped++;continue}
    const accountRows=await client.query("SELECT id,account_code FROM accounts WHERE business_id=$1 AND account_code=ANY($2::text[]) AND is_active=true",[g.businessId,['1131','1132','3100']]);
    const accounts=new Map(accountRows.rows.map(x=>[x.account_code,Number(x.id)]));
    if(!accounts.has('1131')||!accounts.has('1132')||!accounts.has('3100'))throw new Error('Inventory accounting accounts missing for business '+g.businessId);
    const gl=await client.query(`
      SELECT a.account_code,round(coalesce(sum(jl.debit-jl.credit),0)::numeric,2) balance
      FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id JOIN accounts a ON a.id=jl.account_id
      WHERE a.business_id=$1 AND je.status='posted' AND coalesce(jl.branch_id,je.branch_id)=$2 AND a.account_code=ANY($3::text[])
      GROUP BY a.account_code
    `,[g.businessId,g.branchId,['1131','1132']]);
    const current=new Map(gl.rows.map(x=>[x.account_code,Number(x.balance||0)]));
    const diffs=['1131','1132'].map(code=>({code,diff:Math.round(((g.targets[code]||0)-(current.get(code)||0))*100)/100})).filter(x=>Math.abs(x.diff)>.01);
    if(!diffs.length){skipped++;continue}
    const debit=diffs.filter(x=>x.diff>0).reduce((n,x)=>n+x.diff,0);
    const credit=diffs.filter(x=>x.diff<0).reduce((n,x)=>n+Math.abs(x.diff),0);
    const net=Math.round((debit-credit)*100)/100;
    const entryNo='INVREC-'+g.businessId+'-'+g.branchId+'-'+Date.now().toString(36).toUpperCase();
    const je=await client.query("INSERT INTO journal_entries(business_id,branch_id,entry_no,entry_date,posting_key,source_module,source_reference,reference_type,description,status,posted_at) VALUES($1,$2,$3,current_date,$4,'inventory','LEGACY-STOCK-RECON','inventory_reconciliation','Legacy inventory opening reconciliation','posted',now()) RETURNING id",[g.businessId,g.branchId,entryNo,postingKey]);
    for(const x of diffs){
      await client.query('INSERT INTO journal_lines(journal_entry_id,account_id,branch_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)',[je.rows[0].id,accounts.get(x.code),g.branchId,x.diff>0?x.diff:0,x.diff<0?Math.abs(x.diff):0,'Bring inventory ledger to physical stock valuation']);
    }
    if(Math.abs(net)>.01)await client.query('INSERT INTO journal_lines(journal_entry_id,account_id,branch_id,debit,credit,memo) VALUES($1,$2,$3,$4,$5,$6)',[je.rows[0].id,accounts.get('3100'),g.branchId,net<0?Math.abs(net):0,net>0?net:0,'Legacy opening balance offset']);
    posted++;
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({posted,skipped}));
}catch(e){await client.query('ROLLBACK');console.error(e);process.exitCode=1}finally{client.release();await pool.end()}
