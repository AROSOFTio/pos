import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(express.json({limit:'1mb'}));
app.use(express.static('public'));

async function init(){
  const sql=fs.readFileSync('./schema.sql','utf8');
  await pool.query(sql);
  const email=process.env.SAAS_ADMIN_EMAIL || 'admin@owltechsolutionsltd.com';
  const password=process.env.SAAS_ADMIN_PASSWORD || 'ChangeMeNow123!';
  const exists=await pool.query('SELECT id FROM users WHERE email=$1',[email]);
  if(!exists.rowCount){
    const hash=await bcrypt.hash(password,12);
    await pool.query('INSERT INTO users(email,password_hash,name,role) VALUES($1,$2,$3,$4)',[email,hash,'SaaS Administrator','saas_admin']);
  }
}

function auth(req,res,next){
  const h=req.headers.authorization||'';
  const token=h.startsWith('Bearer ')?h.slice(7):null;
  if(!token) return res.status(401).json({error:'Unauthorized'});
  try{req.user=jwt.verify(token,secret);next();}catch{return res.status(401).json({error:'Invalid session'});}
}

app.get('/api/health',async(req,res)=>{
  try{await pool.query('SELECT 1');res.json({ok:true,database:'postgresql'});}catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.post('/api/login',async(req,res)=>{
  const {email,password}=req.body||{};
  const q=await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)',[email||'']);
  if(!q.rowCount || !(await bcrypt.compare(password||'',q.rows[0].password_hash))) return res.status(401).json({error:'Invalid email or password'});
  const u=q.rows[0];
  const token=jwt.sign({id:u.id,email:u.email,name:u.name,role:u.role},secret,{expiresIn:'7d'});
  res.json({token,user:{id:u.id,email:u.email,name:u.name,role:u.role}});
});

app.get('/api/dashboard',auth,async(req,res)=>{
  const [biz,prod,sales,rev,low]=await Promise.all([
    pool.query('SELECT count(*)::int count FROM businesses'),
    pool.query('SELECT count(*)::int count FROM products'),
    pool.query("SELECT count(*)::int count FROM sales WHERE created_at::date=current_date"),
    pool.query("SELECT coalesce(sum(total),0)::numeric revenue FROM sales WHERE created_at::date=current_date"),
    pool.query('SELECT count(*)::int count FROM products WHERE stock<=reorder_level')
  ]);
  res.json({businesses:biz.rows[0].count,products:prod.rows[0].count,salesToday:sales.rows[0].count,revenueToday:rev.rows[0].revenue,lowStock:low.rows[0].count});
});

app.get('/api/products',auth,async(req,res)=>{
  const q=await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT 100');
  res.json(q.rows);
});

app.post('/api/sales',auth,async(req,res)=>{
  const {productId,qty=1,paymentMethod='cash'}=req.body||{};
  const p=await pool.query('SELECT * FROM products WHERE id=$1',[productId]);
  if(!p.rowCount) return res.status(404).json({error:'Product not found'});
  const product=p.rows[0]; const total=Number(product.price)*Number(qty);
  const receipt='R'+Date.now();
  await pool.query('BEGIN');
  try{
    await pool.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[qty,productId]);
    const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
    const s=await pool.query('INSERT INTO sales(business_id,receipt_no,total,payment_method,cashier) VALUES($1,$2,$3,$4,$5) RETURNING *',[b.rows[0].id,receipt,total,paymentMethod,req.user.name]);
    await pool.query('COMMIT');
    res.json({sale:s.rows[0],product,qty,total});
  }catch(e){await pool.query('ROLLBACK');throw e;}
});

app.post('/api/cash/open',auth,async(req,res)=>{
  const {openingCash=0}=req.body||{}; const b=await pool.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
  const q=await pool.query("INSERT INTO cash_sessions(business_id,opened_by,opening_cash,status) VALUES($1,$2,$3,'open') RETURNING *",[b.rows[0].id,req.user.name,openingCash]);
  res.json(q.rows[0]);
});
app.post('/api/cash/close',auth,async(req,res)=>{
  const {closingCash=0}=req.body||{};
  const q=await pool.query("SELECT * FROM cash_sessions WHERE status='open' ORDER BY id DESC LIMIT 1");
  if(!q.rowCount) return res.status(404).json({error:'No open cash session'});
  const s=q.rows[0];
  const sales=await pool.query("SELECT coalesce(sum(total),0)::numeric x FROM sales WHERE created_at >= $1 AND payment_method='cash'",[s.opened_at]);
  const expected=Number(s.opening_cash)+Number(sales.rows[0].x);
  const u=await pool.query("UPDATE cash_sessions SET closing_cash=$1,expected_cash=$2,status='closed',closed_at=now() WHERE id=$3 RETURNING *",[closingCash,expected,s.id]);
  res.json({...u.rows[0],variance:Number(closingCash)-expected});
});

app.get('*',(req,res)=>res.sendFile(process.cwd()+'/public/index.html'));

init().then(()=>app.listen(port,'0.0.0.0',()=>console.log('POS running on '+port))).catch(e=>{console.error(e);process.exit(1)});
