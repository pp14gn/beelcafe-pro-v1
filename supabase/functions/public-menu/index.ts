import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: categories }, { data: recipes }, { data: sizes }, { data: modifiers }] = await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase
        .from("recipes")
        .select("id, name, description, base_price, category, photo_url, is_active")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("recipe_sizes")
        .select("id, recipe_id, name, price_adjustment, ingredient_multiplier, is_active")
        .eq("is_active", true),
      supabase
        .from("recipe_modifiers")
        .select("id, recipe_id, quantity, is_active, inventory_item:inventory_items(id, name, unit, cost_per_unit)")
        .eq("is_active", true),
    ]);

    // Map recipes.category (text name) to a category_id for the client, matching by name.
    const catByName = new Map((categories ?? []).map((c: any) => [c.name, c.id]));
    const mappedRecipes = (recipes ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: Number(r.base_price ?? 0),
      category_id: catByName.get(r.category) ?? r.category ?? null,
      photo_url: r.photo_url,
      is_available: r.is_active,
    }));

    return new Response(
      JSON.stringify({
        categories: categories ?? [],
        recipes: mappedRecipes,
        sizes: sizes ?? [],
        modifiers: modifiers ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("public-menu error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});