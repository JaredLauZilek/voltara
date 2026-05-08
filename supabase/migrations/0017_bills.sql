create table bills (
  id             text primary key,
  bill_date      date not null,
  due_date       date,
  category       text not null check (category in (
    'Materials','Installation','Labour','Equipment','Transport',
    'Subcontractor','Professional Fees','Utilities','Maintenance','Other'
  )),
  vendor         text not null,
  vendor_email   text,
  supplier_id    text references suppliers(id) on delete set null,
  quote_id       text references quotes(id) on delete set null,
  amount         numeric(12,2) not null check (amount >= 0),
  tax            numeric(12,2) not null default 0 check (tax >= 0),
  payment_method text check (payment_method in ('Cash','Bank Transfer','Credit Card','Cheque','Other')),
  reference      text,
  status         text not null default 'Unpaid' check (status in ('Unpaid','Paid','Overdue','Disputed')),
  paid_on        date,
  attachments    jsonb not null default '[]'::jsonb,
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_bills_date     on bills(bill_date desc);
create index idx_bills_status   on bills(status);
create index idx_bills_category on bills(category);

alter table bills enable row level security;
create policy "allow all" on bills for all using (true) with check (true);
