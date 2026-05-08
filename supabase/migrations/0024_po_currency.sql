alter table purchase_orders add column currency text not null default 'RM' check (currency in ('RM', 'CNY', 'SGD', 'USD'));
