-- Remove redundant supply_entries table if a prior migration created it (consolidated into Inventory Custodian + requisitions).
DROP TABLE IF EXISTS public.supply_entries CASCADE;

NOTIFY pgrst, 'reload schema';
