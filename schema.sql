CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Uganda',
  currency TEXT NOT NULL DEFAULT 'UGX',
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_businesses (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY(user_id,business_id)
);
CREATE TABLE IF NOT EXISTS module_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  core BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS tenant_modules (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  module_code TEXT REFERENCES module_catalog(code) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trial BOOLEAN NOT NULL DEFAULT false,
  price_override NUMERIC(14,2),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY(business_id,module_code)
);
CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT, email TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  loyalty_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT, email TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT, barcode TEXT,
  category TEXT DEFAULT 'General',
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  cashier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS supplier_products (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  supplier_price NUMERIC(14,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(supplier_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_products_business_supplier ON supplier_products(business_id,supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_business_product ON supplier_products(business_id,product_id);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  reference TEXT UNIQUE NOT NULL,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cash_sessions (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  opened_by TEXT,
  opening_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(14,2),
  expected_cash NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT,
  business_id BIGINT REFERENCES businesses(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS business_id BIGINT REFERENCES businesses(id) ON DELETE SET NULL;

INSERT INTO module_catalog(code,name,description,monthly_price,core) VALUES
('pos','POS','Sales checkout, receipts and payments',0,true),
('products','Products & Inventory','Products, barcode and stock',0,true),
('customers','Customers','Customer accounts and loyalty',0,true),
('expenses','Expenses','Expense tracking',0,true),
('reports','Advanced Reports','Advanced reporting and analytics',30000,false),
('purchasing','Purchasing','Suppliers, purchase orders and receiving',25000,false),
('restaurant','Restaurant','Tables, reservations and kitchen workflows',50000,false),
('pharmacy','Pharmacy','Batch, expiry and pharmacy controls',50000,false),
('payroll','Payroll & HR','Staff, attendance and payroll',40000,false),
('production','Production','Recipes, BOM and manufacturing',45000,false),
('route_sales','Route Sales','Field sales agents and route stock',35000,false)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,monthly_price=EXCLUDED.monthly_price,core=EXCLUDED.core;

INSERT INTO businesses(name,country,currency,trial_ends_at)
SELECT 'Demo Business','Uganda','UGX',now()+interval '14 days'
WHERE NOT EXISTS (SELECT 1 FROM businesses);

INSERT INTO branches(business_id,name,location)
SELECT b.id,'Main Branch','Kampala' FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE business_id=b.id);

INSERT INTO products(business_id,name,sku,barcode,category,cost,price,stock,reorder_level)
SELECT b.id,'Demo Product','DEMO-001','1234567890123','General',3000,5000,25,5 FROM businesses b
WHERE NOT EXISTS (SELECT 1 FROM products WHERE business_id=b.id);

INSERT INTO tenant_modules(business_id,module_code,enabled,trial,expires_at)
SELECT b.id,m.code,true,(NOT m.core),CASE WHEN m.core THEN NULL ELSE b.trial_ends_at END
FROM businesses b CROSS JOIN module_catalog m
ON CONFLICT(business_id,module_code) DO NOTHING;
