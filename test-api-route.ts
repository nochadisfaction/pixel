import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request: _request }) => {
  return new Response(JSON.stringify({ message: 'Hello' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
