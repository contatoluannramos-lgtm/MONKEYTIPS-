
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    // Server-side Validation
    if (!body.title || !body.summary || !body.source) {
      return new Response(JSON.stringify({ 
        error: 'Invalid Payload', 
        details: 'Missing required fields: title, summary, or source.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (body.urgency < 1 || body.urgency > 5) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error', 
        details: 'Urgency must be between 1 and 5.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In a real backend, we would save to Supabase here.
    // const { error } = await supabase.from('news').insert(body);

    return new Response(JSON.stringify({
      status: "received",
      message: "News payload ingested successfully",
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad Request', details: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
