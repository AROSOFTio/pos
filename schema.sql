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
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'restaurant';


CREATE TABLE IF NOT EXISTS user_businesses (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY(user_id,business_id)
);

CREATE TABLE IF NOT EXISTS user_business_roles (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,business_id,role)
);
INSERT INTO user_business_roles(user_id,business_id,role,is_primary)
SELECT user_id,business_id,role,true FROM user_businesses WHERE active=true
ON CONFLICT(user_id,business_id,role) DO UPDATE SET is_primary=EXCLUDED.is_primary;
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
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS document_footer TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS document_accent TEXT NOT NULL DEFAULT '#101828';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS document_paper_size TEXT NOT NULL DEFAULT 'A4';

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

ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'counter';

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
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference_no TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_id BIGINT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS accounting_treatment TEXT NOT NULL DEFAULT 'operating_expense';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'posted';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_source_unique ON expenses(business_id,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

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
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS grn_id BIGINT REFERENCES goods_receipts(id) ON DELETE SET NULL;

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


CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  action_type TEXT NOT NULL,
  approver_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approver_role TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,action_type)
);
CREATE TABLE IF NOT EXISTS approval_requests (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  reference_no TEXT,
  title TEXT NOT NULL,
  amount NUMERIC(14,2),
  requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  approver_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approver_role TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  request_comment TEXT,
  decision_comment TEXT,
  decided_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  UNIQUE(business_id,action_type,entity_type,entity_id,status)
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_business_status ON approval_requests(business_id,status,requested_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(business_id,approver_user_id,status);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approval_comment TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'posted';
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS decision_comment TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE stock_adjustments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Purchasing','purchase_order','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;
INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Inventory','inventory_wastage','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;
INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Inventory','inventory_spoilage','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;
INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Restaurant','restaurant_order_cancel','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;


CREATE TABLE IF NOT EXISTS units_of_measure (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'count',
  base_factor NUMERIC(18,6) NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,symbol)
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'product';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sellable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_unit_id BIGINT REFERENCES units_of_measure(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS yield_unit_cost NUMERIC(14,4);

CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  yield_qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  consumption_location_id BIGINT REFERENCES inventory_locations(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,product_id)
);
CREATE TABLE IF NOT EXISTS recipe_lines (
  id BIGSERIAL PRIMARY KEY,
  recipe_id BIGINT REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(18,6) NOT NULL,
  unit_id BIGINT REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  waste_percent NUMERIC(8,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id,ingredient_product_id)
);
CREATE TABLE IF NOT EXISTS inventory_consumptions (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  consumption_type TEXT NOT NULL,
  reference_no TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,reference_no)
);
CREATE TABLE IF NOT EXISTS inventory_consumption_items (
  id BIGSERIAL PRIMARY KEY,
  consumption_id BIGINT REFERENCES inventory_consumptions(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  qty NUMERIC(18,6) NOT NULL,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipes_business_product ON recipes(business_id,product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_recipe ON recipe_lines(recipe_id);
CREATE INDEX IF NOT EXISTS idx_products_item_type ON products(business_id,item_type,active);

INSERT INTO units_of_measure(business_id,name,symbol,unit_type,base_factor)
SELECT b.id,'Piece','pc','count',1 FROM businesses b
ON CONFLICT(business_id,symbol) DO NOTHING;
INSERT INTO units_of_measure(business_id,name,symbol,unit_type,base_factor)
SELECT b.id,'Kilogram','kg','weight',1 FROM businesses b
ON CONFLICT(business_id,symbol) DO NOTHING;
INSERT INTO units_of_measure(business_id,name,symbol,unit_type,base_factor)
SELECT b.id,'Gram','g','weight',0.001 FROM businesses b
ON CONFLICT(business_id,symbol) DO NOTHING;
INSERT INTO units_of_measure(business_id,name,symbol,unit_type,base_factor)
SELECT b.id,'Litre','L','volume',1 FROM businesses b
ON CONFLICT(business_id,symbol) DO NOTHING;
INSERT INTO units_of_measure(business_id,name,symbol,unit_type,base_factor)
SELECT b.id,'Millilitre','ml','volume',0.001 FROM businesses b
ON CONFLICT(business_id,symbol) DO NOTHING;


CREATE TABLE IF NOT EXISTS restaurant_areas (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,branch_id,name)
);
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  area_id BIGINT REFERENCES restaurant_areas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  capacity INT NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'available',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,branch_id,name)
);
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  station_type TEXT NOT NULL DEFAULT 'kitchen',
  printer_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,branch_id,name)
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_station_id BIGINT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,parent_id,name)
);
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES menu_categories(id) ON DELETE SET NULL,
  kitchen_station_id BIGINT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sold_out BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,product_id)
);
CREATE TABLE IF NOT EXISTS menu_variants (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(menu_item_id,name)
);
CREATE TABLE IF NOT EXISTS modifier_groups (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  min_select INT NOT NULL DEFAULT 0,
  max_select INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,name)
);
CREATE TABLE IF NOT EXISTS modifiers (
  id BIGSERIAL PRIMARY KEY,
  modifier_group_id BIGINT REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE(modifier_group_id,name)
);
CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id BIGINT REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY(menu_item_id,modifier_group_id)
);
CREATE TABLE IF NOT EXISTS menu_item_prices (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL DEFAULT 'all',
  price NUMERIC(14,2) NOT NULL,
  UNIQUE(menu_item_id,branch_id,order_type)
);
CREATE TABLE IF NOT EXISTS menu_item_schedules (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  CHECK(day_of_week BETWEEN 0 AND 6)
);
CREATE TABLE IF NOT EXISTS menu_combos (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,product_id)
);
CREATE TABLE IF NOT EXISTS menu_combo_items (
  id BIGSERIAL PRIMARY KEY,
  combo_id BIGINT REFERENCES menu_combos(id) ON DELETE CASCADE,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(combo_id,menu_item_id)
);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_area ON restaurant_tables(business_id,branch_id,area_id,status);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(business_id,category_id,available,sold_out);
CREATE INDEX IF NOT EXISTS idx_menu_prices_branch_type ON menu_item_prices(branch_id,order_type);
CREATE INDEX IF NOT EXISTS idx_menu_schedules_item ON menu_item_schedules(menu_item_id,day_of_week);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_business ON modifier_groups(business_id,active);


CREATE TABLE IF NOT EXISTS restaurant_reservations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  table_id BIGINT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name TEXT,
  phone TEXT,
  guest_count INT NOT NULL DEFAULT 1,
  reserved_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'reserved',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS restaurant_orders (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  table_id BIGINT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  reservation_id BIGINT REFERENCES restaurant_reservations(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  guest_count INT NOT NULL DEFAULT 1,
  waiter_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  waiter_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  held BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE(business_id,order_no)
);
CREATE TABLE IF NOT EXISTS restaurant_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE SET NULL,
  variant_id BIGINT REFERENCES menu_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS restaurant_order_item_modifiers (
  id BIGSERIAL PRIMARY KEY,
  order_item_id BIGINT REFERENCES restaurant_order_items(id) ON DELETE CASCADE,
  modifier_id BIGINT REFERENCES modifiers(id) ON DELETE SET NULL,
  modifier_name TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS restaurant_order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  comment TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS restaurant_order_transfers (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  from_table_id BIGINT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  to_table_id BIGINT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL DEFAULT 'transfer',
  notes TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_business_status ON restaurant_orders(business_id,status,opened_at);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_table ON restaurant_orders(business_id,table_id,status);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_order ON restaurant_order_items(order_id,status);
CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_date ON restaurant_reservations(business_id,reserved_at,status);


CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  station_id BIGINT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  ticket_no TEXT NOT NULL,
  batch_no INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  printed_count INT NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(business_id,ticket_no)
);
CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES restaurant_order_items(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  UNIQUE(ticket_id,order_item_id)
);
CREATE TABLE IF NOT EXISTS kitchen_events (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  ticket_id BIGINT REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES restaurant_order_items(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_station_status ON kitchen_tickets(business_id,station_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_status ON kitchen_ticket_items(ticket_id,status);


ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS balance_due NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tendered_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
UPDATE sales SET amount_paid=total,balance_due=0,payment_status='paid'
WHERE amount_paid=0 AND total>0 AND payment_status='paid';

ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS balance_due NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS sale_id BIGINT REFERENCES sales(id) ON DELETE SET NULL;
UPDATE restaurant_orders SET balance_due=greatest(total-amount_paid,0)
WHERE balance_due=0 AND total>amount_paid AND status NOT IN ('paid','closed','cancelled');

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  payment_no TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  tendered_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  received_by TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  UNIQUE(business_id,payment_no)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  payment_id BIGINT REFERENCES payments(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id BIGINT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(source_type IN ('sale','restaurant_order'))
);

CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments(business_id,received_at,status);
CREATE INDEX IF NOT EXISTS idx_payments_method_date ON payments(business_id,payment_method,received_at);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_source ON payment_allocations(business_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_sale ON restaurant_orders(business_id,sale_id);

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
SELECT b.id,m.code,
  CASE
    WHEN m.core THEN true
    WHEN m.code='restaurant' AND b.business_type='restaurant' THEN true
    WHEN m.code='retail' AND b.business_type='retail' THEN true
    WHEN m.code='pharmacy' AND b.business_type='pharmacy' THEN true
    WHEN m.code='production' AND b.business_type='factory' THEN true
    ELSE false
  END,
  CASE WHEN m.core THEN false ELSE true END,
  CASE WHEN m.core THEN NULL ELSE b.trial_ends_at END
FROM businesses b CROSS JOIN module_catalog m
ON CONFLICT(business_id,module_code) DO NOTHING;


ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_service_charge_rate NUMERIC(8,4) NOT NULL DEFAULT 0;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_charge NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tip NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS tip NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS transaction_adjustment_requests (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id BIGINT,
  reference_no TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  base_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  requested_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  requested_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  rejected_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  decision_comment TEXT,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(source_type IN ('restaurant_order','pos_draft')),
  CHECK(adjustment_type IN ('discount','foc'))
);
CREATE INDEX IF NOT EXISTS idx_tx_adjustment_business_status ON transaction_adjustment_requests(business_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_tx_adjustment_source ON transaction_adjustment_requests(business_id,source_type,source_id);

INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Sales','transaction_discount','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;
INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Sales','transaction_foc','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;


ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8,4) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC(8,4) NOT NULL DEFAULT 0;


ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS customer_ledger (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  source_type TEXT,
  source_id BIGINT,
  reference_no TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger(business_id,customer_id,created_at,id);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided_by TEXT;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id BIGINT REFERENCES sales(id) ON DELETE RESTRICT,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  refund_no TEXT NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'cash',
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  rejected_by_name TEXT,
  rejected_at TIMESTAMPTZ,
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,refund_no)
);

CREATE TABLE IF NOT EXISTS refund_items (
  id BIGSERIAL PRIMARY KEY,
  refund_id BIGINT REFERENCES refunds(id) ON DELETE CASCADE,
  sale_item_id BIGINT REFERENCES sale_items(id) ON DELETE RESTRICT,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refunds_sale ON refunds(business_id,sale_id,status);
CREATE INDEX IF NOT EXISTS idx_refund_items_sale_item ON refund_items(sale_item_id);

CREATE TABLE IF NOT EXISTS reason_codes (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,category,code)
);

INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'refund','customer_return','Customer return' FROM businesses b ON CONFLICT DO NOTHING;
INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'refund','wrong_item','Wrong item supplied' FROM businesses b ON CONFLICT DO NOTHING;
INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'refund','quality_issue','Quality issue' FROM businesses b ON CONFLICT DO NOTHING;
INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'void','entry_error','Entry / cashier error' FROM businesses b ON CONFLICT DO NOTHING;
INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'void','duplicate','Duplicate transaction' FROM businesses b ON CONFLICT DO NOTHING;

INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Sales','sale_refund','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;
INSERT INTO approval_rules(business_id,section,action_type,approver_role)
SELECT b.id,'Sales','sale_void','owner' FROM businesses b
ON CONFLICT(business_id,action_type) DO NOTHING;


ALTER TABLE refunds ADD COLUMN IF NOT EXISTS request_kind TEXT NOT NULL DEFAULT 'refund';
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS void_sale BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS refund_tenders (
  id BIGSERIAL PRIMARY KEY,
  refund_id BIGINT REFERENCES refunds(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_tenders_refund ON refund_tenders(refund_id);

INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'void','wrong_price','Wrong price / pricing error' FROM businesses b ON CONFLICT DO NOTHING;
INSERT INTO reason_codes(business_id,category,code,label)
SELECT b.id,'void','wrong_product','Wrong product / item entry' FROM businesses b ON CONFLICT DO NOTHING;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'restaurant';
ALTER TABLE module_catalog ADD COLUMN IF NOT EXISTS sector TEXT NOT NULL DEFAULT 'shared';
ALTER TABLE module_catalog ADD COLUMN IF NOT EXISTS maturity TEXT NOT NULL DEFAULT 'available';
ALTER TABLE module_catalog ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE module_catalog ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100;

UPDATE module_catalog SET sector='shared',sort_order=10 WHERE code='pos';
UPDATE module_catalog SET sector='shared',sort_order=20 WHERE code='products';
UPDATE module_catalog SET sector='shared',sort_order=30 WHERE code='customers';
UPDATE module_catalog SET sector='shared',sort_order=40 WHERE code='expenses';
UPDATE module_catalog SET sector='shared',sort_order=50 WHERE code='reports';
UPDATE module_catalog SET sector='shared',sort_order=60 WHERE code='purchasing';
UPDATE module_catalog SET sector='restaurant',sort_order=100,maturity='live' WHERE code='restaurant';
UPDATE module_catalog SET sector='pharmacy',sort_order=200,maturity='planned' WHERE code='pharmacy';
UPDATE module_catalog SET sector='workforce',sort_order=300,maturity='planned' WHERE code='payroll';
UPDATE module_catalog SET sector='factory',sort_order=400,maturity='planned' WHERE code='production';
UPDATE module_catalog SET sector='distribution',sort_order=500,maturity='planned' WHERE code='route_sales';

INSERT INTO module_catalog(code,name,description,monthly_price,core,active,sector,maturity,sort_order)
VALUES
('retail','Supermarket / Retail','Retail checkout, barcode-led supermarket operations and fast-moving stock workflows',0,false,true,'retail','live',150)
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,sector=EXCLUDED.sector,maturity=EXCLUDED.maturity,sort_order=EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id,created_at DESC);

-- Phase 8: document / printer engine
CREATE TABLE IF NOT EXISTS print_profiles (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'receipt',
  paper_size TEXT NOT NULL DEFAULT '80mm',
  printer_name TEXT,
  station_id BIGINT REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,name)
);
CREATE TABLE IF NOT EXISTS print_logs (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  document_no TEXT,
  paper_size TEXT,
  printed_by TEXT,
  reprint BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_print_logs_business_date ON print_logs(business_id,created_at DESC);
INSERT INTO print_profiles(business_id,name,document_type,paper_size)
SELECT id,'Customer Receipt','receipt','80mm' FROM businesses
ON CONFLICT(business_id,name) DO NOTHING;
INSERT INTO print_profiles(business_id,name,document_type,paper_size)
SELECT id,'Kitchen Ticket','kot','80mm' FROM businesses
ON CONFLICT(business_id,name) DO NOTHING;

-- Phase 9: shifts / cash reconciliation
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS terminal_id BIGINT;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS opened_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS closed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS variance NUMERIC(14,2);
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS denomination_count JSONB;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS manager_confirmed_by TEXT;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS manager_confirmed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS cash_movements (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  session_id BIGINT REFERENCES cash_sessions(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('cash_in','cash_out')),
  amount NUMERIC(14,2) NOT NULL CHECK(amount>0),
  reason TEXT NOT NULL,
  reference TEXT,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id,created_at);

-- Phase 11: branch / terminal / role governance
CREATE TABLE IF NOT EXISTS terminals (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,code)
);
ALTER TABLE cash_sessions DROP CONSTRAINT IF EXISTS cash_sessions_terminal_id_fkey;
ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_terminal_id_fkey FOREIGN KEY(terminal_id) REFERENCES terminals(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS permission_catalog (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS role_permissions (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission_code TEXT REFERENCES permission_catalog(code) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY(business_id,role,permission_code)
);
CREATE TABLE IF NOT EXISTS user_branch_assignments (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,branch_id)
);
INSERT INTO permission_catalog(code,name,section) VALUES
('sales.discount','Approve discounts','Sales'),
('sales.refund','Approve refunds','Sales'),
('sales.void','Approve voids','Sales'),
('sales.reopen','Reopen closed sales','Sales'),
('inventory.adjust','Approve stock adjustments','Inventory'),
('inventory.cost','View product costs','Inventory'),
('reports.profit','View profit reports','Reports'),
('reports.export','Export reports','Reports'),
('shift.close','Close cash shifts','Cash'),
('branch.all','View all branches','Branches'),
('settings.manage','Manage organisation settings','Settings'),
('staff.manage','Manage staff and roles','Staff')
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,section=EXCLUDED.section;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'administrator',p.code,true FROM businesses b CROSS JOIN permission_catalog p
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'branch_manager',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('sales.discount','sales.refund','sales.void','sales.reopen','inventory.adjust','inventory.cost','reports.profit','reports.export','shift.close','branch.all')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'restaurant_manager',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('sales.discount','sales.refund','sales.void','sales.reopen','reports.profit','shift.close')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'accountant',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('inventory.cost','reports.profit','reports.export','shift.close')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'storekeeper',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('inventory.adjust','inventory.cost')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'auditor',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('inventory.cost','reports.profit','reports.export','branch.all')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;

INSERT INTO terminals(business_id,branch_id,name,code)
SELECT b.business_id,b.id,'Front Counter','MAIN-'||b.id FROM branches b
ON CONFLICT(business_id,code) DO NOTHING;


-- Receipt / document branding controls
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_title TEXT NOT NULL DEFAULT 'ORDER BILL';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_payment_options TEXT NOT NULL DEFAULT 'CASH | MTN MOMO | AIRTEL MONEY | CARD';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_header_note TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_show_logo BOOLEAN NOT NULL DEFAULT true;


ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS cleanliness_status TEXT NOT NULL DEFAULT 'clean';
UPDATE restaurant_tables SET cleanliness_status='clean' WHERE cleanliness_status IS NULL OR cleanliness_status NOT IN ('clean','dirty');


-- Shift hardening: bind financial events to the cashier session that created them
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_cash_session ON payments(cash_session_id,payment_method,status);

ALTER TABLE refund_tenders ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_refund_tenders_cash_session ON refund_tenders(cash_session_id,payment_method);

ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS shift_no TEXT;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS closing_note TEXT;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS variance_reason TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_sessions_business_shift_no ON cash_sessions(business_id,shift_no) WHERE shift_no IS NOT NULL;


ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_key TEXT NOT NULL DEFAULT 'green';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'light';


-- Automated master data and document numbering
CREATE TABLE IF NOT EXISTS daily_document_sequences (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  business_date DATE NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, document_type, business_date)
);

CREATE TABLE IF NOT EXISTS product_categories (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, name)
);
INSERT INTO product_categories(business_id,name)
SELECT DISTINCT business_id,coalesce(nullif(trim(category),''),'General') FROM products
ON CONFLICT(business_id,name) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_requests (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name TEXT,
  name TEXT,
  scanned_code TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS receipt_show_business_name BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_business_product_code ON products(business_id,product_code) WHERE product_code IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sales_receipt_no_key') THEN
    ALTER TABLE sales DROP CONSTRAINT sales_receipt_no_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_business_receipt_no ON sales(business_id,receipt_no);

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Kampala';
CREATE INDEX IF NOT EXISTS idx_products_business_barcode ON products(business_id,barcode);
CREATE INDEX IF NOT EXISTS idx_products_business_sku ON products(business_id,sku);


-- Backfill system-generated expense register from operational activity.
INSERT INTO expenses(business_id,category,description,amount,expense_date,reference_no,source_type,source_id,auto_generated,accounting_treatment,status)
SELECT cm.business_id,'Cash Expense',cm.reason,cm.amount,cm.created_at::date,coalesce(cm.reference,'CASH-'||cm.id),'cash_movement',cm.id,true,'operating_expense','posted'
FROM cash_movements cm
WHERE cm.movement_type='cash_out'
ON CONFLICT(business_id,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

INSERT INTO expenses(business_id,category,description,amount,expense_date,reference_no,source_type,source_id,auto_generated,accounting_treatment,status)
SELECT ic.business_id,
       CASE WHEN ic.consumption_type='staff_meal' THEN 'Staff Meals' ELSE 'Complimentary / Promotion' END,
       CASE WHEN ic.consumption_type='staff_meal' THEN 'Staff meal stock consumption' ELSE 'Complimentary stock consumption' END,
       sum(ici.qty*ici.unit_cost),
       ic.created_at::date,ic.reference_no,'inventory_consumption',ic.id,true,
       CASE WHEN ic.consumption_type='staff_meal' THEN 'staff_welfare_expense' ELSE 'promotion_expense' END,'posted'
FROM inventory_consumptions ic
JOIN inventory_consumption_items ici ON ici.consumption_id=ic.id
GROUP BY ic.id
HAVING sum(ici.qty*ici.unit_cost)>0
ON CONFLICT(business_id,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;

INSERT INTO expenses(business_id,category,description,amount,expense_date,reference_no,source_type,source_id,auto_generated,accounting_treatment,status)
SELECT sa.business_id,
       CASE WHEN sa.adjustment_type='spoilage' THEN 'Spoilage' ELSE 'Wastage' END,
       CASE WHEN sa.adjustment_type='spoilage' THEN 'Spoilage ' ELSE 'Wastage ' END || coalesce(sa.reason,sa.reference_no),
       sum(abs(sai.qty_change*sai.unit_cost)),
       sa.created_at::date,sa.reference_no,'stock_adjustment',sa.id,true,'inventory_loss','posted'
FROM stock_adjustments sa
JOIN stock_adjustment_items sai ON sai.adjustment_id=sa.id
WHERE sa.status='posted' AND sa.adjustment_type IN ('wastage','spoilage')
GROUP BY sa.id
HAVING sum(abs(sai.qty_change*sai.unit_cost))>0
ON CONFLICT(business_id,source_type,source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL DO NOTHING;


-- Advanced Restaurant Operations 2026-09
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS seat_no INT;
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS course_no INT NOT NULL DEFAULT 1;
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS course_name TEXT NOT NULL DEFAULT 'Main';
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS fired_at TIMESTAMPTZ;
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS arrival_status TEXT NOT NULL DEFAULT 'expected';
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS last_seated_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS last_cleared_at TIMESTAMPTZ;
ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_party_size INT NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_minutes INT NOT NULL DEFAULT 15;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS promised_at TIMESTAMPTZ;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivery_zone_id BIGINT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS restaurant_waitlist (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  phone TEXT,
  guest_count INT NOT NULL DEFAULT 1,
  preferred_area_id BIGINT REFERENCES restaurant_areas(id) ON DELETE SET NULL,
  estimated_wait_minutes INT NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'waiting',
  notes TEXT,
  quoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurant_waitlist_active ON restaurant_waitlist(business_id,branch_id,status,created_at);

CREATE TABLE IF NOT EXISTS restaurant_order_courses (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  course_no INT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  fired_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  fired_by TEXT,
  UNIQUE(order_id,course_no)
);

CREATE TABLE IF NOT EXISTS restaurant_table_events (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  table_id BIGINT REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES restaurant_orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurant_table_events ON restaurant_table_events(business_id,table_id,created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  estimated_minutes INT NOT NULL DEFAULT 45,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(business_id,branch_id,name)
);
ALTER TABLE restaurant_orders DROP CONSTRAINT IF EXISTS restaurant_orders_delivery_zone_id_fkey;
ALTER TABLE restaurant_orders ADD CONSTRAINT restaurant_orders_delivery_zone_id_fkey FOREIGN KEY(delivery_zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL;

-- Recipe yields, production batches and perishable lot control
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS output_unit_id BIGINT REFERENCES units_of_measure(id) ON DELETE SET NULL;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_loss_percent NUMERIC(8,3) NOT NULL DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS version_no INT NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS recipe_batches (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  recipe_id BIGINT REFERENCES recipes(id) ON DELETE RESTRICT,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  batch_no TEXT NOT NULL,
  planned_yield NUMERIC(14,3) NOT NULL DEFAULT 0,
  actual_yield NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  prepared_by TEXT,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(business_id,batch_no)
);
CREATE TABLE IF NOT EXISTS inventory_lots (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE CASCADE,
  lot_no TEXT NOT NULL,
  expiry_date DATE,
  qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(business_id,product_id,location_id,lot_no)
);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_fefo ON inventory_lots(business_id,product_id,location_id,expiry_date,qty);

-- Supplier invoice / AP
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_id BIGINT REFERENCES goods_receipts(id) ON DELETE SET NULL,
  invoice_no TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT current_date,
  due_date DATE,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,supplier_id,invoice_no)
);
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id BIGSERIAL PRIMARY KEY,
  supplier_invoice_id BIGINT REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_invoice_id BIGINT REFERENCES supplier_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK(amount>0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  paid_by TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer CRM and loyalty
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferences TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier TEXT NOT NULL DEFAULT 'Standard';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INT NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_spend NUMERIC(14,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS customer_loyalty_ledger (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  points INT NOT NULL,
  event_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gift_cards (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  initial_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,code)
);

-- Devices, PIN switching and attendance
CREATE TABLE IF NOT EXISTS registered_devices (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  terminal_id BIGINT REFERENCES terminals(id) ON DELETE SET NULL,
  device_key TEXT NOT NULL,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'browser',
  active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,device_key)
);
CREATE TABLE IF NOT EXISTS business_user_pins (
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(business_id,user_id)
);
CREATE TABLE IF NOT EXISTS staff_time_entries (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at TIMESTAMPTZ,
  break_minutes INT NOT NULL DEFAULT 0,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'pos'
);
CREATE INDEX IF NOT EXISTS idx_staff_time_entries_open ON staff_time_entries(business_id,user_id,clock_out_at);

-- End of day, alerts and reporting schedules
CREATE TABLE IF NOT EXISTS business_day_closures (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  sales_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  expenses_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_expected NUMERIC(14,2) NOT NULL DEFAULT 0,
  open_orders INT NOT NULL DEFAULT 0,
  open_shifts INT NOT NULL DEFAULT 0,
  pending_kots INT NOT NULL DEFAULT 0,
  notes TEXT,
  closed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,branch_id,business_date)
);
CREATE TABLE IF NOT EXISTS notification_events (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id BIGINT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_events_unread ON notification_events(business_id,read_at,created_at DESC);
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  cadence TEXT NOT NULL,
  send_time TIME NOT NULL DEFAULT '23:59',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS report_delivery_queue (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  scheduled_report_id BIGINT REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Printer job recovery
CREATE TABLE IF NOT EXISTS print_jobs (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  printer_profile_id BIGINT REFERENCES print_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_queue ON print_jobs(business_id,status,created_at);

-- Restaurant policies
CREATE TABLE IF NOT EXISTS restaurant_policies (
  business_id BIGINT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  default_reservation_minutes INT NOT NULL DEFAULT 120,
  default_wait_minutes INT NOT NULL DEFAULT 15,
  auto_dirty_on_close BOOLEAN NOT NULL DEFAULT true,
  require_shift_for_payment BOOLEAN NOT NULL DEFAULT true,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  loyalty_points_per_currency NUMERIC(18,6) NOT NULL DEFAULT 0,
  loyalty_redeem_value NUMERIC(14,4) NOT NULL DEFAULT 0,
  idle_lock_minutes INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO restaurant_policies(business_id) SELECT id FROM businesses ON CONFLICT(business_id) DO NOTHING;

INSERT INTO permission_catalog(code,name,section) VALUES
('restaurant.reservations','Manage reservations and waitlist','Restaurant'),
('restaurant.courses','Fire and manage courses','Restaurant'),
('restaurant.dayclose','Close restaurant business day','Restaurant'),
('restaurant.delivery','Manage delivery operations','Restaurant'),
('restaurant.crm','Manage guest CRM and loyalty','Restaurant'),
('purchasing.ap','Manage supplier invoices and payments','Purchasing'),
('staff.pin','Manage staff quick PINs','Staff'),
('staff.timeclock','Manage attendance and time clock','Staff'),
('devices.manage','Manage registered POS devices','Settings'),
('reports.schedule','Manage scheduled reports','Reports')
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,section=EXCLUDED.section;


ALTER TABLE sales ADD COLUMN IF NOT EXISTS loyalty_applied_at TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS purchase_returns (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_id BIGINT REFERENCES goods_receipts(id) ON DELETE SET NULL,
  return_no TEXT NOT NULL,
  reason TEXT NOT NULL,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'posted',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,return_no)
);
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_return_id BIGINT REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE RESTRICT,
  location_id BIGINT REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  qty NUMERIC(14,3) NOT NULL CHECK(qty>0),
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  lot_id BIGINT REFERENCES inventory_lots(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  source_type TEXT,
  source_id BIGINT,
  reference_no TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions ON supplier_transactions(business_id,supplier_id,created_at,id);

ALTER TABLE user_businesses ADD COLUMN IF NOT EXISTS staff_status TEXT NOT NULL DEFAULT 'active';
UPDATE user_businesses SET staff_status=CASE WHEN active THEN 'active' ELSE 'disabled' END WHERE staff_status IS NULL OR staff_status='';

-- Core cash accountability / shift handover
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS movement_category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS expense_category TEXT;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS approved_by TEXT;

ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS close_destination TEXT;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS retained_float NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS safe_deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS handover_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'open';

CREATE TABLE IF NOT EXISTS cash_handovers (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE CASCADE,
  source_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE CASCADE,
  target_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL,
  transfer_type TEXT NOT NULL CHECK(transfer_type IN ('direct_handover','carry_forward')),
  amount NUMERIC(14,2) NOT NULL CHECK(amount>=0),
  recipient_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','disputed','cancelled')),
  accepted_amount NUMERIC(14,2),
  discrepancy NUMERIC(14,2),
  discrepancy_reason TEXT,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  accepted_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_handovers_pending ON cash_handovers(business_id,branch_id,status,recipient_user_id,created_at);

CREATE TABLE IF NOT EXISTS cash_control_settings (
  business_id BIGINT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  standard_float NUMERIC(14,2) NOT NULL DEFAULT 0,
  blind_count BOOLEAN NOT NULL DEFAULT false,
  payout_approval_threshold NUMERIC(14,2) NOT NULL DEFAULT 0,
  require_variance_reason BOOLEAN NOT NULL DEFAULT true,
  require_manager_variance_approval BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO cash_control_settings(business_id)
SELECT id FROM businesses
ON CONFLICT(business_id) DO NOTHING;

INSERT INTO permission_catalog(code,name,section) VALUES
('shift.manage','Manage shift controls and cash settings','Cash & Shifts'),
('shift.payout.approve','Approve counter payouts','Cash & Shifts'),
('shift.handover','Manage shift handovers','Cash & Shifts')
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,section=EXCLUDED.section;

INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'branch_manager',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('shift.manage','shift.payout.approve','shift.handover')
ON CONFLICT(business_id,role,permission_code) DO UPDATE SET allowed=true;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'restaurant_manager',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('shift.manage','shift.payout.approve','shift.handover')
ON CONFLICT(business_id,role,permission_code) DO UPDATE SET allowed=true;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'accountant',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('shift.manage','shift.payout.approve')
ON CONFLICT(business_id,role,permission_code) DO UPDATE SET allowed=true;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_background TEXT NOT NULL DEFAULT 'clean';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_background_scope TEXT NOT NULL DEFAULT 'operations';


ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_background_image TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS theme_background_image_fit TEXT NOT NULL DEFAULT 'cover';


-- Restaurant accounting foundation (Farmexa-derived architecture adapted to MauzoPOS)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('asset','liability','equity','revenue','cost_of_sales','expense')),
  normal_balance TEXT NOT NULL CHECK(normal_balance IN ('debit','credit')),
  parent_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_manual_entries BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,account_code)
);
CREATE INDEX IF NOT EXISTS idx_accounts_business_type ON accounts(business_id,account_type,is_active);

CREATE TABLE IF NOT EXISTS system_account_mappings (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  operation_key TEXT NOT NULL,
  account_id BIGINT REFERENCES accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,operation_key)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL,
  entry_no TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT current_date,
  posting_key TEXT NOT NULL,
  source_module TEXT,
  source_reference TEXT,
  reference_type TEXT,
  reference_id BIGINT,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('draft','posted','reversed','cancelled')),
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversal_of_id BIGINT REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  posted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,entry_no),
  UNIQUE(business_id,posting_key)
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_date ON journal_entries(business_id,entry_date,status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(business_id,reference_type,reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_shift ON journal_entries(business_id,cash_session_id,entry_date);

CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGSERIAL PRIMARY KEY,
  journal_entry_id BIGINT REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE RESTRICT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(debit>=0),
  credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK(credit>=0),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0))
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id,journal_entry_id);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closing','closed','locked')),
  closed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id,start_date,end_date)
);

CREATE TABLE IF NOT EXISTS document_attachments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'supporting_document',
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  uploaded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_attachments_entity ON document_attachments(business_id,entity_type,entity_id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by_name TEXT;

ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL;
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS cash_session_id BIGINT REFERENCES cash_sessions(id) ON DELETE SET NULL;

INSERT INTO permission_catalog(code,name,section) VALUES
('accounting.view','View accounting and financial statements','Accounting'),
('accounting.post','Create and post journal entries','Accounting'),
('accounting.manage','Manage chart of accounts and mappings','Accounting'),
('accounting.close','Close or reopen accounting periods','Accounting'),
('accounting.export','Export accounting reports','Accounting'),
('reports.activity','View management activity explorer','Reports')
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,section=EXCLUDED.section;

INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'administrator',p.code,true FROM businesses b JOIN permission_catalog p ON p.section='Accounting' OR p.code='reports.activity'
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'accountant',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('accounting.view','accounting.post','accounting.manage','accounting.export','reports.activity')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'auditor',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('accounting.view','accounting.export','reports.activity')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;
INSERT INTO role_permissions(business_id,role,permission_code,allowed)
SELECT b.id,'branch_manager',p.code,true FROM businesses b JOIN permission_catalog p ON p.code IN ('accounting.view','reports.activity')
ON CONFLICT(business_id,role,permission_code) DO NOTHING;

-- Seed a restaurant/retail-safe chart of accounts for every business.
WITH defs(code,name,type,normal,parent_code,manual) AS (
 VALUES
 ('1000','Assets','asset','debit',NULL,false),
 ('1100','Current Assets','asset','debit','1000',false),
 ('1110','Cash and Cash Equivalents','asset','debit','1100',false),
 ('1111','Cash on Hand','asset','debit','1110',true),
 ('1112','Bank Account','asset','debit','1110',true),
 ('1113','MTN Mobile Money','asset','debit','1110',true),
 ('1114','Airtel Money','asset','debit','1110',true),
 ('1115','Card Clearing','asset','debit','1110',true),
 ('1116','Petty Cash','asset','debit','1110',true),
 ('1120','Accounts Receivable','asset','debit','1100',false),
 ('1130','Inventory','asset','debit','1100',false),
 ('1131','Raw Material Inventory','asset','debit','1130',false),
 ('1132','Finished Food Inventory','asset','debit','1130',false),
 ('1133','Beverage Inventory','asset','debit','1130',false),
 ('1134','Packaging Inventory','asset','debit','1130',false),
 ('1135','Goods in Transit','asset','debit','1130',false),
 ('1150','VAT Input Recoverable','asset','debit','1100',false),

 ('2000','Liabilities','liability','credit',NULL,false),
 ('2100','Current Liabilities','liability','credit','2000',false),
 ('2110','Accounts Payable','liability','credit','2100',false),
 ('2120','Accrued Expenses','liability','credit','2100',false),
 ('2130','VAT / Tax Payable','liability','credit','2100',false),
 ('2140','Tips Payable','liability','credit','2100',false),
 ('2150','Customer Deposits','liability','credit','2100',false),
 ('2160','Gift Card Liability','liability','credit','2100',false),

 ('3000','Equity','equity','credit',NULL,false),
 ('3100','Owner Capital','equity','credit','3000',true),
 ('3200','Retained Earnings','equity','credit','3000',false),
 ('3300','Current Year Profit / Loss','equity','credit','3000',false),

 ('4000','Revenue','revenue','credit',NULL,false),
 ('4110','Food Sales','revenue','credit','4000',false),
 ('4120','Beverage Sales','revenue','credit','4000',false),
 ('4130','Takeaway Sales','revenue','credit','4000',false),
 ('4140','Delivery Sales','revenue','credit','4000',false),
 ('4150','Service Charge Revenue','revenue','credit','4000',false),
 ('4160','Catering Revenue','revenue','credit','4000',false),
 ('4170','Sales Returns & Refunds','revenue','credit','4000',false),
 ('4200','Other Income','revenue','credit','4000',true),

 ('5000','Cost of Sales','cost_of_sales','debit',NULL,false),
 ('5110','Food Cost of Sales','cost_of_sales','debit','5000',false),
 ('5120','Beverage Cost of Sales','cost_of_sales','debit','5000',false),
 ('5130','Packaging Cost','cost_of_sales','debit','5000',false),
 ('5140','Production Variance','cost_of_sales','debit','5000',true),
 ('5150','Waste / Spoilage','cost_of_sales','debit','5000',true),

 ('6000','Operating Expenses','expense','debit',NULL,false),
 ('6110','Salaries & Wages','expense','debit','6000',true),
 ('6210','Electricity','expense','debit','6000',true),
 ('6220','Water','expense','debit','6000',true),
 ('6230','Gas / Fuel','expense','debit','6000',true),
 ('6310','Repairs & Maintenance','expense','debit','6000',true),
 ('6410','Transport','expense','debit','6000',true),
 ('6510','Office Expenses','expense','debit','6000',true),
 ('6520','Professional Fees','expense','debit','6000',true),
 ('6530','Insurance','expense','debit','6000',true),
 ('6540','Rent','expense','debit','6000',true),
 ('6550','Marketing','expense','debit','6000',true),
 ('6560','Bank Charges','expense','debit','6000',true),
 ('6570','Software / Licences','expense','debit','6000',true),
 ('6800','General Operating Expense','expense','debit','6000',true)
)
INSERT INTO accounts(business_id,account_code,name,account_type,normal_balance,description,is_system,allow_manual_entries)
SELECT b.id,d.code,d.name,d.type,d.normal,'MauzoPOS default restaurant chart of accounts',true,d.manual
FROM businesses b CROSS JOIN defs d
ON CONFLICT(business_id,account_code) DO NOTHING;

WITH defs(code,parent_code) AS (
 VALUES
 ('1100','1000'),('1110','1100'),('1111','1110'),('1112','1110'),('1113','1110'),('1114','1110'),('1115','1110'),('1116','1110'),
 ('1120','1100'),('1130','1100'),('1131','1130'),('1132','1130'),('1133','1130'),('1134','1130'),('1135','1130'),('1150','1100'),
 ('2100','2000'),('2110','2100'),('2120','2100'),('2130','2100'),('2140','2100'),('2150','2100'),('2160','2100'),
 ('3100','3000'),('3200','3000'),('3300','3000'),
 ('4110','4000'),('4120','4000'),('4130','4000'),('4140','4000'),('4150','4000'),('4160','4000'),('4170','4000'),('4200','4000'),
 ('5110','5000'),('5120','5000'),('5130','5000'),('5140','5000'),('5150','5000'),
 ('6110','6000'),('6210','6000'),('6220','6000'),('6230','6000'),('6310','6000'),('6410','6000'),('6510','6000'),('6520','6000'),('6530','6000'),('6540','6000'),('6550','6000'),('6560','6000'),('6570','6000'),('6800','6000')
)
UPDATE accounts child SET parent_account_id=parent.id
FROM defs d,accounts parent
WHERE child.account_code=d.code AND parent.account_code=d.parent_code AND parent.business_id=child.business_id
  AND child.parent_account_id IS NULL;

WITH defs(operation_key,code) AS (
 VALUES
 ('cash','1111'),('bank','1112'),('mobile_money','1113'),('mtn_mobile_money','1113'),('airtel_money','1114'),('card','1115'),('petty_cash','1116'),
 ('accounts_receivable','1120'),('accounts_payable','2110'),
 ('raw_material_inventory','1131'),('finished_goods_inventory','1132'),('beverage_inventory','1133'),('packaging_inventory','1134'),
 ('vat_input','1150'),('vat_output','2130'),('tips_payable','2140'),('customer_deposits','2150'),('gift_card_liability','2160'),
 ('food_sales','4110'),('beverage_sales','4120'),('takeaway_sales','4130'),('delivery_sales','4140'),('service_charge_revenue','4150'),('sales_returns','4170'),('other_income','4200'),
 ('food_cogs','5110'),('beverage_cogs','5120'),('packaging_cogs','5130'),('production_variance','5140'),('waste_expense','5150'),
 ('default_expense','6800'),('retained_earnings','3200'),('current_year_pl','3300')
)
INSERT INTO system_account_mappings(business_id,operation_key,account_id)
SELECT b.id,d.operation_key,a.id FROM businesses b CROSS JOIN defs d JOIN accounts a ON a.business_id=b.id AND a.account_code=d.code
ON CONFLICT(business_id,operation_key) DO NOTHING;


-- Per-business accounting bootstrap for tenants created after process startup
CREATE OR REPLACE FUNCTION seed_business_accounting(p_business_id BIGINT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  WITH defs(code,name,type,normal,parent_code,manual) AS (
   VALUES
   ('1000','Assets','asset','debit',NULL,false),('1100','Current Assets','asset','debit','1000',false),('1110','Cash and Cash Equivalents','asset','debit','1100',false),
   ('1111','Cash on Hand','asset','debit','1110',true),('1112','Bank Account','asset','debit','1110',true),('1113','MTN Mobile Money','asset','debit','1110',true),('1114','Airtel Money','asset','debit','1110',true),('1115','Card Clearing','asset','debit','1110',true),('1116','Petty Cash','asset','debit','1110',true),
   ('1120','Accounts Receivable','asset','debit','1100',false),('1130','Inventory','asset','debit','1100',false),('1131','Raw Material Inventory','asset','debit','1130',false),('1132','Finished Food Inventory','asset','debit','1130',false),('1133','Beverage Inventory','asset','debit','1130',false),('1134','Packaging Inventory','asset','debit','1130',false),('1135','Goods in Transit','asset','debit','1130',false),('1150','VAT Input Recoverable','asset','debit','1100',false),
   ('2000','Liabilities','liability','credit',NULL,false),('2100','Current Liabilities','liability','credit','2000',false),('2110','Accounts Payable','liability','credit','2100',false),('2120','Accrued Expenses','liability','credit','2100',false),('2130','VAT / Tax Payable','liability','credit','2100',false),('2140','Tips Payable','liability','credit','2100',false),('2150','Customer Deposits','liability','credit','2100',false),('2160','Gift Card Liability','liability','credit','2100',false),
   ('3000','Equity','equity','credit',NULL,false),('3100','Owner Capital','equity','credit','3000',true),('3200','Retained Earnings','equity','credit','3000',false),('3300','Current Year Profit / Loss','equity','credit','3000',false),
   ('4000','Revenue','revenue','credit',NULL,false),('4110','Food Sales','revenue','credit','4000',false),('4120','Beverage Sales','revenue','credit','4000',false),('4130','Takeaway Sales','revenue','credit','4000',false),('4140','Delivery Sales','revenue','credit','4000',false),('4150','Service Charge Revenue','revenue','credit','4000',false),('4160','Catering Revenue','revenue','credit','4000',false),('4170','Sales Returns & Refunds','revenue','credit','4000',false),('4200','Other Income','revenue','credit','4000',true),
   ('5000','Cost of Sales','cost_of_sales','debit',NULL,false),('5110','Food Cost of Sales','cost_of_sales','debit','5000',false),('5120','Beverage Cost of Sales','cost_of_sales','debit','5000',false),('5130','Packaging Cost','cost_of_sales','debit','5000',false),('5140','Production Variance','cost_of_sales','debit','5000',true),('5150','Waste / Spoilage','cost_of_sales','debit','5000',true),
   ('6000','Operating Expenses','expense','debit',NULL,false),('6110','Salaries & Wages','expense','debit','6000',true),('6210','Electricity','expense','debit','6000',true),('6220','Water','expense','debit','6000',true),('6230','Gas / Fuel','expense','debit','6000',true),('6310','Repairs & Maintenance','expense','debit','6000',true),('6410','Transport','expense','debit','6000',true),('6510','Office Expenses','expense','debit','6000',true),('6520','Professional Fees','expense','debit','6000',true),('6530','Insurance','expense','debit','6000',true),('6540','Rent','expense','debit','6000',true),('6550','Marketing','expense','debit','6000',true),('6560','Bank Charges','expense','debit','6000',true),('6570','Software / Licences','expense','debit','6000',true),('6800','General Operating Expense','expense','debit','6000',true)
  )
  INSERT INTO accounts(business_id,account_code,name,account_type,normal_balance,description,is_system,allow_manual_entries)
  SELECT p_business_id,d.code,d.name,d.type,d.normal,'MauzoPOS default restaurant chart of accounts',true,d.manual FROM defs d
  ON CONFLICT(business_id,account_code) DO NOTHING;

  WITH defs(code,parent_code) AS (
   VALUES ('1100','1000'),('1110','1100'),('1111','1110'),('1112','1110'),('1113','1110'),('1114','1110'),('1115','1110'),('1116','1110'),('1120','1100'),('1130','1100'),('1131','1130'),('1132','1130'),('1133','1130'),('1134','1130'),('1135','1130'),('1150','1100'),('2100','2000'),('2110','2100'),('2120','2100'),('2130','2100'),('2140','2100'),('2150','2100'),('2160','2100'),('3100','3000'),('3200','3000'),('3300','3000'),('4110','4000'),('4120','4000'),('4130','4000'),('4140','4000'),('4150','4000'),('4160','4000'),('4170','4000'),('4200','4000'),('5110','5000'),('5120','5000'),('5130','5000'),('5140','5000'),('5150','5000'),('6110','6000'),('6210','6000'),('6220','6000'),('6230','6000'),('6310','6000'),('6410','6000'),('6510','6000'),('6520','6000'),('6530','6000'),('6540','6000'),('6550','6000'),('6560','6000'),('6570','6000'),('6800','6000')
  )
  UPDATE accounts child SET parent_account_id=parent.id FROM defs d,accounts parent
  WHERE child.business_id=p_business_id AND parent.business_id=p_business_id AND child.account_code=d.code AND parent.account_code=d.parent_code AND child.parent_account_id IS NULL;

  WITH defs(operation_key,code) AS (
   VALUES ('cash','1111'),('bank','1112'),('mobile_money','1113'),('mtn_mobile_money','1113'),('airtel_money','1114'),('card','1115'),('petty_cash','1116'),('accounts_receivable','1120'),('accounts_payable','2110'),('raw_material_inventory','1131'),('finished_goods_inventory','1132'),('beverage_inventory','1133'),('packaging_inventory','1134'),('vat_input','1150'),('vat_output','2130'),('tips_payable','2140'),('customer_deposits','2150'),('gift_card_liability','2160'),('food_sales','4110'),('beverage_sales','4120'),('takeaway_sales','4130'),('delivery_sales','4140'),('service_charge_revenue','4150'),('sales_returns','4170'),('other_income','4200'),('food_cogs','5110'),('beverage_cogs','5120'),('packaging_cogs','5130'),('production_variance','5140'),('waste_expense','5150'),('default_expense','6800'),('retained_earnings','3200'),('current_year_pl','3300')
  )
  INSERT INTO system_account_mappings(business_id,operation_key,account_id)
  SELECT p_business_id,d.operation_key,a.id FROM defs d JOIN accounts a ON a.business_id=p_business_id AND a.account_code=d.code
  ON CONFLICT(business_id,operation_key) DO NOTHING;

  INSERT INTO role_permissions(business_id,role,permission_code,allowed)
  SELECT p_business_id,'administrator',p.code,true FROM permission_catalog p WHERE p.section='Accounting' OR p.code='reports.activity'
  ON CONFLICT(business_id,role,permission_code) DO NOTHING;
  INSERT INTO role_permissions(business_id,role,permission_code,allowed)
  SELECT p_business_id,'accountant',p.code,true FROM permission_catalog p WHERE p.code IN ('accounting.view','accounting.post','accounting.manage','accounting.export','reports.activity')
  ON CONFLICT(business_id,role,permission_code) DO NOTHING;
  INSERT INTO role_permissions(business_id,role,permission_code,allowed)
  SELECT p_business_id,'auditor',p.code,true FROM permission_catalog p WHERE p.code IN ('accounting.view','accounting.export','reports.activity')
  ON CONFLICT(business_id,role,permission_code) DO NOTHING;
  INSERT INTO role_permissions(business_id,role,permission_code,allowed)
  SELECT p_business_id,'branch_manager',p.code,true FROM permission_catalog p WHERE p.code IN ('accounting.view','reports.activity')
  ON CONFLICT(business_id,role,permission_code) DO NOTHING;
END $$;

SELECT seed_business_accounting(id) FROM businesses;


-- Table lifecycle invariant: a vacant table is always clean.
UPDATE restaurant_tables SET cleanliness_status='clean' WHERE status='available' AND cleanliness_status<>'clean';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_restaurant_table_available_clean') THEN
    ALTER TABLE restaurant_tables ADD CONSTRAINT ck_restaurant_table_available_clean CHECK(status<>'available' OR cleanliness_status='clean');
  END IF;
END $$;
