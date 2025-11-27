
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClientDashboard } from './views/ClientDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { Match, Tip, SportType } from './types';
import { dbService } from './services/databaseService';
import { authService } from './services/authService';
import { supabase } from './services/supabaseClient';

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
    startTime: new Date().toISOString(), 
    status: 'Scheduled',
    stats: { 
      homeScore: 0, 
      awayScore: 0, 
      currentMinute: 0, 
      possession: 50, 
      corners: { home: 0, away: 0, total: 0 }, 
      shotsOnTarget: { home: 0, away: 0 }, 
      shotsOffTarget: { home: 0, away: 0 }, 
      attacks: { dangerous: 0, total: 0 }, 
      cards: { yellow: 0, red: 0 }, 
      recentForm: 'N/A' 
    }
  },
  {
    id: 'm2',
    sport: SportType.BASKETBALL,
    teamA: 'Lakers',
    teamB: 'Celtics',
    league: 'NBA',
    startTime: '2024-05-21T00:00:00Z',
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
    prediction: 'Aguardando Análise...',
    confidence: 50,
    odds: 1.00,
    reasoning: 'Dados de histórico serão processados na próxima execução do protocolo.',
    createdAt: new Date().toISOString(),
    isPremium: false,
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

    const { data, error } = await authService.signIn(email, password);

    if (error) {
      setError(error.message === 'Invalid login credentials' 
        ? 'ACESSO NEGADO: Email ou senha incorretos.' 
        : `ERRO: ${error.message}`);
      setLoading(false);
    } else {
      // Auth state listener in App will handle redirect
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
           <h2 className="text-xl font-display font-medium text-white tracking-wide">ACESSO SEGURO</h2>
           <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">Supabase Authentication</p>
         </div>
         
         <form onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Registrado</label>
             <input 
               type="email" 
               value={email}
               onChange={e => setEmail(e.target.value)}
               className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors rounded-none placeholder-gray-700"
               placeholder="admin@monkeytips.com"
               required
             />
           </div>
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chave de Acesso</label>
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
             {loading ? 'Verificando Credenciais...' : 'Autenticar'}
           </button>
         </form>
         
         <div className="mt-8 text-center pt-6 border-t border-white/5 space-y-2">
            <p className="text-[10px] text-gray-500">Nota: Crie o usuário no painel do Supabase &gt; Authentication &gt; Users</p>
            <a href="#/" className="block text-xs text-gray-600 hover:text-brand-500 transition-colors">Retornar à Visão Pública</a>
         </div>
       </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // LOAD DATA & REALTIME SYNC
  useEffect(() => {
    const fetchLatestData = async () => {
      console.log('🔄 Syncing Data...');
      
      const dbMatches = await dbService.getMatches();
      if (dbMatches.length > 0) {
        setMatches(dbMatches);
      } else {
        setMatches(INITIAL_MATCHES); // Fallback if DB empty
      }

      const dbTips = await dbService.getTips();
      if (dbTips.length > 0) {
        setTips(dbTips);
      }
    };
    
    // Initial Fetch
    fetchLatestData();

    // Setup Realtime Subscriptions
    const channel = supabase
      .channel('db_changes_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tips' },
        (payload) => {
          console.log('🔔 Realtime: Tips Update Detected:', payload.eventType);
          fetchLatestData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
           console.log('🔔 Realtime: Matches Update Detected:', payload.eventType);
           fetchLatestData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ClientDashboard tips={tips} />} />

        <Route 
          path="/admin/login" 
          element={session ? <Navigate to="/admin" /> : <Login />} 
        />
        
        <Route 
          path="/admin" 
          element={session ? <AdminDashboard tips={tips} setTips={setTips} matches={matches} setMatches={setMatches} /> : <Navigate to="/admin/login" />} 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
