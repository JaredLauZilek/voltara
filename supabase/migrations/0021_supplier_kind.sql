alter table suppliers add column kind text not null default 'Supplier' check (kind in ('Supplier', 'Vendor', 'Contractor'));
