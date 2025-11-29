
// This API endpoint is deprecated and will be removed.
// Admin logic is self-contained in the front-end application.
export const config = { runtime: 'edge' };
export default async function handler(request: Request) {
    return new Response(JSON.stringify({ error: 'Endpoint deprecated' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
}
