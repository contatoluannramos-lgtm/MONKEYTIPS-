import React from 'react';
import { SportType, SubscriptionPlan } from '../types';

interface ClientHeaderProps {
  activeSport: SportType | 'All';
  onSportChange: (sport: SportType | 'All') => void;
  isPremium: boolean;
  onLogin: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ activeSport, onSportChange, isPremium, onLogin }) => {
  return (
    <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-surface-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-sm flex items-center justify-center text-brand-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M12 2a10 10 0 0 0-10 10h10V2z"></path>
                <path d="M12 12l9.33 5.39a10 10 0 0 1-13.66 0L12 12z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-white leading-none">MONKEY<span className="text-brand-500">TIPS</span></span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono">Inteligência Estratégica</span>
            </div>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center space-x-1 bg-surface-900/50 p-1 rounded-none border border-white/5">
              {['All', ...Object.values(SportType)].map((sport) => (
                <button
                  key={sport}
                  onClick={() => onSportChange(sport as SportType | 'All')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 font-display tracking-wide uppercase ${
                    activeSport === sport
                      ? 'bg-brand-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sport === 'All' ? 'Visão Geral' : sport}
                </button>
              ))}
            </div>
            
            {/* User Status */}
            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
               {isPremium ? (
                   <span className="text-[10px] font-bold font-mono text-brand-500 border border-brand-500/30 px-3 py-1.5 bg-brand-500/10 uppercase flex items-center gap-2 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                       <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                       Premium Member
                   </span>
               ) : (
                   <button 
                     onClick={onLogin}
                     className="bg-brand-500 hover:bg-brand-400 text-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transform hover:scale-105"
                   >
                       ASSINAR PREMIUM
                   </button>
               )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className="md:hidden flex flex-col border-t border-white/5 bg-surface-950">
         <div className="flex overflow-x-auto py-3 px-4 space-x-3 no-scrollbar">
             {['All', ...Object.values(SportType)].map((sport) => (
                <button
                  key={sport}
                  onClick={() => onSportChange(sport as SportType | 'All')}
                  className={`whitespace-nowrap px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border ${
                    activeSport === sport
                      ? 'bg-brand-500/10 border-brand-500 text-brand-500'
                      : 'bg-surface-800 border-transparent text-gray-500'
                  }`}
                >
                  {sport === 'All' ? 'Geral' : sport}
                </button>
              ))}
         </div>
         
         {/* Mobile Subscription Button */}
         {!isPremium && (
            <div className="px-4 pb-4 pt-2">
                <button 
                     onClick={onLogin}
                     className="w-full bg-brand-500 hover:bg-brand-400 text-black px-4 py-3 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                   >
                       🔓 DESBLOQUEAR PREMIUM
                </button>
            </div>
         )}
      </div>
    </nav>
  );
};

export const Footer = () => (
  <footer className="border-t border-white/5 py-12 mt-12 bg-surface-950">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <div className="flex justify-center mb-4 text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-display tracking-wide">© 2024 MONKEY TIPS INTEL.</p>
      <p className="text-gray-600 text-xs mt-3 font-mono">SISTEMA DE PREVISÃO ESPORTIVA ALGORÍTMICA. 18+</p>
    </div>
  </footer>
);

export const PremiumLock = ({ onClick }: { onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 cursor-pointer group transition-all hover:bg-black/70"
    >
        <div className="p-4 rounded-full bg-surface-900 border border-brand-500/30 mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.2)] relative">
            <div className="absolute inset-0 rounded-full border border-brand-500/50 animate-ping opacity-20"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 relative z-10">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
        <span className="text-white font-display font-bold uppercase tracking-widest text-sm drop-shadow-lg">Conteúdo Premium</span>
        <span className="text-brand-500 text-[10px] font-mono mt-1 group-hover:underline bg-black/50 px-2 py-0.5 rounded">Clique para desbloquear</span>
    </div>
);

export const SubscriptionModal = ({ isOpen, onClose, onSubscribe }: { isOpen: boolean; onClose: () => void; onSubscribe: () => void }) => {
    if (!isOpen) return null;

    const plans: SubscriptionPlan[] = [
        {
            id: 'monthly',
            name: 'PLANO TÁTICO',
            price: 'R$ 49,90',
            period: '/mês',
            features: ['Acesso a Tips de Alta Confiança', 'Dashboard Ao Vivo', 'Sem Anúncios']
        },
        {
            id: 'quarterly',
            name: 'PLANO ESTRATÉGICO',
            price: 'R$ 129,90',
            period: '/trimestre',
            features: ['Tudo do Plano Tático', 'Acesso ao Monkey Vision', 'Prioridade em Suporte', 'Economize 15%'],
            recommended: true
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
            <div className="bg-surface-950 border border-white/10 w-full max-w-3xl relative z-10 shadow-2xl rounded-sm overflow-hidden animate-fade-in">
                <div className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-brand-500/10 to-transparent">
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Desbloqueie o Poder Total</h2>
                    <p className="text-gray-400 text-sm font-light">Acesse as melhores oportunidades com o Monkey Tips Premium.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                    {plans.map((plan) => (
                        <div 
                            key={plan.id} 
                            className={`relative bg-surface-900/50 border p-6 flex flex-col transition-all cursor-pointer hover:bg-surface-800 group ${
                                plan.recommended ? 'border-brand-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-105 z-10' : 'border-white/5 hover:border-white/20'
                            }`}
                            onClick={onSubscribe}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-black text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-lg">
                                    Recomendado
                                </div>
                            )}
                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-500 transition-colors">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-display font-bold text-white">{plan.price}</span>
                                <span className="text-xs text-gray-500">{plan.period}</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="flex items-center gap-3 text-xs text-gray-300">
                                        <div className="w-4 h-4 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-2.5 h-2.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent double trigger
                                    onSubscribe();
                                }}
                                className={`w-full py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-lg ${
                                plan.recommended 
                                ? 'bg-brand-500 text-black hover:bg-brand-400 hover:shadow-brand-500/25' 
                                : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                            }`}>
                                Escolher Plano
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-black/20 text-center border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-mono flex items-center justify-center gap-2">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        Ambiente Seguro (Simulação de Pagamento)
                    </p>
                </div>
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-black/20 p-2 rounded-full hover:bg-white/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
    );
};