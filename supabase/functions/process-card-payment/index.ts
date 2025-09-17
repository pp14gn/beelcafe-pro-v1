import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const mercadoPagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  description: string;
  email?: string;
  installments?: number;
  user_id: string;
  shift_id?: string;
  items: any[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const paymentData: PaymentRequest = await req.json();
    console.log('Processing card payment:', paymentData);

    // Create order with MercadoPago Point API
    const mercadoPagoPayload = {
      type: "on-device",
      processing_mode: "automatic",
      intent: "capture",
      payer: {
        email: paymentData.email || 'customer@example.com',
      },
      order: {
        type: "payment_order",
        preference: {
          items: [{
            id: "item-ID-1234",
            title: paymentData.description,
            category_id: "others",
            quantity: 1,
            unit_price: paymentData.amount,
          }],
          back_urls: {
            success: "https://success.com/success",
            failure: "https://failure.com/failure",
            pending: "https://pending.com/pending"
          },
          auto_return: "approved",
          payment_methods: {
            installments: paymentData.installments || 1,
            default_installments: paymentData.installments || 1
          }
        }
      }
    };

    console.log('MercadoPago Point payload:', mercadoPagoPayload);

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${paymentData.user_id}-${Date.now()}`,
      },
      body: JSON.stringify(mercadoPagoPayload),
    });

    const mercadoPagoResult = await mercadoPagoResponse.json();
    console.log('MercadoPago response:', mercadoPagoResult);

    if (!mercadoPagoResponse.ok) {
      console.error('MercadoPago error:', mercadoPagoResult);
      return new Response(JSON.stringify({ 
        error: 'Payment processing failed', 
        details: mercadoPagoResult 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if order was created successfully
    if (mercadoPagoResult.id) {
      // Initialize Supabase client
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Record the sale in database
      const { error: salesError } = await supabase
        .from('sales')
        .insert({
          user_id: paymentData.user_id,
          shift_id: paymentData.shift_id,
          total_amount: paymentData.amount,
          payment_method: 'card',
          items: paymentData.items,
        });

      if (salesError) {
        console.error('Error recording sale:', salesError);
        // Payment was successful but database recording failed
        // You might want to implement a retry mechanism or manual reconciliation
      }

      // Process inventory updates using existing edge function
      try {
        const inventoryResponse = await fetch(`${supabaseUrl}/functions/v1/process-sale-inventory`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: paymentData.items,
          }),
        });

        if (!inventoryResponse.ok) {
          console.error('Error updating inventory:', await inventoryResponse.text());
        }
      } catch (inventoryError) {
        console.error('Inventory update error:', inventoryError);
      }

      return new Response(JSON.stringify({
        success: true,
        order_id: mercadoPagoResult.id,
        status: mercadoPagoResult.order_status || 'created',
        qr_code: mercadoPagoResult.qr_code,
        in_store_order_id: mercadoPagoResult.in_store_order_id,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Order creation failed
      return new Response(JSON.stringify({
        success: false,
        error: 'Order creation failed',
        details: mercadoPagoResult,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Error in process-card-payment function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);