import type { APIRoute } from 'astro'

interface DemoAnalyticsEvent {
  event: string
  timestamp: number
  session_id: string
  ab_variant: string
  page: string
  url: string
  referrer: string
  user_agent: string
  [key: string]: any
}

// In-memory storage for demo (replace with database in production)
const analyticsData: DemoAnalyticsEvent[] = []

export const POST: APIRoute = async ({ request }) => {
  try {
    const eventData: DemoAnalyticsEvent = await request.json()
    
    // Validate required fields
    if (!eventData.event || !eventData.session_id || !eventData.ab_variant) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: event, session_id, ab_variant' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Add server-side timestamp and IP
    const enrichedEvent = {
      ...eventData,
      server_timestamp: Date.now(),
      ip_address: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
      user_agent: request.headers.get('user-agent') || eventData.user_agent
    }

    // Store the event (in production, save to database)
    analyticsData.push(enrichedEvent)
    
    // Log for debugging
    console.log('Demo Analytics Event:', {
      event: enrichedEvent.event,
      session_id: enrichedEvent.session_id,
      ab_variant: enrichedEvent.ab_variant,
      timestamp: new Date(enrichedEvent.timestamp).toISOString()
    })

    // Send to external analytics services
    await Promise.allSettled([
      sendToGoogleAnalytics(enrichedEvent),
      sendToMixpanel(enrichedEvent),
      sendToCustomAnalytics(enrichedEvent)
    ])

    return new Response(JSON.stringify({ 
      success: true, 
      event_id: enrichedEvent.session_id + '_' + enrichedEvent.timestamp 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Demo analytics error:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process analytics event' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export const GET: APIRoute = async ({ url }) => {
  const searchParams = new URL(url).searchParams
  const sessionId = searchParams.get('session_id')
  const abVariant = searchParams.get('ab_variant')
  const event = searchParams.get('event')

  // Filter analytics data based on query parameters
  let filteredData = analyticsData

  if (sessionId) {
    filteredData = filteredData.filter(item => item.session_id === sessionId)
  }

  if (abVariant) {
    filteredData = filteredData.filter(item => item.ab_variant === abVariant)
  }

  if (event) {
    filteredData = filteredData.filter(item => item.event === event)
  }

  // Generate analytics summary
  const summary = generateAnalyticsSummary(filteredData)

  return new Response(JSON.stringify({
    total_events: filteredData.length,
    events: filteredData.slice(-100), // Return last 100 events
    summary
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function sendToGoogleAnalytics(event: DemoAnalyticsEvent) {
  // Google Analytics 4 Measurement Protocol
  const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID
  const GA_API_SECRET = import.meta.env.GA_API_SECRET

  if (!GA_MEASUREMENT_ID || !GA_API_SECRET) {
    console.warn('Google Analytics credentials not configured')
    return
  }

  try {
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: event.session_id,
        events: [{
          name: event.event,
          parameters: {
            ab_variant: event.ab_variant,
            page_title: 'ClinicalVault Trainer Demo',
            page_location: event.url,
            custom_parameter_1: event.session_id,
            custom_parameter_2: event.ab_variant,
            ...Object.fromEntries(
              Object.entries(event).filter(([key]) => 
                !['event', 'timestamp', 'session_id', 'ab_variant', 'url'].includes(key)
              )
            )
          }
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`GA4 API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to send to Google Analytics:', error)
  }
}

async function sendToMixpanel(event: DemoAnalyticsEvent) {
  const MIXPANEL_TOKEN = import.meta.env.MIXPANEL_TOKEN

  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel token not configured')
    return
  }

  try {
    const mixpanelEvent = {
      event: event.event,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: event.session_id,
        ab_variant: event.ab_variant,
        page: event.page,
        time: Math.floor(event.timestamp / 1000),
        ...event
      }
    }

    await fetch('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([mixpanelEvent])
    })
  } catch (error) {
    console.error('Failed to send to Mixpanel:', error)
  }
}

async function sendToCustomAnalytics(event: DemoAnalyticsEvent) {
  // Send to your custom analytics service
  const CUSTOM_ANALYTICS_ENDPOINT = import.meta.env.CUSTOM_ANALYTICS_ENDPOINT

  if (!CUSTOM_ANALYTICS_ENDPOINT) {
    return
  }

  try {
    await fetch(CUSTOM_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.CUSTOM_ANALYTICS_TOKEN}`
      },
      body: JSON.stringify(event)
    })
  } catch (error) {
    console.error('Failed to send to custom analytics:', error)
  }
}

function generateAnalyticsSummary(events: DemoAnalyticsEvent[]) {
  const summary = {
    total_events: events.length,
    unique_sessions: new Set(events.map(e => e.session_id)).size,
    ab_variants: {} as Record<string, number>,
    event_types: {} as Record<string, number>,
    conversion_funnel: {
      page_views: 0,
      demo_interactions: 0,
      cta_clicks: 0,
      conversion_rate: 0
    },
    avg_time_to_cta: 0,
    scroll_depth_avg: 0
  }

  // Count A/B variants
  events.forEach(event => {
    summary.ab_variants[event.ab_variant] = (summary.ab_variants[event.ab_variant] || 0) + 1
    summary.event_types[event.event] = (summary.event_types[event.event] || 0) + 1
  })

  // Calculate conversion funnel
  summary.conversion_funnel.page_views = events.filter(e => e.event === 'demo_page_view').length
  summary.conversion_funnel.demo_interactions = events.filter(e => e.event === 'demo_interaction').length
  summary.conversion_funnel.cta_clicks = events.filter(e => e.event === 'demo_cta_click').length
  
  if (summary.conversion_funnel.page_views > 0) {
    summary.conversion_funnel.conversion_rate = 
      (summary.conversion_funnel.cta_clicks / summary.conversion_funnel.page_views) * 100
  }

  // Calculate average time to CTA
  const ctaEvents = events.filter(e => e.event === 'demo_cta_click' && e.time_to_click)
  if (ctaEvents.length > 0) {
    summary.avg_time_to_cta = ctaEvents.reduce((sum, e) => sum + (e.time_to_click || 0), 0) / ctaEvents.length
  }

  // Calculate average scroll depth
  const scrollEvents = events.filter(e => e.event === 'demo_scroll_depth' && e.depth_percent)
  if (scrollEvents.length > 0) {
    summary.scroll_depth_avg = scrollEvents.reduce((sum, e) => sum + (e.depth_percent || 0), 0) / scrollEvents.length
  }

  return summary
}
