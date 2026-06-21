-- Run this in Supabase SQL Editor to see what columns you have

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('users', 'media_assets', 'announcements', 'sponsors')
order by table_name, ordinal_position;
