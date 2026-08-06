CREATE TABLE IF NOT EXISTS public.uber_eats_oauth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.uber_eats_oauth TO service_role;
ALTER TABLE public.uber_eats_oauth ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_uber_eats_oauth_updated_at ON public.uber_eats_oauth;
CREATE TRIGGER update_uber_eats_oauth_updated_at BEFORE UPDATE ON public.uber_eats_oauth
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.uber_eats_config
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorized_scopes text,
  ADD COLUMN IF NOT EXISTS auth_environment text;