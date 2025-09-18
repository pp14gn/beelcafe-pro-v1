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

    const { orderId } = await req.json()

    // Get the order details first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Error fetching order:', orderError)
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Only allow refunds for pending orders
    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Only pending orders can be refunded' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Restore inventory for each item in the order
    for (const item of order.items) {
      // Get recipe ingredients and restore stock
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

      // Restore inventory for each recipe ingredient
      for (const ingredient of recipeIngredients || []) {
        const totalUsed = Number(ingredient.quantity) * item.quantity
        const currentStock = Number(ingredient.inventory_items?.current_stock || 0)
        const newStock = currentStock + totalUsed

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ current_stock: newStock })
          .eq('id', ingredient.inventory_item_id)

        if (updateError) {
          console.error('Error restoring inventory:', updateError)
        } else {
          console.log(`Restored ${ingredient.inventory_items?.name}: ${currentStock} -> ${newStock}`)
        }
      }

      // Restore modifiers if they exist
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
          const newStock = currentStock + modifierQuantity

          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ current_stock: newStock })
            .eq('id', modifier.inventory_item.id)

          if (updateError) {
            console.error('Error restoring modifier inventory:', updateError)
          } else {
            console.log(`Restored modifier ${inventoryItem.name}: ${currentStock} -> ${newStock}`)
          }
        }
      }
    }

    // Mark order as cancelled
    const { error: cancelError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        completion_time: new Date().toISOString()
      })
      .eq('id', orderId)

    if (cancelError) {
      console.error('Error cancelling order:', cancelError)
      return new Response(
        JSON.stringify({ error: 'Failed to cancel order' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Remove the sale from sales table if it exists
    const { error: salesError } = await supabase
      .from('sales')
      .delete()
      .eq('shift_id', order.shift_id)
      .eq('total_amount', order.total_amount)
      .eq('created_at', order.created_at)

    if (salesError) {
      console.error('Error removing sale:', salesError)
      // Don't fail the refund if we can't remove the sale record
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Order refunded successfully and inventory restored' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing order refund:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})