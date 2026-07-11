CREATE TABLE public.recipe_size_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_size_id UUID NOT NULL REFERENCES public.recipe_sizes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (recipe_size_id, inventory_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_size_ingredients TO authenticated;
GRANT ALL ON public.recipe_size_ingredients TO service_role;

ALTER TABLE public.recipe_size_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view size ingredients"
  ON public.recipe_size_ingredients FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can manage size ingredients"
  ON public.recipe_size_ingredients FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_recipe_size_ingredients_updated_at
  BEFORE UPDATE ON public.recipe_size_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();