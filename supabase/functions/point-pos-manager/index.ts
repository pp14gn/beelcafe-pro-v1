import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface POSRequest {
  action: 'list' | 'create' | 'delete';
  name?: string;
  category?: string;
  posId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { action, name, category, posId }: POSRequest = await req.json();
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const baseUrl = 'https://api.mercadopago.com';
    console.log(`POS Manager - Action: ${action}`);

    switch (action) {
      case 'list': {
        // List all POS
        const response = await fetch(`${baseUrl}/pos`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (list):', errorData);
          throw new Error(`Failed to fetch POS list: ${response.status}`);
        }

        const data = await response.json();
        console.log('POS list retrieved successfully:', data);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        if (!name || !category) {
          throw new Error('Name and category are required for POS creation');
        }

        // Create new POS
        const payload = {
          name,
          category,
        };

        const response = await fetch(`${baseUrl}/pos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (create):', errorData);
          throw new Error(`Failed to create POS: ${response.status}`);
        }

        const data = await response.json();
        console.log('POS created successfully:', data);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!posId) {
          throw new Error('POS ID is required for deletion');
        }

        // Delete POS
        const response = await fetch(`${baseUrl}/pos/${posId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (delete):', errorData);
          throw new Error(`Failed to delete POS: ${response.status}`);
        }

        console.log('POS deleted successfully');

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in point-pos-manager:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);