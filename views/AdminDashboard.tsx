
import React, { useState } from 'react';
import { generateBulkInsights } from '../services/geminiService';
import { fetchLiveFixtures } from '../services/liveDataService';
import { dbService } from '../services/databaseService'; // Import DB Service
import { Match, Tip, SportType, AdminView } from '../types';
import { StatCard, ImprovementsPanel, OperationalChecklist, ProjectEvolutionRoadmap, ActivationPanel } from '../components/AdminComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
  tips: Tip[];
  setTips: React.Dispatch<React.SetStateAction<Tip[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ tips, setTips, matches, setMatches }) => {
  const [currentView, setCurrentView] = useState<AdminView>('DASHBOARD');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportType | 'All'>('All');

  const handleSyncData = async () => {
    setIsSyncing(true);
    const apiKey = localStorage.getItem('monkey_football_api_key') || '';
    
    const liveMatches = await fetchLiveFixtures(apiKey);
    
    if (liveMatches.length > 0) {
      const newMatches = liveMatches.filter(lm => !matches.find(m => m.id === lm.id));
      if (newMatches.length > 0) {
         setMatches(prev => [...newMatches, ...prev]);
         
         // Salvar no Banco
         newMatches.forEach(async (m) => {
           await dbService.saveMatch(m);
         });

         alert(`${newMatches.length} partidas ao vivo sincronizadas e salvas no banco!`);
      } else {
         alert("Dados atualizados, mas nenhuma partida nova encontrada.");
      }
    } else {
      if(!apiKey) alert("Modo Demo: Configure a API Key na aba Ativação para dados reais.");
      else alert("Nenhuma partida ao vivo no momento (ou erro de API).");
    }
    setIsSyncing(false);
  };

  const handleGenerateIntelligence = async () => {
    if (!process.env.API_KEY) {
        alert("Erro de Sistema: Chave de Ambiente Ausente.");
        return;
    }
    
    setIsGenerating(true);
    const matchesToAnalyze = matches.filter(m => 
       selectedSport === 'All' || m.sport === selectedSport
    );

    const newTips = await generateBulkInsights(matchesToAnalyze);
    setTips(prev => [...newTips, ...prev]);
    
    // Salvar Tips no Banco
    newTips.forEach(async (t) => {
      await dbService.saveTip(t);
    });

    setIsGenerating(false);
  };

  const performanceData = [
    { name: 'SOC', tips: tips.filter(t => t.sport === SportType.FOOTBALL).length, wins: 12 },
    { name: 'BSK', tips: tips.filter(t => t.sport === SportType.BASKETBALL).length, wins: 8 },
    { name: 'VOL', tips: tips.filter(t => t.sport === SportType.VOLLEYBALL).length, wins: 5 },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex font-sans text-gray-200">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-surface-900 border-r border-white/5 flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
           <div className="w-8 h-8 bg-brand-500 rounded-sm flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.4)]">
             M
           </div>
           <div className="hidden lg:block">
             <h1 className="font-display font-bold leading-none tracking-tight">MONKEY<span className="text-brand-500">TIPS</span></h1>
             <span className="text-gray-600 text-[10px] uppercase tracking-widest font-mono">Control Center</span>
           </div>
        </div>
        
        <nav className="mt-8 space-y-1 px-3">
          {[
            { name: 'Visão Geral', icon: '⚡', id: 'DASHBOARD' },
            { name: 'Ativação', icon: '🗝️', id: 'ACTIVATION' },
            { name: 'Motor de IA', icon: '🧠', id: 'DASHBOARD' }, 
            { name: 'Feeds de Dados', icon: '📡', id: 'ACTIVATION' }
          ].map((item, idx) => (
             <button 
               key={idx} 
               onClick={() => setCurrentView(item.id as AdminView)}
               className={`w-full flex items-center gap-3 px-3 py-3 rounded-none border-l-2 transition-all group ${
                 currentView === item.id 
                 ? 'bg-white/5 border-brand-500 text-white' 
                 : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
               }`}
             >
               <span className="text-lg opacity-70">{item.icon}</span>
               <span className="hidden lg:block font-medium text-sm tracking-wide font-display">{item.name}</span>
             </button>
          ))}
        </nav>
        
        <div className="mt-auto p-6 border-t border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10"></div>
             <div className="hidden lg:block">
               <p className="text-sm font-medium text-white">Administrador</p>
               <p className="text-[10px] text-brand-500 font-mono tracking-wider">ROOT_ACCESS</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

        <header className="flex justify-between items-end mb-10 relative z-10">
          <div>
            <h2 className="text-2xl font-display font-medium text-white">
              {currentView === 'DASHBOARD' ? 'Dashboard do Sistema' : 'Configuração de Infraestrutura'}
            </h2>
            <p className="text-gray-500 text-sm mt-1 font-mono">SERVER_TIME: {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-green-500 text-[10px] font-mono font-bold tracking-widest uppercase">
               Sistema Operacional
             </span>
          </div>
        </header>

        {currentView === 'ACTIVATION' ? (
           <div className="relative z-10 max-w-5xl mx-auto">
             <ActivationPanel />
           </div>
        ) : (
          <div className="relative z-10">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Insights Gerados" value={tips.length.toString()} change="+12%" icon="📊" />
              <StatCard title="Precisão Modelo" value="68.4%" change="+2.1%" icon="🎯" />
              <StatCard title="Usuários Ativos" value="1,240" change="+5.4%" icon="👥" />
              <StatCard title="Requisições API" value="45k" change="-1.2%" icon="📡" />
            </div>

            <div className="mb-8">
              <ProjectEvolutionRoadmap />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Intelligence Module */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-display font-medium text-white flex items-center gap-2">
                      <span className="text-brand-500">///</span> Núcleo Generativo (IA)
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleSyncData}
                        disabled={isSyncing}
                        className="bg-surface-800 text-white border border-white/10 px-3 py-1.5 text-xs font-mono uppercase hover:bg-surface-700 transition-colors flex items-center gap-2"
                      >
                         {isSyncing ? 'Sincronizando...' : '📡 Sync Live Data'}
                      </button>
                      <select 
                        className="bg-surface-950 text-gray-400 border border-white/10 rounded-none px-3 py-1.5 text-xs font-mono outline-none focus:border-brand-500 transition-colors uppercase"
                        value={selectedSport}
                        onChange={(e) => setSelectedSport(e.target.value as SportType | 'All')}
                      >
                        <option value="All">TODOS OS DADOS</option>
                        <option value={SportType.FOOTBALL}>SEQ_FUTEBOL</option>
                        <option value={SportType.BASKETBALL}>SEQ_BASQUETE</option>
                        <option value={SportType.VOLLEYBALL}>SEQ_VOLEI</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-none border border-white/5 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="w-16 h-16 rounded-full border border-brand-500/30 flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 rounded-full border border-brand-500/30 animate-ping opacity-20"></div>
                        <span className="text-2xl">🧠</span>
                    </div>
                    
                    <h4 className="text-white font-medium mb-2 font-display">Iniciar Sequência de Análise</h4>
                    <p className="text-gray-500 text-sm max-w-md mb-8 font-light">
                      Implantar modelo Gemini 2.5 Flash para processar {matches.length} eventos pendentes. Correlacionando dados ao vivo (API-Sports) com estatísticas históricas.
                    </p>
                    
                    <button
                      onClick={handleGenerateIntelligence}
                      disabled={isGenerating}
                      className={`px-8 py-3 rounded-none text-sm font-bold tracking-widest uppercase transition-all relative overflow-hidden ${
                        isGenerating 
                          ? 'bg-surface-800 text-gray-500 cursor-not-allowed border border-white/5' 
                          : 'bg-brand-600 text-white hover:bg-brand-500 shadow-[0_0_20px_rgba(217,119,6,0.2)]'
                      }`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          PROCESSANDO DADOS...
                        </span>
                      ) : (
                        "EXECUTAR PROTOCOLO"
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
                  <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">Métricas de Performance do Modelo</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData} barSize={40}>
                        <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#71717a', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#52525b" tick={{fill: '#71717a', fontSize: 12, fontFamily: 'JetBrains Mono'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#fff', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                            cursor={{ fill: '#ffffff', opacity: 0.05 }}
                        />
                        <Bar dataKey="tips" name="Gerados" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="wins" name="Sucesso" fill="#D97706" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <OperationalChecklist />
                <ImprovementsPanel />
                
                <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
                  <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Status dos Feeds</h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center p-2 bg-black/20 rounded-none border border-white/5">
                      <span className="text-gray-300">API-FOOTBALL</span>
                      <span className="text-green-500">● CONECTADO</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-black/20 rounded-none border border-white/5">
                      <span className="text-gray-300">SUPABASE DB</span>
                      <span className="text-green-500">● CONECTADO</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <button className="w-full py-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-none transition-colors uppercase tracking-wider">
                        Ver Logs do Sistema
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};
