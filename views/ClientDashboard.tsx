
import React, { useState, useMemo, useEffect } from 'react';
import { ClientHeader, Footer, PremiumLock, SubscriptionModal } from '../components/Layout';
import { Tip, SportType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { authService } from '../services/authService';

interface ClientDashboardProps {
  tips: Tip[];
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ tips }) => {
  const [activeSport, setActiveSport] = useState<SportType | 'All'>('All');
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load subscription state & Check Developer Backdoor
  useEffect(() => {
      const checkAccess = async () => {
          // 1. Check Local Storage (Real Subscriber)
          const premiumStatus = localStorage.getItem('monkey_is_premium');
          if (premiumStatus === 'true') {
              setIsPremiumUser(true);
              return;
          }

          // 2. Developer Backdoor (Admin Session)
          try {
              const { session } = await authService.getSession();
              if (session?.user) {
                  console.log("👑 Developer Access Granted: Premium Content Unlocked");
                  setIsPremiumUser(true);
              }
          } catch (e) {
              console.error("Auth check failed", e);
          }
      };
      
      checkAccess();
  }, []);

  const handleSubscribe = () => {
      setProcessingPayment(true);
      // Mock Payment Delay
      setTimeout(() => {
          localStorage.setItem('monkey_is_premium', 'true');
          setIsPremiumUser(true);
          setShowSubscriptionModal(false);
          setProcessingPayment(false);
          alert("Bem-vindo ao Monkey Tips Premium! Acesso liberado.");
      }, 1500);
  };

  const filteredTips = useMemo(() => {
    if (activeSport === 'All') return tips;
    return tips.filter(tip => tip.sport === activeSport);
  }, [tips, activeSport]);

  const stats = useMemo(() => {
    const total = filteredTips.length;
    const highConfidence = filteredTips.filter(t => t.confidence > 75).length;
    const avgOdds = total > 0 ? (filteredTips.reduce((acc, t) => acc + t.odds, 0) / total).toFixed(2) : '0.00';
    return { total, highConfidence, avgOdds };
  }, [filteredTips]);

  const chartData = [
    { name: 'High', value: stats.highConfidence },
    { name: 'Reg', value: stats.total - stats.highConfidence },
  ];
  const COLORS = ['#F59E0B', '#27272A'];

  return (
    <div className="min-h-screen bg-surface-950 text-gray-100 font-sans flex flex-col">
      <div className="scanline"></div>
      <div className="fixed inset-0 pointer-events-none bg-grid opacity-20 z-0"></div>
      
      <ClientHeader 
        activeSport={activeSport} 
        onSportChange={setActiveSport} 
        isPremium={isPremiumUser}
        onLogin={() => setShowSubscriptionModal(true)}
      />

      <SubscriptionModal 
        isOpen={showSubscriptionModal || processingPayment}
        onClose={() => !processingPayment && setShowSubscriptionModal(false)}
        onSubscribe={handleSubscribe}
      />

      {processingPayment && (
          <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center">
              <div className="text-center">
                  <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-4 mx-auto"></div>
                  <p className="text-white font-mono animate-pulse">PROCESSANDO PAGAMENTO...</p>
              </div>
          </div>
      )}

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full relative z-10">
        
        {/* Intelligence HUD */}
        <div className="mb-12">
          <div className="flex items-end gap-4 mb-6">
            <h2 className="text-3xl font-display font-medium text-white">Inteligência de Mercado</h2>
            <div className="h-px flex-grow bg-gradient-to-r from-gray-800 to-transparent mb-2"></div>
            <span className="text-xs font-mono text-brand-500 animate-pulse">FEED AO VIVO ●</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="bg-surface-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-none relative overflow-hidden group hover:border-brand-500/30 transition-colors">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-brand-500"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2">Sinais Ativos</p>
              <h2 className="text-4xl font-mono font-light text-white">{stats.total.toString().padStart(2, '0')}</h2>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-surface-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-none relative group hover:border-brand-500/30 transition-colors flex justify-between items-center">
               <div>
                <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2">Confiança &gt; 75%</p>
                <h2 className="text-4xl font-mono font-light text-brand-500">{stats.highConfidence.toString().padStart(2, '0')}</h2>
               </div>
               <div className="h-16 w-16 opacity-80">
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <PieChart>
                     <Pie data={chartData} innerRadius={18} outerRadius={28} paddingAngle={0} stroke="none" dataKey="value">
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-surface-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-none relative group hover:border-brand-500/30 transition-colors">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>
              </div>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-2">Média de Odds</p>
              <h2 className="text-4xl font-mono font-light text-gray-200">{stats.avgOdds}</h2>
            </div>
          </div>
        </div>

        {/* Feed Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-light text-white tracking-wide">
              Oportunidades Estratégicas
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTips.map((tip) => {
              // Logic for Locking: Locked if isPremium AND user NOT premium
              const isLocked = tip.isPremium && !isPremiumUser;

              return (
                <div key={tip.id} className="bg-surface-900/30 backdrop-blur-md border border-white/5 hover:border-brand-500/50 transition-all duration-300 group flex flex-col relative">
                  
                  {/* Premium Lock Overlay */}
                  {isLocked && <PremiumLock onClick={() => setShowSubscriptionModal(true)} />}

                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02] ${isLocked ? 'blur-[2px]' : ''}`}>
                     <div className="flex items-center gap-3">
                        <span className="text-lg opacity-70 grayscale group-hover:grayscale-0 transition-all">
                          {tip.sport === SportType.FOOTBALL ? '⚽' : tip.sport === SportType.BASKETBALL ? '🏀' : '🏐'}
                        </span>
                        <span className="text-xs font-mono uppercase tracking-widest text-gray-400 group-hover:text-brand-500 transition-colors">{tip.sport}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className={`h-1.5 w-1.5 rounded-full ${tip.confidence >= 80 ? 'bg-brand-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-gray-600'}`}></div>
                       <span className={`text-xs font-mono font-bold ${tip.confidence >= 80 ? 'text-brand-500' : 'text-gray-500'}`}>
                         {tip.confidence}% PROB
                       </span>
                     </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className={`p-6 flex-grow flex flex-col ${isLocked ? 'blur-sm opacity-50' : ''}`}>
                    <h3 className="text-lg font-display font-medium text-white mb-4 leading-snug">{tip.matchTitle}</h3>
                    
                    <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 mb-6">
                      <div className="bg-surface-900/80 p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Alvo</p>
                        <p className="text-brand-500 font-bold text-sm leading-tight">{isLocked ? 'HIDDEN' : tip.prediction}</p>
                      </div>
                      <div className="bg-surface-900/80 p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Odd</p>
                        <p className="text-white font-mono font-light text-sm">{isLocked ? '---' : tip.odds.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        Análise IA
                      </p>
                      <p className="text-gray-400 text-xs leading-relaxed font-light border-l-2 border-white/10 pl-3 select-none whitespace-pre-wrap font-mono">
                        {isLocked ? 'Conteúdo exclusivo para assinantes Premium. Desbloqueie para ver a análise completa e o racional estatístico.' : tip.reasoning}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-[2px] w-full bg-surface-800">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)] ${isLocked ? 'bg-gray-600' : 'bg-brand-500'}`}
                      style={{ width: `${tip.confidence}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            
            {filteredTips.length === 0 && (
               <div className="col-span-full py-32 text-center border border-dashed border-white/10 rounded-lg">
                 <p className="text-gray-600 font-mono text-sm">SEM DADOS DISPONÍVEIS PARA {activeSport.toUpperCase()}</p>
               </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
