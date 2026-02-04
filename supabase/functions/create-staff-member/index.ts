import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateStaffRequest {
  email: string
  password: string
  username: string
  full_name: string
  role: 'cashier' | 'manager' | 'admin'
  picture_url?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a client with the user's token to verify they're an admin/manager
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the requesting user's profile to check their role
    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser()
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to check the user's role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: requestingProfile, error: profileError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single()

    if (profileError || !requestingProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only admins and managers can create staff
    if (!['admin', 'manager'].includes(requestingProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only admins and managers can create staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body
    const { email, password, username, full_name, role, picture_url }: CreateStaffRequest = await req.json()

    // Validate required fields
    if (!email || !password || !username || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Managers cannot create admins
    if (requestingProfile.role === 'manager' && role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Managers cannot create admin accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the auth user using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    })

    if (authError) {
      console.error('Auth error:', authError)
      // Provide user-friendly error message for duplicate emails
      const errorMessage = authError.message.includes('already been registered')
        ? 'A user with this email address already exists. Please use a different email.'
        : authError.message
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the user profile using service role (bypasses RLS)
    const { error: profileInsertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        full_name,
        role,
        is_active: true,
        picture_url: picture_url || null,
      })

    if (profileInsertError) {
      console.error('Profile error:', profileInsertError)
      // If profile creation fails, we should clean up the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: authData.user.id,
          email: authData.user.email,
          username,
          full_name,
          role
        } 
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
