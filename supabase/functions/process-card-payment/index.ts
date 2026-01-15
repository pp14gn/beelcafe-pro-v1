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
  pos_id?: string;
  terminal_id?: string;
  customer_id?: string;
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

    // Validate required fields for Point API
    if (!paymentData.terminal_id) {
      console.error('Terminal ID is required for Point payments');
      return new Response(JSON.stringify({ 
        error: 'Terminal ID is required for Point payments. Please configure MercadoPago Point in Settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create order with MercadoPago Point API according to official documentation
    const mercadoPagoPayload = {
      type: "point",
      external_reference: `order_${paymentData.user_id}_${Date.now()}`,
      expiration_time: "PT30M", // 30 minutes expiration
      transactions: {
        payments: [{
          amount: paymentData.amount.toFixed(2)
        }]
      },
      config: {
        point: {
          // Use the actual terminal_id from the request
          terminal_id: paymentData.terminal_id,
          print_on_terminal: "no_ticket"
        },
        payment_method: {
          default_type: "credit_card"
        }
      },
      description: paymentData.description,
      integration_data: {
        platform_id: "dev_beelcafe",
        integrator_id: "dev_beelcafe"
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
      const { data: sale, error: salesError } = await supabase
        .from('sales')
        .insert({
          user_id: paymentData.user_id,
          shift_id: paymentData.shift_id,
          total_amount: paymentData.amount,
          payment_method: 'card',
          items: paymentData.items,
          customer_id: paymentData.customer_id || null,
        })
        .select('id')
        .single();

      if (salesError) {
        console.error('Error recording sale:', salesError);
        // Payment was successful but database recording failed.
        // Keep returning success for the payment request, but we can't award points without a sale row.
      }

      // Award loyalty points (server-side) when a customer is linked to the sale
      if (paymentData.customer_id && sale?.id) {
        try {
          // Load loyalty settings for this user (falls back to defaults)
          let loyaltyEnabled = true;
          let loyaltyPointsPerDollar = 1;

          const { data: settingsRow, error: settingsError } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('user_id', paymentData.user_id)
            .maybeSingle();

          if (settingsError) {
            console.error('Error loading user settings:', settingsError);
          } else if (settingsRow?.settings) {
            const s: any = settingsRow.settings;
            if (typeof s.loyaltyEnabled === 'boolean') loyaltyEnabled = s.loyaltyEnabled;
            if (s.loyaltyPointsPerDollar !== undefined) {
              const parsed = Number(s.loyaltyPointsPerDollar);
              if (!Number.isNaN(parsed)) loyaltyPointsPerDollar = parsed;
            }
          }

          if (loyaltyEnabled) {
            const { data: customerRow, error: customerError } = await supabase
              .from('customers')
              .select('id, name, points, total_spent, visit_count, birthday, membership_tier')
              .eq('id', paymentData.customer_id)
              .single();

            if (customerError || !customerRow) {
              console.error('Error loading customer for loyalty:', customerError);
            } else {
              const currentTier = customerRow.membership_tier || (Number(customerRow.total_spent) >= 100 ? 'gold' : Number(customerRow.total_spent) >= 50 ? 'silver' : 'bronze');
              const tierMultiplier = currentTier === 'gold' ? 1.5 : currentTier === 'silver' ? 1.25 : 1;

              // Load active events
              let eventMultiplier = 1;
              const nowIso = new Date().toISOString();
              const { data: activeEvents, error: eventsError } = await supabase
                .from('loyalty_events')
                .select('multiplier, event_type')
                .eq('is_active', true)
                .lte('start_date', nowIso)
                .gte('end_date', nowIso);

              if (eventsError) {
                console.error('Error loading loyalty events:', eventsError);
              }

              const today = new Date();
              const customerBirthday = customerRow.birthday ? new Date(customerRow.birthday) : null;
              const isBirthday = !!customerBirthday &&
                customerBirthday.getMonth() === today.getMonth() &&
                customerBirthday.getDate() === today.getDate();

              (activeEvents || []).forEach((event: any) => {
                const multiplier = Number(event.multiplier) || 1;
                if (event.event_type === 'birthday') {
                  if (isBirthday) eventMultiplier = Math.max(eventMultiplier, multiplier);
                  return;
                }
                if (event.event_type === 'multiplier' || event.event_type === 'bonus') {
                  eventMultiplier = Math.max(eventMultiplier, multiplier);
                }
              });

              const basePoints = Math.floor(paymentData.amount * loyaltyPointsPerDollar);
              const earnedPoints = Math.floor(basePoints * tierMultiplier * eventMultiplier);

              const newTotalSpent = Number(customerRow.total_spent) + Number(paymentData.amount);
              const newTier = newTotalSpent >= 100 ? 'gold' : newTotalSpent >= 50 ? 'silver' : 'bronze';

              const { error: updateError } = await supabase
                .from('customers')
                .update({
                  points: Number(customerRow.points) + earnedPoints,
                  total_spent: newTotalSpent,
                  visit_count: Number(customerRow.visit_count) + 1,
                  membership_tier: newTier,
                })
                .eq('id', customerRow.id);

              if (updateError) {
                console.error('Error updating customer loyalty:', updateError);
              } else {
                const { error: txError } = await supabase
                  .from('customer_transactions')
                  .insert({
                    customer_id: customerRow.id,
                    type: 'earn',
                    points: earnedPoints,
                    sale_id: sale.id,
                    description: `Earned ${earnedPoints} pts from $${Number(paymentData.amount).toFixed(2)} card purchase`,
                  });

                if (txError) {
                  console.error('Error inserting customer transaction:', txError);
                }
              }
            }
          }
        } catch (loyaltyError) {
          console.error('Error applying loyalty points:', loyaltyError);
        }
      }

      // Process inventory updates using existing edge function
      try {
        const { error: inventoryError } = await supabase.functions.invoke('process-sale-inventory', {
          body: { items: paymentData.items },
        });

        if (inventoryError) {
          console.error('Error updating inventory:', inventoryError);
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