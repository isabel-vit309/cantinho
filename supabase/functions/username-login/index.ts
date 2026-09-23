import { withSupabase } from 'npm:@supabase/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const invalidCredentials = () => Response.json({ error: 'Nome ou senha incorretos.' }, { status: 401 })

const handleLogin = withSupabase({ auth: 'publishable' }, async (request, context) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: { username?: unknown; password?: unknown }
  try { body = await request.json() } catch { return invalidCredentials() }

  const username = typeof body.username === 'string' ? body.username.trim().toLocaleLowerCase('pt-BR') : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const profileName = username === 'bia' ? 'Bia' : ['isa', 'isabel'].includes(username) ? 'Isabel' : null
  if (!profileName || !password || password.length > 1024) return invalidCredentials()

  // Look up the account email only on the server. It is never returned to the browser.
  const { data: profile, error: profileError } = await context.supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('display_name', profileName)
    .maybeSingle()
  if (profileError || !profile) return invalidCredentials()

  const { data: userResult, error: userError } = await context.supabaseAdmin.auth.admin.getUserById(profile.id)
  const email = userResult.user?.email
  if (userError || !email) return invalidCredentials()

  // Exchange the supplied password through Supabase Auth. Publishable keys belong in
  // the apikey header; these keys are not JWTs and must not be sent as Bearer tokens.
  const projectUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
  const publishableKey = publishableKeys.default
  if (!projectUrl || !publishableKey) return Response.json({ error: 'Login is not configured.' }, { status: 500 })

  const authResponse = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: publishableKey },
    body: JSON.stringify({ email, password }),
  })
  if (!authResponse.ok) return invalidCredentials()

  const session = await authResponse.json()
  return Response.json({ access_token: session.access_token, refresh_token: session.refresh_token })
})

export default {
  fetch: async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    const response = await handleLogin(request)
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value)
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  },
}
