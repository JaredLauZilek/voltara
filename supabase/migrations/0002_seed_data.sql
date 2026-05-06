-- ============================================================================
-- Voltara — seed data
-- ============================================================================
-- Insert order matters because of FK constraints:
--   1. customers, suppliers
--   2. products (FK → suppliers)
--   3. transactional rows (FK → customers/suppliers/products)
--
-- Prototype-id mapping for traceability:
--   prototype "ahmad-razif"          → CUST-0001
--   prototype "nurul-ain"            → CUST-0002
--   prototype "lee-cheng-wei"        → CUST-0003
--   prototype "priya-rajendran"      → CUST-0004
--   prototype "hafiz-mohd-noor"      → CUST-0005
--   prototype "tan-siew-ling"        → CUST-0006
--   prototype "ytl-powerseraya"      → CUST-0007
--   prototype "mohd-farid-roslan"    → CUST-0008
--   prototype 7kw / "7kW Home Charger" → SKU-7KW-001
--   prototype 22kw / "22kW Commercial" → SKU-22KW-001
--   prototype dc50                    → SKU-DC50-001
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1a. customers
-- ---------------------------------------------------------------------------
insert into customers (id, name, email, phone, address, type, status, joined) values
  ('CUST-0001', 'Ahmad Razif Bin Hamid', 'ahmad.razif@email.com',     '+60 12 345 6789', 'Jln Riong, Bangsar, 59100 Kuala Lumpur',          'Residential', 'Active',   '2026-03-01'),
  ('CUST-0002', 'Nurul Ain Bt Hassan',   'nurul.ain@company.com',     '+60 13 456 7890', 'Jln SS2, Petaling Jaya, 47300 Selangor',          'Commercial',  'Active',   '2026-01-12'),
  ('CUST-0003', 'Lee Cheng Wei',         'lee.cw@email.com',          '+60 16 234 5678', 'Jln Kiara, Mont Kiara, 50480 Kuala Lumpur',       'Residential', 'Active',   '2026-04-02'),
  ('CUST-0004', 'Priya Rajendran',       'priya.r@techco.com',        '+60 17 345 6789', 'Persiaran APEC, Cyberjaya, 63000 Selangor',       'Commercial',  'Active',   '2025-11-10'),
  ('CUST-0005', 'Hafiz Mohd Noor',       'hafiz.mn@email.com',        '+60 19 456 7891', 'Jln SAS 3, Shah Alam, 40150 Selangor',            'Residential', 'Inactive', '2026-04-15'),
  ('CUST-0006', 'Tan Siew Ling',         'siewling@email.com',        '+60 12 567 8901', 'Jln Cheras, 56100 Kuala Lumpur',                  'Residential', 'Active',   '2026-02-08'),
  ('CUST-0007', 'YTL PowerSeraya',       'procurement@ytl.com.my',    '+60 3 2117 0088', '11 Jalan Yap Kwan Seng, 50450 Kuala Lumpur',      'Enterprise',  'Active',   '2025-06-20'),
  ('CUST-0008', 'Mohd Farid Roslan',     'farid.r@email.com',         '+60 14 678 9012', 'USJ 8, Subang Jaya, 47620 Selangor',              'Residential', 'Active',   '2026-04-20');

-- ---------------------------------------------------------------------------
-- 1b. suppliers
-- ---------------------------------------------------------------------------
insert into suppliers (id, name, category, status, contact, email, phone, address, payment_terms, lead_time_days, reg_number, rating, notes) values
  ('SUP-001', 'EVDB Technology',        'Charger OEM',           'Active',   'Lim Wei Han',     'sales@evdb.com',          '+60 3 7777 1234', 'Section 13, Petaling Jaya, Selangor',     'Net 30', 14, '202001012345', 4.6, 'Primary 7kW & 22kW supplier.'),
  ('SUP-002', 'Schneider Electric',     'Electrical Equipment',  'Active',   'Aisha Karim',     'orders.my@schneider.com', '+60 3 6259 7888', '6 Lengkok Teknologi, Cyberjaya, Selangor','Net 45', 21, '199301010101', 4.8, 'Switchgear, breakers, IP67 enclosures.'),
  ('SUP-003', 'Hager Malaysia',         'Electrical Components', 'Active',   'David Ng',        'sales@hager.com.my',      '+60 3 5544 8899', 'Glenmarie, Shah Alam, Selangor',          'Net 30', 10, '199501112233', 4.4, 'Distribution boards, RCBOs.'),
  ('SUP-004', 'Voltara Internal Stock', 'Internal',              'Active',   'Internal Ops',    'ops@voltara.com.my',      NULL,              'Voltara Warehouse, Klang, Selangor',      'N/A',     0, NULL,           5.0, 'Internal cross-stock movements.'),
  ('SUP-005', 'ABB Malaysia',           'Charger OEM',           'Prospect', 'Faridah Yusof',   'enquiry@abb.com.my',      '+60 3 2070 1133', 'Lot 608 Persiaran Subang, Subang, SL',     'Net 60', 28, '200201023456', 4.5, 'Evaluating Terra DC range.'),
  ('SUP-006', 'Siemens Malaysia',       'Electrical Equipment',  'Active',   'Tan Boon Keat',   'siemens.my@siemens.com',  '+60 3 7858 8888', 'CP Tower, Petaling Jaya, Selangor',        'Net 45', 21, '199201054321', 4.7, 'Sicharge units, gateway hardware.');

-- ---------------------------------------------------------------------------
-- 2. products (canonical SKUs — merge of all catalogues)
-- ---------------------------------------------------------------------------
insert into products (id, name, category, cost, price, qty, reorder_level, supplier_id, location) values
  ('SKU-7KW-001',    '7kW Home Charger + Installation',         'Charger Units',  2200,  3399,  42, 10, 'SUP-001', 'Klang Warehouse A1'),
  ('SKU-22KW-001',   '22kW Commercial Charger + Installation',  'Charger Units',  5800,  8800,  18,  6, 'SUP-001', 'Klang Warehouse A2'),
  ('SKU-DC50-001',   'DC Fast Charger 50kW + Installation',     'Charger Units', 16000, 22500,   4,  2, 'SUP-006', 'Klang Warehouse B1'),
  ('SKU-CABLE-T2',   'Type 2 Charging Cable 7m',                'Cables',          120,   220, 156, 40, 'SUP-001', 'Klang Warehouse C2'),
  ('SKU-CABLE-T2-5', 'Type 2 Charging Cable 5m',                'Cables',           95,   180, 134, 40, 'SUP-001', 'Klang Warehouse C2'),
  ('SKU-ENCL-IP67',  'IP67 Weatherproof Enclosure',             'Electrical',      220,   380,  64, 20, 'SUP-002', 'Klang Warehouse D1'),
  ('SKU-LB-SMART',   'Smart Load Balancer Module',              'Electrical',      380,   750,  22, 10, 'SUP-002', 'Klang Warehouse D2'),
  ('SKU-RCBO-32A',   'RCBO 32A Type B',                         'Electrical',       55,    98, 240, 80, 'SUP-003', 'Klang Warehouse D3'),
  ('SKU-RCBO-63A',   'RCBO 63A Type B',                         'Electrical',       95,   168,  96, 30, 'SUP-003', 'Klang Warehouse D3'),
  ('SKU-DBOARD-12',  '12-Way Distribution Board',               'Electrical',      280,   460,   8, 15, 'SUP-003', 'Klang Warehouse D4'),
  ('SKU-MOUNT-WALL', 'Wall Mount Bracket Kit',                  'Accessories',      35,    78, 188, 50, 'SUP-001', 'Klang Warehouse E1'),
  ('SKU-SVC-MAINT',  'Annual Maintenance Service',              'Accessories',     200,   480,   0,  0, 'SUP-004', 'Service');

-- ---------------------------------------------------------------------------
-- 3. orders
-- ---------------------------------------------------------------------------
insert into orders (id, customer_id, product_id, amount, status, date) values
  ('ORD-2026-0081', 'CUST-0001', 'SKU-7KW-001',  3399, 'Completed',   '2026-05-02'),
  ('ORD-2026-0080', 'CUST-0002', 'SKU-22KW-001', 8800, 'In Progress', '2026-05-01'),
  ('ORD-2026-0079', 'CUST-0003', 'SKU-7KW-001',  3399, 'Pending',     '2026-04-30'),
  ('ORD-2026-0078', 'CUST-0004', 'SKU-22KW-001', 8800, 'Completed',   '2026-04-29'),
  ('ORD-2026-0077', 'CUST-0005', 'SKU-7KW-001',  3399, 'Cancelled',   '2026-04-28'),
  ('ORD-2026-0076', 'CUST-0006', 'SKU-7KW-001',  3399, 'Completed',   '2026-04-27'),
  ('ORD-2026-0075', 'CUST-0008', 'SKU-22KW-001', 8800, 'In Progress', '2026-04-26');

-- ---------------------------------------------------------------------------
-- 4. installations
-- ---------------------------------------------------------------------------
insert into installations (id, customer_id, product_id, tech, scheduled, status) values
  ('INS-0124', 'CUST-0001', 'SKU-7KW-001',  'Zulkifli A.', '2026-05-05', 'Pending'),
  ('INS-0123', 'CUST-0002', 'SKU-22KW-001', 'Ramesh K.',   '2026-05-04', 'In Progress'),
  ('INS-0122', 'CUST-0003', 'SKU-7KW-001',  'David T.',    '2026-05-03', 'Completed'),
  ('INS-0121', 'CUST-0004', 'SKU-22KW-001', 'Zulkifli A.', '2026-05-02', 'Completed'),
  ('INS-0120', 'CUST-0005', 'SKU-7KW-001',  'Ramesh K.',   '2026-05-01', 'Overdue'),
  ('INS-0119', 'CUST-0006', 'SKU-7KW-001',  'David T.',    '2026-04-30', 'Completed');

-- ---------------------------------------------------------------------------
-- 5. invoices
-- ---------------------------------------------------------------------------
insert into invoices (id, customer_id, line_items, discount, tax, notes, status, issue_date, due_date) values
  ('INV-2026-0081', 'CUST-0001', '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399}]'::jsonb,                0, 8, NULL,                          'Paid',      '2026-05-02', '2026-05-16'),
  ('INV-2026-0080', 'CUST-0002', '[{"product_id":"SKU-22KW-001","qty":1,"unit_price_snapshot":8800}]'::jsonb,               0, 8, NULL,                          'Sent',      '2026-05-01', '2026-05-15'),
  ('INV-2026-0079', 'CUST-0003', '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399}]'::jsonb,                0, 8, NULL,                          'Draft',     '2026-04-30', '2026-05-14'),
  ('INV-2026-0078', 'CUST-0004', '[{"product_id":"SKU-22KW-001","qty":2,"unit_price_snapshot":8800}]'::jsonb,               5, 8, 'Office carpark 2 bays.',      'Paid',      '2026-04-29', '2026-05-13'),
  ('INV-2026-0077', 'CUST-0005', '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399}]'::jsonb,                0, 8, NULL,                          'Cancelled', '2026-04-28', '2026-05-12'),
  ('INV-2026-0076', 'CUST-0006', '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399}]'::jsonb,                0, 8, NULL,                          'Paid',      '2026-04-27', '2026-05-11'),
  ('INV-2026-0075', 'CUST-0008', '[{"product_id":"SKU-22KW-001","qty":1,"unit_price_snapshot":8800}]'::jsonb,               0, 8, NULL,                          'Overdue',   '2026-04-26', '2026-05-10');

-- ---------------------------------------------------------------------------
-- 6. quotes
-- ---------------------------------------------------------------------------
insert into quotes (id, type, customer_id, line_items, discount, notes, status, valid_from, valid_to) values
  ('Q-2026-014', 'Quotation', 'CUST-0007',
    '[{"product_id":"SKU-DC50-001","qty":2,"unit_price_snapshot":22500},{"product_id":"SKU-LB-SMART","qty":2,"unit_price_snapshot":750}]'::jsonb,
    7, 'Phase 1 of fleet rollout — 2x DC fast at depot.', 'Sent', '2026-04-25', '2026-05-25'),
  ('Q-2026-013', 'Proposal',  'CUST-0004',
    '[{"product_id":"SKU-22KW-001","qty":4,"unit_price_snapshot":8800},{"product_id":"SKU-LB-SMART","qty":4,"unit_price_snapshot":750}]'::jsonb,
    5, 'Cyberjaya HQ retrofit, 4 bays.',                'Viewed',   '2026-04-20', '2026-05-20'),
  ('Q-2026-012', 'Quotation', 'CUST-0002',
    '[{"product_id":"SKU-22KW-001","qty":3,"unit_price_snapshot":8800}]'::jsonb,
    0, NULL,                                            'Accepted', '2026-04-15', '2026-05-15'),
  ('Q-2026-011', 'Quotation', 'CUST-0006',
    '[{"product_id":"SKU-7KW-001","qty":2,"unit_price_snapshot":3399}]'::jsonb,
    0, NULL,                                            'Draft',    '2026-04-30', '2026-05-30'),
  ('Q-2026-010', 'Proposal',  'CUST-0005',
    '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399}]'::jsonb,
    0, NULL,                                            'Declined', '2026-04-05', '2026-05-05'),
  ('Q-2026-009', 'Quotation', 'CUST-0003',
    '[{"product_id":"SKU-7KW-001","qty":1,"unit_price_snapshot":3399},{"product_id":"SKU-CABLE-T2","qty":1,"unit_price_snapshot":220}]'::jsonb,
    0, NULL,                                            'Expired',  '2026-03-01', '2026-04-01');

-- ---------------------------------------------------------------------------
-- 7. purchase_orders (outgoing → suppliers, incoming → customers)
-- ---------------------------------------------------------------------------
insert into purchase_orders (id, direction, supplier_id, customer_id, line_items, discount, notes, external_ref, status, created_date, delivery_date) values
  ('PO-OUT-2026-0042', 'outgoing', 'SUP-001', NULL,
    '[{"product_id":"SKU-7KW-001","qty":20,"unit_price_snapshot":2200},{"product_id":"SKU-CABLE-T2","qty":40,"unit_price_snapshot":120}]'::jsonb,
    3, 'Q2 stock replenishment.', 'EVDB-Q2-2026',  'Approved',  '2026-04-15', '2026-05-15'),
  ('PO-OUT-2026-0041', 'outgoing', 'SUP-002', NULL,
    '[{"product_id":"SKU-ENCL-IP67","qty":50,"unit_price_snapshot":220},{"product_id":"SKU-LB-SMART","qty":15,"unit_price_snapshot":380}]'::jsonb,
    0, NULL,                       'SE-PO-99821',  'Submitted', '2026-04-22', '2026-05-22'),
  ('PO-OUT-2026-0040', 'outgoing', 'SUP-003', NULL,
    '[{"product_id":"SKU-RCBO-32A","qty":200,"unit_price_snapshot":55},{"product_id":"SKU-RCBO-63A","qty":80,"unit_price_snapshot":95}]'::jsonb,
    5, NULL,                       'HAG-2026-114', 'Received',  '2026-04-02', '2026-04-18'),
  ('PO-OUT-2026-0039', 'outgoing', 'SUP-006', NULL,
    '[{"product_id":"SKU-DC50-001","qty":4,"unit_price_snapshot":16000}]'::jsonb,
    2, 'Long lead — confirm shipping window.', 'SIE-MY-7782', 'Draft', '2026-04-28', '2026-06-30'),
  ('PO-IN-2026-0017',  'incoming', NULL, 'CUST-0007',
    '[{"product_id":"SKU-22KW-001","qty":10,"unit_price_snapshot":8800}]'::jsonb,
    0, 'Phase 2 fleet rollout.',   'YTL-PO-44021', 'Approved',  '2026-04-18', '2026-05-30'),
  ('PO-IN-2026-0016',  'incoming', NULL, 'CUST-0004',
    '[{"product_id":"SKU-22KW-001","qty":4,"unit_price_snapshot":8800},{"product_id":"SKU-LB-SMART","qty":4,"unit_price_snapshot":750}]'::jsonb,
    5, NULL,                       'TC-2026-099',  'Submitted', '2026-04-21', '2026-05-21');

-- ---------------------------------------------------------------------------
-- 8. posts (social media planner)
-- ---------------------------------------------------------------------------
insert into posts (id, platform, title, caption, type, status, scheduled_at, media_url) values
  ('POST-001', 'Instagram', 'New 22kW Commercial Charger', 'Powering Malaysian businesses, one bay at a time. ⚡ #VoltaraEV',                    'Product Highlight',     'Scheduled',     '2026-05-05T10:00:00+08:00', NULL),
  ('POST-002', 'LinkedIn',  'YTL PowerSeraya partnership',  'Excited to announce our fleet electrification rollout with YTL PowerSeraya.',       'Company Update',        'Scheduled',     '2026-05-06T09:00:00+08:00', NULL),
  ('POST-003', 'Facebook',  'Bangsar install spotlight',    'Another happy Voltara customer — 7kW home charger live in Bangsar.',                'Installation Story',    'Published',     '2026-05-02T14:00:00+08:00', NULL),
  ('POST-004', 'TikTok',    'How a 22kW install works',     'Watch our team commission a commercial 22kW unit in under 4 hours.',                'Educational',           'Draft',         '2026-05-08T18:00:00+08:00', NULL),
  ('POST-005', 'Instagram', 'Customer testimonial — Priya', '“Voltara made our office EV rollout simple.” — Priya R., Cyberjaya',                'Testimonial',           'Needs Review',  '2026-05-07T11:00:00+08:00', NULL),
  ('POST-006', 'LinkedIn',  'Energy savings deep-dive',     'Smart load balancing means lower peak demand charges. Read our breakdown.',         'Educational',           'Scheduled',     '2026-05-09T09:00:00+08:00', NULL);
