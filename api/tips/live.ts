
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // In a real scenario, fetch from Supabase using process.env variables
  // const { data } = await supabase.from('tips').select('*').eq('status', 'Live');

  const mockLiveTips = [
    {
      id: "live_1",
      match: "Lakers vs Warriors",
      score: "88-86",
      quarter: "Q3",
      prediction: "Over 230.5",
      confidence: 88,
      timestamp: new Date().toISOString()
    }
  ];

  return new Response(JSON.stringify({
    status: "success",
    count: mockLiveTips.length,
    data: mockLiveTips
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=10, stale-while-revalidate=59',
    },
  });
}
