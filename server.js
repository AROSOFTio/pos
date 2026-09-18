import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const app=express();
const port=Number(process.env.PORT||3000);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const secret=process.env.JWT_SECRET||'dev-secret-change-me';

app.use(express.json({limit:'2mb'}));
app.use(express.static('public'));

async function init(){
  await pool.query(fs.readFileSync('./schema.sql','utf8'));
  const email=process.env.SAAS_ADMIN_EMAIL||'admin@owltechsolutionsltd.com';
  const password=process.env.SAAS_ADMIN_PASSWORD||'ChangeMeNow123!';
  const q=await pool.query('SELECT id FROM users WHERE lower(email)=lower($1)',[email]);
  if(!q.rowCount){
    const hash=await bcrypt.hash(password,12);
    await pool.query('INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)',[email,hash,'SaaS Administrator','saas_admin']);
  }
}
function auth(req,res,next){
  const h=req.headers.authorization||'';
  const t=h.startsWith('Bearer ')?h.slice(7):null;
  if(!t)return res.status(401).json({error:'Unauthorized'});
  try{req.user=jwt.verify(t,secret);next()}catch{return res.status(401).json({error:'Invalid session'})}
}
async function audit(user,action,entity,id,details={}){
  try{await pool.query('INSERT INTO audit_logs(user_email,action,entity,entity_id,details) VALUES($1,$2,$3,$4,$5)',[user?.email||null,action,entity,id?String(id):null,details])}catch{}
}
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,database:'postgresql'})}catch(e){res.status(500).json({ok:false,error:e.message})}});
app.post('/api/login',async(req,res)=>{
  const {email,password}=req.body||{}; const q=await pool.query('SELECT * FROM users WHERE lower(email)=lower($1) AND active=true',[email||'']);
  if(!q.rowCount||!(await bcrypt.compare(password||'',q.rows[0].password_hash)))return res.status(401).json({error:'Invalid email or password'});
  const u=q.rows[0],token=jwt.sign({id:u.id,email:u.email,name:u.name,role:u.role},secret,{expiresIn:'7d'});
  await audit(u,'login','user',u.id);
  res.json({token,user:{id:u.id,email:u.email,name:u.name,role:u.role}});
});
app.get('/api/me',auth,(req,res)=>res.json(req.user));

app.get('/api/dashboard',auth,async(req,res)=>{
  const qs=await Promise.all([
    pool.query('SELECT count(*)::int v FROM businesses'),
    pool.query('SELECT count(*)::int v FROM products WHERE active=true'),
    pool.query("SELECT count(*)::int v FROM sales WHERE created_at::date=current_date"),
    pool.query("SELECT coalesce(sum(total),0)::numeric v FROM sales WHERE created_at::date=current_date"),
    pool.query('SELECT count(*)::int v FROM products WHERE stock<=reorder_level'),
    pool.query("SELECT coalesce(sum(total),0)::numeric v FROM sales WHERE created_at>=date_trunc('month',now())"),
    pool.query("SELECT coalesce(sum(si.line_total-(si.unit_cost*si.qty)),0)::numeric v FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at::date=current_date"),
    pool.query("SELECT coalesce(sum(amount),0)::numeric v FROM expenses WHERE expense_date=current_date"),
    pool.query("SELECT payment_method,coalesce(sum(total),0)::numeric total FROM sales WHERE created_at::date=current_date GROUP BY payment_method ORDER BY total DESC"),
    pool.query("SELECT si.product_name,sum(si.qty)::numeric qty,sum(si.line_total)::numeric total FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at>=now()-interval '30 days' GROUP BY si.product_name ORDER BY qty DESC LIMIT 5"),
    pool.query("SELECT receipt_no,total,payment_method,cashier,created_at FROM sales ORDER BY id DESC LIMIT 8")
  ]);
  res.json({
    businesses:qs[0].rows[0].v,products:qs[1].rows[0].v,salesToday:qs[2].rows[0].v,revenueToday:qs[3].rows[0].v,
    lowStock:qs[4].rows[0].v,revenueMonth:qs[5].rows[0].v,grossProfitToday:qs[6].rows[0].v,expensesToday:qs[7].rows[0].v,
    paymentBreakdown:qs[8].rows,bestSellers:qs[9].rows,recentSales:qs[10].rows
  });
});

app.get('/api/products',auth,async(req,res)=>{const q=await pool.query('SELECT * FROM products ORDER BY id DESC');res.json(q.rows)});
app.post('/api/products',auth,async(req,res)=>{
  const {name,sku,barcode,category='General',cost=0,price=0,stock=0,reorderLevel=0}=req.body||{}; if(!name)return res.status(400).json({error:'Name required'});
  const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const q=await pool.query('INSERT INTO products(business_id,name,sku,barcode,category,cost,price,stock,reorder_level) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[b.rows[0].id,name,sku||null,barcode||null,category,cost,price,stock,reorderLevel]);
  await audit(req.user,'create','product',q.rows[0].id,{name}); res.json(q.rows[0]);
});
app.put('/api/products/:id',auth,async(req,res)=>{
  const {name,sku,barcode,category,cost,price,stock,reorderLevel,active}=req.body||{};
  const q=await pool.query('UPDATE products SET name=coalesce($1,name),sku=coalesce($2,sku),barcode=coalesce($3,barcode),category=coalesce($4,category),cost=coalesce($5,cost),price=coalesce($6,price),stock=coalesce($7,stock),reorder_level=coalesce($8,reorder_level),active=coalesce($9,active) WHERE id=$10 RETURNING *',[name,sku,barcode,category,cost,price,stock,reorderLevel,active,req.params.id]);
  await audit(req.user,'update','product',req.params.id,req.body); res.json(q.rows[0]);
});

app.get('/api/customers',auth,async(req,res)=>{res.json((await pool.query('SELECT * FROM customers ORDER BY id DESC')).rows)});
app.post('/api/customers',auth,async(req,res)=>{
  const {name,phone,email}=req.body||{}; const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const q=await pool.query('INSERT INTO customers(business_id,name,phone,email) VALUES($1,$2,$3,$4) RETURNING *',[b.rows[0].id,name,phone||null,email||null]); await audit(req.user,'create','customer',q.rows[0].id,{name});res.json(q.rows[0])
});
app.get('/api/suppliers',auth,async(req,res)=>{res.json((await pool.query('SELECT * FROM suppliers ORDER BY id DESC')).rows)});
app.post('/api/suppliers',auth,async(req,res)=>{
  const {name,phone,email}=req.body||{}; const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const q=await pool.query('INSERT INTO suppliers(business_id,name,phone,email) VALUES($1,$2,$3,$4) RETURNING *',[b.rows[0].id,name,phone||null,email||null]); await audit(req.user,'create','supplier',q.rows[0].id,{name});res.json(q.rows[0])
});
app.get('/api/expenses',auth,async(req,res)=>{res.json((await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC,id DESC LIMIT 200')).rows)});
app.post('/api/expenses',auth,async(req,res)=>{
  const {category='General',description,amount,expenseDate}=req.body||{}; const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const q=await pool.query('INSERT INTO expenses(business_id,category,description,amount,expense_date) VALUES($1,$2,$3,$4,coalesce($5,current_date)) RETURNING *',[b.rows[0].id,category,description,amount,expenseDate||null]); await audit(req.user,'create','expense',q.rows[0].id,{amount});res.json(q.rows[0])
});
app.get('/api/sales',auth,async(req,res)=>{
  const q=await pool.query('SELECT s.*,c.name customer_name FROM sales s LEFT JOIN customers c ON c.id=s.customer_id ORDER BY s.id DESC LIMIT 200');res.json(q.rows)
});
app.post('/api/sales',auth,async(req,res)=>{
  const {items=[],paymentMethod='cash',customerId=null,discount=0,tax=0}=req.body||{};
  if(!Array.isArray(items)||!items.length)return res.status(400).json({error:'Cart is empty'});
  const ids=items.map(x=>Number(x.productId)); const p=await pool.query('SELECT * FROM products WHERE id=ANY($1::bigint[])',[ids]);
  const map=new Map(p.rows.map(x=>[Number(x.id),x])); let subtotal=0;
  for(const i of items){const pr=map.get(Number(i.productId));if(!pr)return res.status(404).json({error:'Product not found'});if(Number(i.qty)<=0)return res.status(400).json({error:'Invalid quantity'});if(Number(pr.stock)<Number(i.qty))return res.status(400).json({error:'Insufficient stock for '+pr.name});subtotal+=Number(pr.price)*Number(i.qty)}
  const total=Math.max(0,subtotal-Number(discount||0)+Number(tax||0)); const receipt='R'+Date.now(); const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1'); const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const s=await client.query('INSERT INTO sales(business_id,customer_id,receipt_no,subtotal,discount,tax,total,payment_method,cashier) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[b.rows[0].id,customerId,receipt,subtotal,discount,tax,total,paymentMethod,req.user.name]);
    for(const i of items){const pr=map.get(Number(i.productId));await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[i.qty,pr.id]);await client.query('INSERT INTO sale_items(sale_id,product_id,product_name,qty,unit_price,unit_cost,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)',[s.rows[0].id,pr.id,pr.name,i.qty,pr.price,pr.cost,Number(pr.price)*Number(i.qty)])}
    await client.query('COMMIT'); await audit(req.user,'create','sale',s.rows[0].id,{receipt,total}); res.json({sale:s.rows[0],items});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
});

app.get('/api/branches',auth,async(req,res)=>res.json((await pool.query('SELECT * FROM branches ORDER BY id')).rows));
app.post('/api/branches',auth,async(req,res)=>{const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');const q=await pool.query('INSERT INTO branches(business_id,name,location) VALUES($1,$2,$3) RETURNING *',[b.rows[0].id,req.body.name,req.body.location||null]);res.json(q.rows[0])});
app.get('/api/staff',auth,async(req,res)=>res.json((await pool.query('SELECT id,email,name,role,active,created_at FROM users ORDER BY id')).rows));
app.get('/api/audit',auth,async(req,res)=>res.json((await pool.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200')).rows));
app.get('/api/businesses',auth,async(req,res)=>res.json((await pool.query('SELECT * FROM businesses ORDER BY id DESC')).rows));

app.post('/api/cash/open',auth,async(req,res)=>{
  const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const open=await pool.query("SELECT id FROM cash_sessions WHERE status='open' ORDER BY id DESC LIMIT 1"); if(open.rowCount)return res.status(400).json({error:'Cash session already open'});
  const q=await pool.query("INSERT INTO cash_sessions(business_id,opened_by,opening_cash,status) VALUES($1,$2,$3,'open') RETURNING *",[b.rows[0].id,req.user.name,Number(req.body.openingCash||0)]);res.json(q.rows[0])
});
app.get('/api/cash/current',auth,async(req,res)=>{const q=await pool.query("SELECT * FROM cash_sessions WHERE status='open' ORDER BY id DESC LIMIT 1");res.json(q.rows[0]||null)});
app.post('/api/cash/close',auth,async(req,res)=>{
  const q=await pool.query("SELECT * FROM cash_sessions WHERE status='open' ORDER BY id DESC LIMIT 1"); if(!q.rowCount)return res.status(404).json({error:'No open cash session'});
  const s=q.rows[0];const sales=await pool.query("SELECT coalesce(sum(total),0)::numeric x FROM sales WHERE created_at >= $1 AND payment_method='cash'",[s.opened_at]);const expected=Number(s.opening_cash)+Number(sales.rows[0].x);
  const u=await pool.query("UPDATE cash_sessions SET closing_cash=$1,expected_cash=$2,status='closed',closed_at=now() WHERE id=$3 RETURNING *",[Number(req.body.closingCash||0),expected,s.id]);res.json({...u.rows[0],variance:Number(req.body.closingCash||0)-expected})
});

app.get('/api/reports/summary',auth,async(req,res)=>{
  const q=await pool.query("SELECT current_date date,coalesce(sum(total),0)::numeric revenue,count(*)::int orders FROM sales WHERE created_at::date=current_date");
  const exp=await pool.query("SELECT coalesce(sum(amount),0)::numeric expenses FROM expenses WHERE expense_date=current_date");
  const gp=await pool.query("SELECT coalesce(sum(si.line_total-(si.unit_cost*si.qty)),0)::numeric gross_profit FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.created_at::date=current_date");
  res.json({...q.rows[0],...exp.rows[0],...gp.rows[0]})
});

app.get('*',(req,res)=>res.sendFile(process.cwd()+'/public/index.html'));
init().then(()=>app.listen(port,'0.0.0.0',()=>console.log('POS running on '+port))).catch(e=>{console.error(e);process.exit(1)});
