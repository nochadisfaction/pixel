import type { APIRoute } from 'astro'
import { azureADAuth } from '../../../../lib/auth/azure-ad'
import { getLogger } from '../../../../lib/logging'

const logger = getLogger({ prefix: 'azure-auth-login' })

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    // Get redirect URI from query params or use default
    const redirectUri =
      url.searchParams.get('redirect_uri') ||
      `${url.origin}/api/auth/azure/callback`

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID()

    // Get authorization URL
    const authUrl = azureADAuth.getAuthorizationUrl(state, redirectUri)

    logger.info('Initiating Azure AD login', {
      redirectUri,
      state,
    })

    // Store state in session/cookie for validation
    // Note: In a real implementation, you'd store this securely
    const response = redirect(authUrl, 302)
    response.headers.set(
      'Set-Cookie',
      `azure_auth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    )

    return response
  } catch (_error) {
    logger.error('Error initiating Azure AD login', {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to initiate Azure AD login',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json()
    const { redirect_uri } = body

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID()

    // Get authorization URL
    const authUrl = azureADAuth.getAuthorizationUrl(
      state,
      redirect_uri || `${url.origin}/api/auth/azure/callback`,
    )

    logger.info('Initiating Azure AD login via POST', {
      redirectUri: redirect_uri,
      state,
    })

    return new Response(
      JSON.stringify({
        authUrl,
        state,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `azure_auth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
        },
      },
    )
  } catch (_error) {
    logger.error('Error initiating Azure AD login via POST', {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({
        error: 'Failed to initiate Azure AD login',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
