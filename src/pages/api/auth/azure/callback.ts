import type { APIRoute } from 'astro'
import { azureSupabaseIntegration } from '../../../../lib/auth/azure-supabase-integration'
import { getLogger } from '../../../../lib/logging'

const logger = getLogger({ prefix: 'azure-auth-callback' })

export const GET: APIRoute = async ({ url, redirect, request }) => {
  try {
    // Get authorization code and state from query parameters
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    // Check for OAuth errors
    if (error) {
      logger.error('Azure AD OAuth error', {
        error,
        errorDescription
      })
      
      return redirect(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, 302)
    }

    // Validate required parameters
    if (!code) {
      logger.error('Missing authorization code in callback')
      return redirect('/auth/error?error=missing_code', 302)
    }

    if (!state) {
      logger.error('Missing state parameter in callback')
      return redirect('/auth/error?error=missing_state', 302)
    }

    // Validate state parameter (CSRF protection)
    const cookies = request.headers.get('cookie')
    const storedState = cookies?.split(';')
      .find(c => c.trim().startsWith('azure_auth_state='))
      ?.split('=')[1]

    if (!storedState || storedState !== state) {
      logger.error('Invalid state parameter', {
        provided: state,
        stored: storedState
      })
      return redirect('/auth/error?error=invalid_state', 302)
    }

    // Exchange code for tokens and create session
    const redirectUri = `${url.origin}/api/auth/azure/callback`
    const session = await azureSupabaseIntegration.authenticateWithAzureAD(code, redirectUri)

    logger.info('Azure AD authentication successful', {
      userId: session.user.id,
      email: session.user.email
    })

    // Create session cookies
    const sessionCookie = `pixelated_session=${JSON.stringify({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      roles: session.user.roles,
      expiresAt: session.expiresAt
    })}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor((session.expiresAt - Date.now()) / 1000)}`

    const accessTokenCookie = `pixelated_access_token=${session.accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor((session.expiresAt - Date.now()) / 1000)}`

    const refreshTokenCookie = `pixelated_refresh_token=${session.refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` // 30 days

    // Clear state cookie
    const clearStateCookie = 'azure_auth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'

    // Redirect to success page or dashboard
    const response = redirect('/dashboard', 302)
    response.headers.set('Set-Cookie', [
      sessionCookie,
      accessTokenCookie,
      refreshTokenCookie,
      clearStateCookie
    ].join(', '))

    return response

  } catch (error) {
    logger.error('Error in Azure AD callback', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    return redirect(`/auth/error?error=authentication_failed&description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, 302)
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json()
    const { code, state, redirect_uri } = body

    // Validate required parameters
    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Exchange code for tokens and create session
    const actualRedirectUri = redirect_uri || `${url.origin}/api/auth/azure/callback`
    const session = await azureSupabaseIntegration.authenticateWithAzureAD(code, actualRedirectUri)

    logger.info('Azure AD authentication successful via POST', {
      userId: session.user.id,
      email: session.user.email
    })

    // Return session data (for SPA applications)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          roles: session.user.roles
        },
        expiresAt: session.expiresAt
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            `pixelated_session=${JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              name: session.user.name,
              roles: session.user.roles,
              expiresAt: session.expiresAt
            })}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor((session.expiresAt - Date.now()) / 1000)}`,
            `pixelated_access_token=${session.accessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${Math.floor((session.expiresAt - Date.now()) / 1000)}`,
            `pixelated_refresh_token=${session.refreshToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
          ].join(', ')
        }
      }
    )

  } catch (error) {
    logger.error('Error in Azure AD callback via POST', {
      error: error instanceof Error ? error.message : String(error)
    })

    return new Response(
      JSON.stringify({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
