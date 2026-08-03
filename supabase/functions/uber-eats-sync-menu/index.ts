import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, getConfig, json, log, requireUser, uberFetch } from "../_shared/uberEats.ts";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const t = (s: string) => ({ translations: { en_us: s || "" } });
const cents = (n: number) => Math.max(0, Math.round(Number(n || 0) * 100));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const config = await getConfig();
    if (!config?.store_id) return json({ error: "Set your Uber Eats Store ID in Settings first." }, 400);

    const supabase = admin();
    const [{ data: recipes }, { data: sizes }, { data: modifiers }, { data: settingsRows }] = await Promise.all([
      supabase.from("recipes").select("id, name, description, base_price, category, photo_url").eq("is_active", true),
      supabase.from("recipe_sizes").select("id, recipe_id, name, price_adjustment, is_default, sort_order").eq("is_active", true),
      supabase
        .from("recipe_modifiers")
        .select("id, recipe_id, quantity, inventory_item:inventory_items(name, cost_per_unit)")
        .eq("is_active", true),
      supabase.from("user_settings").select("settings").limit(1),
    ]);

    const storeSettings: any = settingsRows?.[0]?.settings ?? {};
    const openTime = storeSettings.openTime || "08:00";
    const closeTime = storeSettings.closeTime || "18:00";
    const operatingDays: string[] = storeSettings.operatingDays?.length
      ? storeSettings.operatingDays
      : DAYS;

    const items: any[] = [];
    const modifierGroups: any[] = [];
    const categoryMap = new Map<string, string[]>();

    for (const r of recipes ?? []) {
      const groupIds: string[] = [];

      const recipeSizes = (sizes ?? [])
        .filter((s: any) => s.recipe_id === r.id)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      if (recipeSizes.length) {
        const gid = `size-${r.id}`;
        for (const s of recipeSizes) {
          items.push({
            id: `size-opt-${s.id}`,
            external_data: s.id,
            title: t(s.name),
            price_info: { price: cents(s.price_adjustment) },
            quantity_info: {},
            tax_info: {},
          });
        }
        modifierGroups.push({
          id: gid,
          external_data: `sizes:${r.id}`,
          title: t("Size"),
          quantity_info: { quantity: { max_permitted: 1, min_permitted: 1 } },
          modifier_options: recipeSizes.map((s: any) => ({ id: `size-opt-${s.id}`, type: "ITEM" })),
        });
        groupIds.push(gid);
      }

      const recipeMods = (modifiers ?? []).filter((m: any) => m.recipe_id === r.id);
      if (recipeMods.length) {
        const gid = `extras-${r.id}`;
        for (const m of recipeMods as any[]) {
          const price = Number(m.inventory_item?.cost_per_unit ?? 0) * Number(m.quantity ?? 0);
          items.push({
            id: `mod-opt-${m.id}`,
            external_data: m.id,
            title: t(m.inventory_item?.name ?? "Extra"),
            price_info: { price: cents(price) },
            quantity_info: {},
            tax_info: {},
          });
        }
        modifierGroups.push({
          id: gid,
          external_data: `extras:${r.id}`,
          title: t("Extras"),
          quantity_info: { quantity: { max_permitted: recipeMods.length, min_permitted: 0 } },
          modifier_options: recipeMods.map((m: any) => ({ id: `mod-opt-${m.id}`, type: "ITEM" })),
        });
        groupIds.push(gid);
      }

      items.push({
        id: r.id,
        external_data: r.id,
        title: t(r.name),
        description: t(r.description ?? ""),
        image_url: r.photo_url ?? undefined,
        price_info: { price: cents(r.base_price) },
        quantity_info: {},
        tax_info: {},
        modifier_group_ids: groupIds.length ? { ids: groupIds } : undefined,
      });

      const cat = r.category || "Menu";
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(r.id);
    }

    const categories = [...categoryMap.entries()].map(([name, ids]) => ({
      id: `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: t(name),
      entities: ids.map((id) => ({ id, type: "ITEM" })),
    }));

    const menu = {
      menus: [
        {
          id: "main-menu",
          title: t(storeSettings.storeName || "Menu"),
          subtitle: t(""),
          service_availability: operatingDays.map((d: string) => ({
            day_of_week: d.toLowerCase(),
            time_periods: [{ start_time: openTime, end_time: closeTime }],
          })),
          category_ids: categories.map((c) => c.id),
        },
      ],
      categories,
      items,
      modifier_groups: modifierGroups,
      display_options: {},
    };

    const res = await uberFetch(`/v2/eats/stores/${config.store_id}/menus`, {
      method: "PUT",
      body: JSON.stringify(menu),
    });

    const message = res.ok
      ? `Synced ${recipes?.length ?? 0} items in ${categories.length} categories`
      : `Uber Eats rejected the menu (${res.status})`;

    await log("menu_sync", res.ok, message, res.ok ? { items: items.length } : res.body);

    await admin()
      .from("uber_eats_config")
      .update({
        last_menu_sync_at: new Date().toISOString(),
        last_menu_sync_status: res.ok ? "success" : "failed",
      })
      .eq("id", config.id);

    return json({ success: res.ok, message, details: res.ok ? undefined : res.body }, res.ok ? 200 : 502);
  } catch (err: any) {
    console.error("uber-eats-sync-menu", err);
    await log("menu_sync", false, err.message);
    return json({ error: err.message }, 500);
  }
});