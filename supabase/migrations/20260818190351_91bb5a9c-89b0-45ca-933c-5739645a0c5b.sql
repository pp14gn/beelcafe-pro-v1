ALTER TABLE public.uber_eats_config
  ADD COLUMN IF NOT EXISTS integrator_store_id text,
  ADD COLUMN IF NOT EXISTS integrator_brand_id text,
  ADD COLUMN IF NOT EXISTS pos_integration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_manager text,
  ADD COLUMN IF NOT EXISTS activation_status text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;