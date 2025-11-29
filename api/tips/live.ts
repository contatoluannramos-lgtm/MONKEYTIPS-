
// This API endpoint is deprecated and will be removed.
// Logic is now handled by the main application services.
export const config = { runtime: 'edge' };
export default async function handler(request: Request) {
    return new Response(JSON.stringify({ error: 'Endpoint deprecated' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
}
