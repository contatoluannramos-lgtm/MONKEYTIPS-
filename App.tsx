

import React, { useState, useEffect, Suspense, ReactNode, ErrorInfo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClientDashboard } from './views/ClientDashboard';
import { Match, Tip, SportType } from './types';
import { dbService } from './services/databaseService';
import { authService } from './services/authService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

// --- LAZY LOADED MODULES (SECURITY SEGREGATION) ---
const AdminDashboard = React.lazy(() => 
  import('./views/AdminDashboard')
);

// --- MOCK DATA (Fallback) ---
const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1',
    sport: SportType.FOOTBALL,
    teamA: 'Flamengo',
    teamB: 'Atlético Mineiro',
    teamAId: 127, 
    teamBId: 1062, 
    league: 'Brasileirão Série A',
    startTime: '2025-11-25T21:30:00', 
    status: 'Finished', 
    stats: { 
      homeScore: 1, 
      awayScore: 1, 
      currentMinute: 90, 
      possession: 58, 
      corners: { home: 7, away: 4, total: 11 }, 
      shotsOnTarget: { home: 8, away: 3 }, 
      shotsOffTarget: { home: 5, away: 4 }, 
      attacks: { dangerous: 52, total: 105 }, 
      cards: { yellow: 4, red: 0 }, 
      recentForm: 'W W D W L' 
    }
  },
  {
    id: 'm2',
    sport: SportType.BASKETBALL,
    teamA: 'Lakers',
    teamB: 'Celtics',
    league: 'NBA',
    startTime: '2025-11-27T23:00:00', 
    status: 'Scheduled',
    stats: { 
      homeScore: 0, 
      awayScore: 0, 
      currentPeriod: 'Pre-Game', 
      timeLeft: '00:00',
      quarters: {
        q1: { home: 0, away: 0 },
        q2: { home: 0, away: 0 },
        q3: { home: 0, away: 0 },
        q4: { home: 0, away: 0 }
      },
      pace: 102.5, 
      efficiency: 112.3,
      turnovers: { home: 0, away: 0 },
      rebounds: { home: 0, away: 0 },
      threePointPercentage: { home: 0, away: 0 }
    }
  }
];

const INITIAL_TIPS: Tip[] = [
  {
    id: 't1',
    matchId: 'm1',
    matchTitle: 'Flamengo x Atlético Mineiro',
    sport: SportType.FOOTBALL,
    prediction: 'Ambas Marcam: Sim',
    confidence: 65,
    odds: 1.85,
    reasoning: 'Análise baseada no histórico recente ofensivo de ambas as equipes. Jogo aberto confirmado.',
    createdAt: '2025-11-24T14:00:00',
    isPremium: false,
    status: 'Won'
  },
  {
    id: 't2',
    matchId: 'm2',
    matchTitle: 'Lakers x Celtics (NBA Classico)',
    sport: SportType.BASKETBALL,
    prediction: 'Over 228.5 Points',
    confidence: 92,
    odds: 1.90,
    reasoning: 'ALTA CONFIANÇA: Ritmo projetado (Pace) acima de 105 posses. Defesas desfalcadas. Tendência clara de High Scoring Game.',
    createdAt: new Date().toISOString(),
    isPremium: true,
    status: 'Pending'
  }
];

// --- LOGIN COMPONENT ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await authService.signIn(email, password);

    if (error) {
      let errorMessage = `ERRO: ${error.message}`;
      if (error.name === 'ConfigError') {
        errorMessage = 'ERRO DE SISTEMA: Banco de dados não configurado. Ative as chaves no painel.';
      } else if (error.message === 'Invalid login credentials') {
        errorMessage = 'ACESSO NEGADO: Email ou senha incorretos.';
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 font-mono relative overflow-hidden">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent opacity-50"></div>
       <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

       <div className="max-w-md w-full bg-surface-900/50 backdrop-blur border border-white/5 p-10 relative z-10 shadow-2xl">
         <div className="text-center mb-10">
           <div className="inline-block p-3 border border-brand-500/30 rounded-full mb-4 bg-brand-500/5">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-brand-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
           </div>
           <h2 className="text-xl font-display font-medium text-white tracking-wide">RESTRICTED AREA</h2>
           <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">System Auth v2.0</p>
         </div>
         
         <form onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Operator ID</label>
             <input 
               type="email" 
               value={email}
               onChange={e => setEmail(e.target.value)}
               className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors rounded-none placeholder-gray-700"
               placeholder="operator@system.internal"
               required
             />
           </div>
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Secure Key</label>
             <input 
               type="password" 
               value={password}
               onChange={e => setPassword(e.target.value)}
               className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors rounded-none placeholder-gray-700"
               placeholder="••••••••"
               required
             />
           </div>
           
           {error && (
             <div className="bg-red-900/20 border border-red-500/30 p-3 flex items-start gap-2">
               <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-red-400 text-xs leading-tight">{error}</p>
             </div>
           )}

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors mt-2 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? 'Authenticating...' : 'Access Terminal'}
           </button>
         </form>
         
         <div className="mt-8 text-center pt-6 border-t border-white/5 space-y-2">
            <a href="#/" className="block text-xs text-gray-600 hover:text-brand-500 transition-colors">« Disconnect</a>
         </div>
       </div>
    </div>
  );
};

// --- LOADING SCREEN ---
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mb-4"></div>
    <div className="text-brand-500 text-xs font-mono animate-pulse tracking-widest">SYSTEM BOOT SEQUENCE</div>
  </div>
);

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
           <div className="max-w-md border border-red-500/50 bg-red-900/10 p-6">
              <h1 className="text-xl font-bold text-red-500 mb-2">CRITICAL SYSTEM FAILURE</h1>
              <p className="text-xs font-mono text-gray-300 mb-4">The kernel panicked. Please check console logs.</p>
              <pre className="text-[10px] bg-black p-4 text-red-400 overflow-auto">{this.state.error?.message}</pre>
              <button 
                onClick={() => window.location.href = '/'}
                className="mt-4 bg-red-500 text-black px-4 py-2 text-xs font-bold uppercase"
              >
                Force Reboot
              </button>
           </div>
        </div>
      );
    }
    // FIX: The error "Property 'props' does not exist on type 'ErrorBoundary'" can be misleading. A potential cause is a subtle type inference issue. The `|| null` is redundant as React's render method can handle `undefined` children by rendering nothing. Removing it simplifies the code and makes it more robust against such issues.
    return this.props.children;
  }
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);

  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoadingSession(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    } else {
      console.warn("Supabase not configured. Skipping session check.");
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn("Supabase not configured. Using initial mock data.");
      return; 
    }

    const fetchLatestData = async () => {
      const dbMatches = await dbService.getMatches();
      if (dbMatches.length > 0) setMatches(dbMatches);
      else setMatches(INITIAL_MATCHES); 

      const dbTips = await dbService.getTips();
      if (dbTips.length > 0) setTips(dbTips);
      else setTips(INITIAL_TIPS);
    };
    
    fetchLatestData();

    const channel = supabase
      .channel('db_changes_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, fetchLatestData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLatestData)
      .subscribe();

    return () => {
      if(supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loadingSession) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ClientDashboard tips={tips} matches={matches} />} />
          
          <Route path="/system/access" element={session ? <Navigate to="/system/terminal" /> : <Login />} />
          <Route 
            path="/system/terminal" 
            element={
              session ? (
                <Suspense fallback={<LoadingScreen />}>
                  <AdminDashboard tips={tips} setTips={setTips} matches={matches} setMatches={setMatches} />
                </Suspense>
              ) : (
                <Navigate to="/system/access" />
              )
            } 
          />

          {/* HONEYPOT ROUTES */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}