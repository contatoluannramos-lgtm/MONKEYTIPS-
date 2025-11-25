
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const matchId = url.searchParams.get('matchId');

  if (!matchId) {
    return new Response(JSON.stringify({ error: 'Missing matchId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Simulation of Scout Engine Projection
  const projection = {
    matchId,
    projectedScore: { home: 2, away: 1 },
    corners: { total: 10.5, trend: "Over" },
    cards: { total: 4.5, trend: "Under" },
    generatedAt: new Date().toISOString()
  };

  return new Response(JSON.stringify(projection), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
