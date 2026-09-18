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

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by TEXT,
  ordered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,po_no)
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  qty_ordered NUMERIC(14,3) NOT NULL,
  qty_received NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS goods_receipts (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE RESTRICT,
  grn_no TEXT NOT NULL,
  supplier_reference TEXT,
  notes TEXT,
  received_by TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,grn_no)
);
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  goods_receipt_id BIGINT REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id BIGINT REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  qty_received NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_before NUMERIC(14,3) NOT NULL DEFAULT 0,
  stock_after NUMERIC(14,3) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id BIGINT,
  reference_no TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_business_status ON purchase_orders(business_id,status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(business_id,supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_business_date ON goods_receipts(business_id,received_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(business_id,product_id,created_at);


CREATE TABLE IF NOT EXISTS inventory_locations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'store',
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,branch_id,name)
);
CREATE TABLE IF NOT EXISTS inventory_balances (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(location_id,product_id)
);
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  reference_no TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,reference_no)
);
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id BIGSERIAL PRIMARY KEY,
  adjustment_id BIGINT REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  qty_change NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stock_transfers (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  from_location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  to_location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  reference_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,reference_no)
);
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id BIGSERIAL PRIMARY KEY,
  transfer_id BIGINT REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_counts (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  reference_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ,
  UNIQUE(business_id,reference_no)
);
CREATE TABLE IF NOT EXISTS stock_count_items (
  id BIGSERIAL PRIMARY KEY,
  stock_count_id BIGINT REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  expected_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  counted_qty NUMERIC(14,3)
);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_business_product ON inventory_balances(business_id,product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_branch ON inventory_locations(business_id,branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_business_status ON stock_counts(business_id,status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_business_date ON stock_transfers(business_id,created_at);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS from_location_id BIGINT REFERENCES inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS to_location_id BIGINT REFERENCES inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reason TEXT;

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


INSERT INTO inventory_locations(business_id,branch_id,name,location_type,is_default)
SELECT b.business_id,b.id,'Main Store','main',true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_locations l WHERE l.business_id=b.business_id AND l.branch_id=b.id AND l.is_default=true
);

INSERT INTO inventory_balances(business_id,location_id,product_id,qty,avg_cost)
SELECT p.business_id,l.id,p.id,p.stock,p.cost
FROM products p
JOIN LATERAL (
  SELECT id FROM inventory_locations
  WHERE business_id=p.business_id AND is_default=true
  ORDER BY branch_id,id
  LIMIT 1
) l ON true
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_balances ib WHERE ib.business_id=p.business_id AND ib.product_id=p.id
);

INSERT INTO tenant_modules(business_id,module_code,enabled,trial,expires_at)
SELECT b.id,m.code,true,(NOT m.core),CASE WHEN m.core THEN NULL ELSE b.trial_ends_at END
FROM businesses b CROSS JOIN module_catalog m
ON CONFLICT(business_id,module_code) DO NOTHING;
