alter table supplier_categories add column kind text not null default 'Supplier' check (kind in ('Supplier', 'Vendor', 'Contractor'));
alter table supplier_categories drop constraint supplier_categories_pkey;
alter table supplier_categories add primary key (name, kind);
