delete from public.room_items
where asset_key like 'cushion-%'
  and asset_key <> 'cushion-basic';
