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

    const [{ data: categories }, { data: recipes }, { data: sizes }] = await Promise.all([
      supabase.from("categories").select("id, name").order("name"),
      supabase
        .from("recipes")
        .select("id, name, description, price, category_id, photo_url, is_available")
        .eq("is_available", true)
        .order("name"),
      supabase.from("recipe_sizes").select("id, recipe_id, name, price_adjustment, ingredient_multiplier"),
    ]);

    return new Response(
      JSON.stringify({
        categories: categories ?? [],
        recipes: recipes ?? [],
        sizes: sizes ?? [],
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