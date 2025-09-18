import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, order, orderId } = await req.json();
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const baseUrl = 'https://api.mercadopago.com';
    
    console.log(`Processing order ${action} request`);

    switch (action) {
      case 'create': {
        console.log('Creating order:', order);
        
        const response = await fetch(`${baseUrl}/instore/orders/qr/seller/collectors/${order.collector_id}/pos/${order.external_pos_id}/qrs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            external_reference: order.external_reference,
            title: order.title,
            description: order.description,
            notification_url: order.notification_url,
            total_amount: order.total_amount,
            items: order.items,
            sponsor: order.sponsor
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago order creation error:', errorData);
          throw new Error(`Failed to create order: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Order created successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!orderId) {
          throw new Error('Order ID is required for get action');
        }
        
        console.log('Getting order:', orderId);
        
        const response = await fetch(`${baseUrl}/instore/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago order get error:', errorData);
          throw new Error(`Failed to get order: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Order retrieved successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        console.log('Listing orders');
        
        // Note: MercadoPago doesn't have a direct list orders endpoint
        // This would typically be handled by storing order references in your database
        // and querying individual orders as needed
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            results: [],
            message: 'Order listing requires database integration with stored order references'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel': {
        if (!orderId) {
          throw new Error('Order ID is required for cancel action');
        }
        
        console.log('Cancelling order:', orderId);
        
        const response = await fetch(`${baseUrl}/instore/orders/${orderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago order cancel error:', errorData);
          throw new Error(`Failed to cancel order: ${response.status} ${errorData}`);
        }

        console.log('Order cancelled successfully');
        
        return new Response(
          JSON.stringify({ success: true, message: 'Order cancelled successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refund': {
        if (!orderId) {
          throw new Error('Order ID is required for refund action');
        }
        
        console.log('Processing refund for order:', orderId);
        
        // First get the payment ID from the order
        const orderResponse = await fetch(`${baseUrl}/instore/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!orderResponse.ok) {
          throw new Error('Failed to get order for refund');
        }

        const orderData = await orderResponse.json();
        const paymentId = orderData.payments?.[0]?.id;
        
        if (!paymentId) {
          throw new Error('No payment found for this order');
        }

        // Process the refund
        const refundResponse = await fetch(`${baseUrl}/v1/payments/${paymentId}/refunds`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: order?.refund_amount // Optional partial refund amount
          })
        });

        if (!refundResponse.ok) {
          const errorData = await refundResponse.text();
          console.error('MercadoPago refund error:', errorData);
          throw new Error(`Failed to process refund: ${refundResponse.status} ${errorData}`);
        }

        const refundResult = await refundResponse.json();
        console.log('Refund processed successfully:', refundResult);
        
        return new Response(
          JSON.stringify({ success: true, data: refundResult }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Order manager error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});