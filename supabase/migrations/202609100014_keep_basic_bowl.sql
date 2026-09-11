delete from public.room_items
where asset_key like 'bowl-%'
  and asset_key <> 'bowl-basic';
