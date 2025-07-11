import type { APIRoute } from 'astro'
import { azureSupabaseIntegration } from '../../../../lib/auth/azure-supabase-integration'
import { getLogger } from '../../../../lib/utils/logger'

const logger = getLogger({ prefix: 'azure-auth-logout' })

export const GET: APIRoute = async ({ url, redirect, request }) => {
  try {
    // Get post logout redirect URI
    const postLogoutRedirectUri =
      url.searchParams.get('post_logout_redirect_uri') ||
      `${url.origin}/auth/logged-out`

    // Get user session from cookies
    const cookies = request.headers.get('cookie')
    const sessionCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith('pixelated_session='))
      ?.split('=')[1]

    let userId: string | undefined

    if (sessionCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie))
        userId = session.userId
      } catch (error) {
        logger.warn('Failed to parse session cookie', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Sign out from both Azure AD and Supabase
    let logoutUrl: string
    if (userId) {
      logoutUrl = await azureSupabaseIntegration.signOut(
        userId,
        postLogoutRedirectUri,
      )
    } else {
      // If no user session, just redirect to Azure AD logout
      const azureConfig = (await import('../../../../config/azure.config'))
        .azureConfig
      logoutUrl =
        azureConfig.auth.getOAuthConfig().authority +
        `/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
    }

    logger.info('User logout initiated', { userId })

    // Clear all session cookies
    const response = redirect(logoutUrl, 302)
    response.headers.set(
      'Set-Cookie',
      [
        'pixelated_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'pixelated_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'pixelated_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'azure_auth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      ].join(', '),
    )

    return response
  } catch (error) {
    logger.error('Error during logout', {
      error: error instanceof Error ? error.message : String(error),
    })

    // Even if logout fails, clear cookies and redirect
    const response = redirect('/auth/error?error=logout_failed', 302)
    response.headers.set(
      'Set-Cookie',
      [
        'pixelated_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'pixelated_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'pixelated_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'azure_auth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      ].join(', '),
    )

    return response
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json()
    const { post_logout_redirect_uri } = body

    const postLogoutRedirectUri =
      post_logout_redirect_uri || `${url.origin}/auth/logged-out`

    // Get user session from cookies
    const cookies = request.headers.get('cookie')
    const sessionCookie = cookies
      ?.split(';')
      .find((c) => c.trim().startsWith('pixelated_session='))
      ?.split('=')[1]

    let userId: string | undefined

    if (sessionCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie))
        userId = session.userId
      } catch (error) {
        logger.warn('Failed to parse session cookie', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Sign out from both Azure AD and Supabase
    let logoutUrl: string
    if (userId) {
      logoutUrl = await azureSupabaseIntegration.signOut(
        userId,
        postLogoutRedirectUri,
      )
    } else {
      // If no user session, just redirect to Azure AD logout
      const azureConfig = (await import('../../../../config/azure.config'))
        .azureConfig
      logoutUrl =
        azureConfig.auth.getOAuthConfig().authority +
        `/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
    }

    logger.info('User logout initiated via POST', { userId })

    return new Response(
      JSON.stringify({
        success: true,
        logoutUrl,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'pixelated_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'pixelated_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'pixelated_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'azure_auth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
          ].join(', '),
        },
      },
    )
  } catch (error) {
    logger.error('Error during logout via POST', {
      error: error instanceof Error ? error.message : String(error),
    })

    return new Response(
      JSON.stringify({
        error: 'Logout failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'pixelated_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'pixelated_access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'pixelated_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
            'azure_auth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
          ].join(', '),
        },
      },
    )
  }
}
