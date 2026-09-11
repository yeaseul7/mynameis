delete from public.room_items
where asset_key like 'window-%'
  and asset_key not in ('window-basic-tall', 'window-basic-wide');
