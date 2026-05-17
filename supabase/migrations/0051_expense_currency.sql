-- Multi-currency expenses (mirrors bills + purchase_orders pattern).
-- Some subscriptions (AWS, Google Workspace, Anthropic API, etc.) bill in
-- USD/SGD/CNY. KPIs convert to MYR via the static rate table in
-- shared/lib/currency.ts. Existing rows default to RM.

alter table expenses add column currency text not null default 'RM';
alter table expenses add constraint expenses_currency_check
  check (currency in ('RM', 'CNY', 'SGD', 'USD'));
