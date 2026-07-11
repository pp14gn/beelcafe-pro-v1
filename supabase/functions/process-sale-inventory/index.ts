import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { items } = await req.json()

    // Process each item in the sale
    for (const item of items) {
      // Get recipe ingredients with inventory item details including unit conversion
      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity,
          inventory_item_id,
          inventory_items (
            current_stock,
            name,
            usage_per_stock_unit
          )
        `)
        .eq('recipe_id', item.id)

      if (ingredientsError) {
        console.error('Error fetching recipe ingredients:', ingredientsError)
        continue
      }

      // Get ingredient multiplier from selected size
      const sizeMultiplier = item.selectedSize?.ingredient_multiplier || 1

      // Load per-size ingredient overrides for the selected size
      let sizeOverrides: Record<string, number> = {}
      if (item.selectedSize?.id) {
        const { data: overrides, error: overridesError } = await supabase
          .from('recipe_size_ingredients')
          .select('inventory_item_id, quantity')
          .eq('recipe_size_id', item.selectedSize.id)
        if (overridesError) {
          console.error('Error fetching size ingredient overrides:', overridesError)
        } else {
          for (const o of overrides || []) {
            sizeOverrides[o.inventory_item_id] = Number(o.quantity)
          }
        }
      }

      // Apply size multiplier to ingredient deductions
      for (const ingredient of recipeIngredients || []) {
        const usagePerStock = Number(ingredient.inventory_items?.usage_per_stock_unit || 1)
        const perUnitQty = sizeOverrides[ingredient.inventory_item_id] !== undefined
          ? sizeOverrides[ingredient.inventory_item_id]
          : Number(ingredient.quantity) * sizeMultiplier
        const recipeQtyInUsageUnits = perUnitQty * item.quantity
        const totalUsedInStockUnits = recipeQtyInUsageUnits / usagePerStock
        
        const currentStock = Number(ingredient.inventory_items?.current_stock || 0)
        const newStock = Math.max(0, currentStock - totalUsedInStockUnits)

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ current_stock: newStock })
          .eq('id', ingredient.inventory_item_id)

        if (updateError) {
          console.error('Error updating inventory:', updateError)
        } else {
          console.log(`Updated ${ingredient.inventory_items?.name}: ${currentStock} -> ${newStock} (used ${recipeQtyInUsageUnits} usage units, multiplier ${sizeMultiplier})`)
        }
      }

      // Deduct cup/container from inventory if size has an inventory_item_id
      if (item.selectedSize?.id) {
        const { data: sizeData, error: sizeError } = await supabase
          .from('recipe_sizes')
          .select('inventory_item_id')
          .eq('id', item.selectedSize.id)
          .single()

        if (!sizeError && sizeData?.inventory_item_id) {
          const { data: cupItem, error: cupError } = await supabase
            .from('inventory_items')
            .select('current_stock, name, usage_per_stock_unit')
            .eq('id', sizeData.inventory_item_id)
            .single()

          if (!cupError && cupItem) {
            const usagePerStock = Number(cupItem.usage_per_stock_unit || 1)
            const cupQtyInStockUnits = item.quantity / usagePerStock
            const currentStock = Number(cupItem.current_stock || 0)
            const newStock = Math.max(0, currentStock - cupQtyInStockUnits)

            const { error: cupUpdateError } = await supabase
              .from('inventory_items')
              .update({ current_stock: newStock })
              .eq('id', sizeData.inventory_item_id)

            if (cupUpdateError) {
              console.error('Error updating cup inventory:', cupUpdateError)
            } else {
              console.log(`Deducted cup ${cupItem.name}: ${currentStock} -> ${newStock} (qty: ${item.quantity})`)
            }
          }
        }
      }

      // Process modifiers if they exist
      if (item.selectedModifiers) {
        for (const modifier of item.selectedModifiers) {
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('current_stock, name, usage_per_stock_unit')
            .eq('id', modifier.inventory_item.id)
            .single()

          if (inventoryError) {
            console.error('Error fetching modifier inventory:', inventoryError)
            continue
          }

          const usagePerStock = Number(inventoryItem.usage_per_stock_unit || 1)
          const modifierQtyInUsageUnits = Number(modifier.quantity) * item.quantity
          const modifierQtyInStockUnits = modifierQtyInUsageUnits / usagePerStock
          
          const currentStock = Number(inventoryItem.current_stock || 0)
          const newStock = Math.max(0, currentStock - modifierQtyInStockUnits)

          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ current_stock: newStock })
            .eq('id', modifier.inventory_item.id)

          if (updateError) {
            console.error('Error updating modifier inventory:', updateError)
          } else {
            console.log(`Updated modifier ${inventoryItem.name}: ${currentStock} -> ${newStock}`)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing sale inventory:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})