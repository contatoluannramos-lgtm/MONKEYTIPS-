import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClientDashboard } from './views/ClientDashboard';
import { AdminDashboard } from './views/AdminDashboard';
import { Match, Tip, SportType } from './types';

// --- MOCK DATA ---
const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1',
    sport: SportType.FOOTBALL,
    teamA: 'Flamengo',
    teamB: 'Palmeiras',
    league: 'Brasileirão Série A',
    startTime: '2024-05-20T21:30:00Z',
    status: 'Scheduled',
    stats: { possession: 55, shotsOnTarget: 6, recentForm: 'W-D-W-L-W', injuries: ['G. Barbosa'] }
  },
  {
    id: 'm2',
    sport: SportType.BASKETBALL,
    teamA: 'Lakers',
    teamB: 'Celtics',
    league: 'NBA',
    startTime: '2024-05-21T00:00:00Z',
    status: 'Scheduled',
    stats: { pace: 102.5, efficiency: 112.3 }
  },
  {
    id: 'm3',
    sport: SportType.VOLLEYBALL,
    teamA: 'Brasil',
    teamB: 'Itália',
    league: 'VNL',
    startTime: '2024-05-22T10:00:00Z',
    status: 'Scheduled',
    stats: { errorsPerSet: 4.5, blockRate: 2.1 }
  }
];

const INITIAL_TIPS: Tip[] = [
  {
    id: 't1',
    matchId: 'm1',
    matchTitle: 'Flamengo x Palmeiras',
    sport: SportType.FOOTBALL,
    prediction: 'Under 2.5 Cards',
    confidence: 72,
    odds: 1.85,
    reasoning: 'Referee averages 2.1 cards/game. High tactical rigidity expected reducing chaotic play.',
    createdAt: new Date().toISOString(),
    isPremium: false
  }
];

// --- LOGIN COMPONENT ---
const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@monkeytips.com' && password === 'admin') {
      onLogin();
    } else {
      setError('ACCESS DENIED: INVALID CREDENTIALS');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 font-mono relative overflow-hidden">
       {/* Background decorative elements */}
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent opacity-50"></div>
       <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

       <div className="max-w-md w-full bg-surface-900/50 backdrop-blur border border-white/5 p-10 relative z-10 shadow-2xl">
         <div className="text-center mb-10">
           <div className="inline-block p-3 border border-brand-500/30 rounded-full mb-4">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-brand-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
           </div>
           <h2 className="text-xl font-display font-medium text-white tracking-wide">SYSTEM ACCESS</h2>
           <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">Authorized Personnel Only</p>
         </div>
         
         <form onSubmit={handleSubmit} className="space-y-6">
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Identifier</label>
             <input 
               type="email" 
               value={email}
               onChange={e => setEmail(e.target.value)}
               className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors"
               placeholder="admin@monkeytips.com"
             />
           </div>
           <div className="space-y-1">
             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Passcode</label>
             <input 
               type="password" 
               value={password}
               onChange={e => setPassword(e.target.value)}
               className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none transition-colors"
               placeholder="•••••"
             />
           </div>
           {error && <p className="text-red-500 text-xs border border-red-900/50 bg-red-900/10 p-2 text-center">{error}</p>}
           <button type="submit" className="w-full bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors mt-2">
             Authenticate
           </button>
         </form>
         <div className="mt-8 text-center pt-6 border-t border-white/5">
            <a href="#/" className="text-xs text-gray-600 hover:text-brand-500 transition-colors">Return to Public View</a>
         </div>
       </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [tips, setTips] = useState<Tip[]>(INITIAL_TIPS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [matches] = useState<Match[]>(INITIAL_MATCHES);

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE - Client View */}
        <Route path="/" element={<ClientDashboard tips={tips} />} />

        {/* RESTRICTED ROUTES - Admin View */}
        <Route 
          path="/admin/login" 
          element={isAuthenticated ? <Navigate to="/admin" /> : <Login onLogin={() => setIsAuthenticated(true)} />} 
        />
        
        <Route 
          path="/admin" 
          element={isAuthenticated ? <AdminDashboard tips={tips} setTips={setTips} matches={matches} /> : <Navigate to="/admin/login" />} 
        />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}