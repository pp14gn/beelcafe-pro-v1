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
  payment_method_id: string;
  token: string;
  issuer_id?: string;
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

    // Create payment with MercadoPago
    const mercadoPagoPayload = {
      transaction_amount: paymentData.amount,
      token: paymentData.token,
      description: paymentData.description,
      installments: paymentData.installments || 1,
      payment_method_id: paymentData.payment_method_id,
      issuer_id: paymentData.issuer_id,
      payer: {
        email: paymentData.email || 'customer@example.com',
      },
    };

    console.log('MercadoPago payload:', mercadoPagoPayload);

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/v1/payments', {
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

    // Check if payment was approved
    if (mercadoPagoResult.status === 'approved') {
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
        payment_id: mercadoPagoResult.id,
        status: mercadoPagoResult.status,
        payment_method: mercadoPagoResult.payment_method_id,
        transaction_amount: mercadoPagoResult.transaction_amount,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Payment was not approved
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment not approved',
        status: mercadoPagoResult.status,
        status_detail: mercadoPagoResult.status_detail,
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