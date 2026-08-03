-- Extend online_orders for external marketplace orders
ALTER TABLE public.online_orders
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS external_display_id text,
  ADD COLUMN IF NOT EXISTS external_state text,
  ADD COLUMN IF NOT EXISTS external_payload jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS online_orders_external_unique
  ON public.online_orders (external_provider, external_order_id)
  WHERE external_order_id IS NOT NULL;

ALTER TABLE public.online_orders DROP CONSTRAINT IF EXISTS online_orders_payment_method_check;
ALTER TABLE public.online_orders ADD CONSTRAINT online_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['counter'::text, 'online_card'::text, 'uber_eats'::text]));

ALTER TABLE public.online_orders DROP CONSTRAINT IF EXISTS online_orders_status_check;
ALTER TABLE public.online_orders ADD CONSTRAINT online_orders_status_check
  CHECK (status = ANY (ARRAY['new'::text, 'accepted'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text, 'denied'::text]));

-- Uber Eats configuration (single row)
CREATE TABLE IF NOT EXISTS public.uber_eats_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text,
  store_name text,
  is_enabled boolean NOT NULL DEFAULT false,
  auto_accept_orders boolean NOT NULL DEFAULT false,
  store_status text NOT NULL DEFAULT 'OFFLINE',
  last_menu_sync_at timestamptz,
  last_menu_sync_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uber_eats_config TO authenticated;
GRANT ALL ON public.uber_eats_config TO service_role;

ALTER TABLE public.uber_eats_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view uber eats config"
  ON public.uber_eats_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can insert uber eats config"
  ON public.uber_eats_config FOR INSERT TO authenticated
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY "Managers can update uber eats config"
  ON public.uber_eats_config FOR UPDATE TO authenticated
  USING (public.get_current_user_role() = ANY (ARRAY['admin','manager']))
  WITH CHECK (public.get_current_user_role() = ANY (ARRAY['admin','manager']));

CREATE TRIGGER update_uber_eats_config_updated_at
  BEFORE UPDATE ON public.uber_eats_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync log
CREATE TABLE IF NOT EXISTS public.uber_eats_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  message text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.uber_eats_sync_log TO authenticated;
GRANT ALL ON public.uber_eats_sync_log TO service_role;

ALTER TABLE public.uber_eats_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view uber eats sync log"
  ON public.uber_eats_sync_log FOR SELECT TO authenticated USING (true);

INSERT INTO public.uber_eats_config (is_enabled)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.uber_eats_config);