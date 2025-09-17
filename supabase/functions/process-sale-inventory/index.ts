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
      // Get recipe ingredients
      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity,
          inventory_item_id,
          inventory_items (
            current_stock,
            name
          )
        `)
        .eq('recipe_id', item.id)

      if (ingredientsError) {
        console.error('Error fetching recipe ingredients:', ingredientsError)
        continue
      }

      // Deduct inventory for each recipe ingredient
      for (const ingredient of recipeIngredients || []) {
        const totalUsed = Number(ingredient.quantity) * item.quantity
        const currentStock = Number(ingredient.inventory_items?.current_stock || 0)
        const newStock = Math.max(0, currentStock - totalUsed)

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ current_stock: newStock })
          .eq('id', ingredient.inventory_item_id)

        if (updateError) {
          console.error('Error updating inventory:', updateError)
        } else {
          console.log(`Updated ${ingredient.inventory_items?.name}: ${currentStock} -> ${newStock}`)
        }
      }

      // Process modifiers if they exist
      if (item.selectedModifiers) {
        for (const modifier of item.selectedModifiers) {
          const modifierQuantity = Number(modifier.quantity) * item.quantity
          
          // Get current stock for this modifier inventory item
          const { data: inventoryItem, error: inventoryError } = await supabase
            .from('inventory_items')
            .select('current_stock, name')
            .eq('id', modifier.inventory_item.id)
            .single()

          if (inventoryError) {
            console.error('Error fetching modifier inventory:', inventoryError)
            continue
          }

          const currentStock = Number(inventoryItem.current_stock || 0)
          const newStock = Math.max(0, currentStock - modifierQuantity)

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