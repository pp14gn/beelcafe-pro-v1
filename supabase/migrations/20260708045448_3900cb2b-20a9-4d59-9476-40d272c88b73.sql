
CREATE TABLE public.online_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('pickup','delivery')),
  pickup_time TIMESTAMPTZ,
  delivery_address TEXT,
  delivery_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('counter','online_card')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','preparing','ready','completed','cancelled')),
  source TEXT NOT NULL DEFAULT 'web',
  fulfilled_by UUID REFERENCES public.users(id),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.online_orders TO authenticated;
GRANT ALL ON public.online_orders TO service_role;

ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view online orders"
  ON public.online_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can update online orders"
  ON public.online_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_online_orders_updated_at
  BEFORE UPDATE ON public.online_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_online_orders_status ON public.online_orders(status);
CREATE INDEX idx_online_orders_created_at ON public.online_orders(created_at DESC);
CREATE INDEX idx_online_orders_payment_reference ON public.online_orders(payment_reference);

ALTER PUBLICATION supabase_realtime ADD TABLE public.online_orders;
ALTER TABLE public.online_orders REPLICA IDENTITY FULL;
