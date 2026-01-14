-- Add birthday field to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS membership_tier text NOT NULL DEFAULT 'bronze';

-- Create loyalty rewards table (redeemable items)
CREATE TABLE public.loyalty_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  points_cost integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create points multiplier events table
CREATE TABLE public.loyalty_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 2,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  event_type text NOT NULL DEFAULT 'multiplier', -- 'multiplier', 'birthday', 'bonus'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create redemption history table
CREATE TABLE public.loyalty_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  points_spent integer NOT NULL,
  redeemed_by uuid NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Loyalty rewards policies
CREATE POLICY "Authenticated users can view active rewards"
ON public.loyalty_rewards FOR SELECT
USING (auth.uid() IS NOT NULL AND (is_active = true OR get_current_user_role() = ANY (ARRAY['admin', 'manager'])));

CREATE POLICY "Managers and admins can manage rewards"
ON public.loyalty_rewards FOR ALL
USING (get_current_user_role() = ANY (ARRAY['admin', 'manager']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin', 'manager']));

-- Loyalty events policies
CREATE POLICY "Authenticated users can view active events"
ON public.loyalty_events FOR SELECT
USING (auth.uid() IS NOT NULL AND (is_active = true OR get_current_user_role() = ANY (ARRAY['admin', 'manager'])));

CREATE POLICY "Managers and admins can manage events"
ON public.loyalty_events FOR ALL
USING (get_current_user_role() = ANY (ARRAY['admin', 'manager']))
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin', 'manager']));

-- Loyalty redemptions policies
CREATE POLICY "Authenticated users can view redemptions"
ON public.loyalty_redemptions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create redemptions"
ON public.loyalty_redemptions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_loyalty_rewards_updated_at
BEFORE UPDATE ON public.loyalty_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_events_updated_at
BEFORE UPDATE ON public.loyalty_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();