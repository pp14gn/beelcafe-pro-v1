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
    const { action, store, storeId } = await req.json();
    
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const baseUrl = 'https://api.mercadopago.com';
    
    console.log(`Processing store ${action} request`);

    switch (action) {
      case 'create': {
        console.log('Creating store:', store);
        
        const response = await fetch(`${baseUrl}/stores`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: store.name,
            external_id: store.external_id,
            business_hours: store.business_hours
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago store creation error:', errorData);
          throw new Error(`Failed to create store: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Store created successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        console.log('Listing stores');
        
        const response = await fetch(`${baseUrl}/stores/search`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago stores list error:', errorData);
          throw new Error(`Failed to list stores: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Stores listed successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, results: result.results || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        if (!storeId) {
          throw new Error('Store ID is required for get action');
        }
        
        console.log('Getting store:', storeId);
        
        const response = await fetch(`${baseUrl}/stores/${storeId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago store get error:', errorData);
          throw new Error(`Failed to get store: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Store retrieved successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!storeId) {
          throw new Error('Store ID is required for update action');
        }
        
        console.log('Updating store:', storeId, store);
        
        const response = await fetch(`${baseUrl}/stores/${storeId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: store.name,
            external_id: store.external_id,
            business_hours: store.business_hours
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago store update error:', errorData);
          throw new Error(`Failed to update store: ${response.status} ${errorData}`);
        }

        const result = await response.json();
        console.log('Store updated successfully:', result);
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!storeId) {
          throw new Error('Store ID is required for delete action');
        }
        
        console.log('Deleting store:', storeId);
        
        const response = await fetch(`${baseUrl}/stores/${storeId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error('MercadoPago store delete error:', errorData);
          throw new Error(`Failed to delete store: ${response.status} ${errorData}`);
        }

        console.log('Store deleted successfully');
        
        return new Response(
          JSON.stringify({ success: true, message: 'Store deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Store manager error:', error);
    
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