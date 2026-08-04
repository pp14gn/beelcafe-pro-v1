CREATE TABLE IF NOT EXISTS public.order_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift_id uuid REFERENCES public.shifts(id),
  name text NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamp with time zone,
  sale_id uuid REFERENCES public.sales(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tabs TO authenticated;
GRANT ALL ON public.order_tabs TO service_role;

ALTER TABLE public.order_tabs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view tabs" ON public.order_tabs;
CREATE POLICY "Authenticated staff can view tabs" ON public.order_tabs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated staff can create tabs" ON public.order_tabs;
CREATE POLICY "Authenticated staff can create tabs" ON public.order_tabs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated staff can update tabs" ON public.order_tabs;
CREATE POLICY "Authenticated staff can update tabs" ON public.order_tabs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_order_tabs_updated_at ON public.order_tabs;
CREATE TRIGGER update_order_tabs_updated_at
  BEFORE UPDATE ON public.order_tabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tab_id uuid REFERENCES public.order_tabs(id);
CREATE INDEX IF NOT EXISTS idx_orders_tab_id ON public.orders(tab_id);
CREATE INDEX IF NOT EXISTS idx_order_tabs_status ON public.order_tabs(status);