import type { APIRoute } from 'astro'
import { ContactService } from '@/lib/services/contact/ContactService'
import { logger } from '@/lib/utils/logger'

// Initialize contact service
const contactService = new ContactService()

// Helper function to get client IP address
function getClientIP(request: Request): string {
  // Check for forwarded headers (common in production with load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const remoteAddr = request.headers.get('x-remote-addr')
  if (remoteAddr) {
    return remoteAddr
  }

  // Fallback to localhost for development
  return '127.0.0.1'
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now()

  try {
    // Parse request data
    let formData: Record<string, unknown>
    try {
      formData = await request.json()
    } catch (error) {
      logger.warn('Invalid JSON in contact form request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: request.headers.get('user-agent'),
        ip: getClientIP(request),
      })

      return new Response(
        JSON.stringify({
          success: false,
          message:
            'Invalid request format. Please check your data and try again.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Validate required fields exist
    const requiredFields = ['name', 'email', 'subject', 'message']
    for (const field of requiredFields) {
      if (
        !formData[field] ||
        typeof formData[field] !== 'string' ||
        !formData[field].toString().trim()
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Missing or invalid field: ${field}`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // Prepare contact form data
    const contactFormData = {
      name: formData.name as string,
      email: formData.email as string,
      subject: formData.subject as string,
      message: formData.message as string,
    }

    // Prepare submission context
    const submissionContext = {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      timestamp: new Date().toISOString(),
    }

    // Submit contact form through service
    const result = await contactService.submitContactForm(
      contactFormData,
      submissionContext,
    )

    // Log the submission attempt
    const duration = Date.now() - startTime
    logger.info('Contact form submission processed', {
      success: result.success,
      submissionId: result.submissionId,
      email: contactFormData.email,
      ipAddress: submissionContext.ipAddress,
      duration: `${duration}ms`,
    })

    // Return response
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('Contact form submission failed with unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      duration: `${duration}ms`,
    })

    return new Response(
      JSON.stringify({
        success: false,
        message:
          'An unexpected error occurred. Please try again later or contact support if the problem persists.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

// OPTIONS endpoint for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
