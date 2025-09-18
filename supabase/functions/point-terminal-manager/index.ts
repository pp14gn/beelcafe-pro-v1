import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TerminalRequest {
  action: 'list' | 'assign' | 'unassign';
  posId?: string;
  terminalId?: string;
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
    const { action, posId, terminalId }: TerminalRequest = await req.json();
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const baseUrl = 'https://api.mercadopago.com';
    console.log(`Terminal Manager - Action: ${action}`);

    switch (action) {
      case 'list': {
        if (!posId) {
          throw new Error('POS ID is required to list terminals');
        }

        // List terminals for a specific POS
        const response = await fetch(`${baseUrl}/pos/${posId}/terminals`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (list terminals):', errorData);
          throw new Error(`Failed to fetch terminals: ${response.status}`);
        }

        const data = await response.json();
        console.log('Terminals list retrieved successfully:', data);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'assign': {
        if (!posId || !terminalId) {
          throw new Error('POS ID and Terminal ID are required for assignment');
        }

        // Assign terminal to POS
        const payload = {
          terminal_id: terminalId,
        };

        const response = await fetch(`${baseUrl}/pos/${posId}/terminals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (assign terminal):', errorData);
          throw new Error(`Failed to assign terminal: ${response.status}`);
        }

        const data = await response.json();
        console.log('Terminal assigned successfully:', data);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unassign': {
        if (!terminalId) {
          throw new Error('Terminal ID is required for unassignment');
        }

        // Unassign terminal (remove from POS)
        // Note: This might require getting the POS ID first or using a different endpoint
        const response = await fetch(`${baseUrl}/pos/terminals/${terminalId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago API Error (unassign terminal):', errorData);
          throw new Error(`Failed to unassign terminal: ${response.status}`);
        }

        console.log('Terminal unassigned successfully');

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in point-terminal-manager:', error);
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