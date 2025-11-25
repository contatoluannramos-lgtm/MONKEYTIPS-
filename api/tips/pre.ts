
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

  const mockPreTips = [
    {
      id: "pre_1",
      match: "Flamengo vs Palmeiras",
      league: "Brasileirão",
      prediction: "BTTS - Yes",
      reasoning: "High xG for both teams in last 5 games.",
      confidence: 75,
      odds: 1.85
    }
  ];

  return new Response(JSON.stringify({
    status: "success",
    type: "PRE_GAME",
    data: mockPreTips
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}
