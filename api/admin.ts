
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Simple Auth Check (Mock)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     // In production, validate token with Supabase
     // return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const status = {
    system: "MONKEY_TIPS_ENGINE",
    version: "1.6",
    status: "OPERATIONAL",
    modules: {
      scout_engine: "ACTIVE",
      fusion_engine: "ACTIVE",
      news_engine: "LISTENING",
      live_engine: "STANDBY"
    },
    serverTime: new Date().toISOString()
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
