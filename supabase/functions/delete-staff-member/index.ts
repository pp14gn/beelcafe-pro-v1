import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: requestingProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single()

    if (!requestingProfile || !['admin', 'manager'].includes(requestingProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admins and managers can delete staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id, delete_from_auth } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if target user is an admin (only admins can delete admins)
    const { data: targetProfile } = await adminClient
      .from('users')
      .select('role, full_name')
      .eq('id', user_id)
      .single()

    if (targetProfile?.role === 'admin' && requestingProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can delete admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from users table first
    const { error: deleteProfileError } = await adminClient
      .from('users')
      .delete()
      .eq('id', user_id)

    if (deleteProfileError) {
      console.error('Profile delete error:', deleteProfileError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete from auth if requested
    if (delete_from_auth) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id)
      
      if (authDeleteError) {
        console.error('Auth delete error:', authDeleteError)
        // Profile already deleted, log warning but don't fail
        console.warn('User profile deleted but auth deletion failed')
      }
    }

    console.log(`User ${user_id} deleted successfully. Auth deleted: ${delete_from_auth}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: delete_from_auth 
          ? 'Staff member and auth account deleted successfully' 
          : 'Staff member removed (auth account preserved)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
