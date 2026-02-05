import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

      // Deduct inventory for each recipe ingredient
      for (const ingredient of recipeIngredients || []) {
        // Recipe quantities are in usage units, need to convert to stock units
        const usagePerStock = Number(ingredient.inventory_items?.usage_per_stock_unit || 1)
        const recipeQtyInUsageUnits = Number(ingredient.quantity) * item.quantity
        
        // Convert usage units to stock units (e.g., 20g recipe * 2 items = 40g → 0.04kg if 1000 g/kg)
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
          console.log(`Updated ${ingredient.inventory_items?.name}: ${currentStock} -> ${newStock} (used ${recipeQtyInUsageUnits} usage units = ${totalUsedInStockUnits} stock units)`)
        }
      }

      // Process modifiers if they exist
      if (item.selectedModifiers) {
        for (const modifier of item.selectedModifiers) {
          // Get current stock and conversion factor for this modifier inventory item
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('current_stock, name, usage_per_stock_unit')
            .eq('id', modifier.inventory_item.id)
            .single()

          if (inventoryError) {
            console.error('Error fetching modifier inventory:', inventoryError)
            continue
          }

          // Convert modifier quantity from usage units to stock units
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
            console.log(`Updated modifier ${inventoryItem.name}: ${currentStock} -> ${newStock} (used ${modifierQtyInUsageUnits} usage units = ${modifierQtyInStockUnits} stock units)`)
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