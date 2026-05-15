-- Optional time-of-day on installations.
-- UI restricts user input to 30-minute increments, but the column is a
-- standard `time` so manually-entered odd minutes still work if needed.
alter table installations add column if not exists scheduled_time time;
comment on column installations.scheduled_time is 'Optional time-of-day for the installation. UI restricts to 30-minute increments.';
