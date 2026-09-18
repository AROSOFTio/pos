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
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS grn_id BIGINT REFERENCES goods_receipts(id) ON DELETE SET NULL;
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
SELECT b.id,m.code,true,(NOT m.core),CASE WHEN m.core THEN NULL ELSE b.trial_ends_at END
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
