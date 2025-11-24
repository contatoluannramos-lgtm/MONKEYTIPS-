import React, { useState, useRef, useEffect } from 'react';
import { generateBulkInsights, analyzeTicketImage, analyzeScreenCapture } from '../services/geminiService';
import { fetchLiveFixtures } from '../services/liveDataService';
import { dbService } from '../services/databaseService';
import { authService } from '../services/authService';
import { runScoutAnalysis, DEFAULT_CALIBRATION } from '../services/scoutEngine';
import { runFusionEngine } from '../services/fusionEngine';
import { Match, Tip, SportType, AdminView, TipStatus, TicketAnalysis, ScoutResult, FusionAnalysis, ScreenAnalysisData } from '../types';
import { StatCard, ImprovementsPanel, OperationalChecklist, ProjectEvolutionRoadmap, ActivationPanel, TipsHistoryPanel, CalibrationPanel, ScoutCard, FusionTerminal } from '../components/AdminComponents';
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
  
  // Monkey Labs State
  const [ticketAnalysis, setTicketAnalysis] = useState<TicketAnalysis | null>(null);
  const [isAnalyzingTicket, setIsAnalyzingTicket] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monkey Vision State
  const [visionData, setVisionData] = useState<ScreenAnalysisData | null>(null);
  const [isScanningScreen, setIsScanningScreen] = useState(false);
  const [activeUrl, setActiveUrl] = useState("https://bet365.com/live");
  const [browserImage, setBrowserImage] = useState<string | null>(null); // To store the "pasted" screen

  // --- VISION & LABS LOGIC ---
  const processImageFile = async (file: File, mode: 'TICKET' | 'SCREEN') => {
    if (!file.type.startsWith('image/')) {
        alert("Por favor, cole ou envie apenas arquivos de imagem.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      if (mode === 'TICKET') {
        setIsAnalyzingTicket(true);
        setTicketAnalysis(null);
        const analysis = await analyzeTicketImage(base64String);
        setTicketAnalysis(analysis);
        setIsAnalyzingTicket(false);
      } else {
        setIsScanningScreen(true);
        setBrowserImage(base64String); // Show in "browser"
        const data = await analyzeScreenCapture(base64String);
        setVisionData(data);
        setIsScanningScreen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Allow pasting in Labs OR Vision
      if (currentView !== 'MONKEY_LABS' && currentView !== 'MONKEY_VISION') return;
      
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
             e.preventDefault();
             processImageFile(file, currentView === 'MONKEY_LABS' ? 'TICKET' : 'SCREEN');
             break; 
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentView]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processImageFile(file, 'TICKET');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file, currentView === 'MONKEY_LABS' ? 'TICKET' : 'SCREEN');
  };

  // --- END VISION & LABS LOGIC ---

  const handleLogout = async () => {
    await authService.signOut();
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    const apiKey = localStorage.getItem('monkey_football_api_key') || '';
    
    const liveMatches = await fetchLiveFixtures(apiKey);
    
    if (liveMatches.length > 0) {
      const newMatches = liveMatches.filter(lm => !matches.find(m => m.id === lm.id));
      
      if (newMatches.length > 0) {
         setMatches(prev => {
             const combined = [...prev, ...newMatches];
             return combined.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
         });
         
         newMatches.forEach(async (m) => {
           await dbService.saveMatch(m);
         });

         alert(`${newMatches.length} novas partidas sincronizadas! (Semana)`);
      } else {
         alert("Dados atualizados. Nenhuma partida NOVA encontrada para esta semana.");
      }
    } else {
      if(!apiKey) alert("Configure a API Key na aba Ativação para dados reais.");
      else alert("Nenhuma partida encontrada na API para os próximos 7 dias.");
    }
    setIsSyncing(false);
  };

  const handleGenerateIntelligence = async () => {
    const geminiKey = localStorage.getItem('monkey_gemini_api_key');
    if (!geminiKey) {
        alert("Erro de Sistema: Chave Gemini Ausente. Configure-a na aba 'Ativação'.");
        setCurrentView('ACTIVATION');
        return;
    }
    
    setIsGenerating(true);
    const matchesToAnalyze = matches.filter(m => 
       selectedSport === 'All' || m.sport === selectedSport
    );

    const newTips = await generateBulkInsights(matchesToAnalyze);
    setTips(prev => [...newTips, ...prev]);
    
    newTips.forEach(async (t) => {
      await dbService.saveTip(t);
    });

    setIsGenerating(false);
  };

  const handleUpdateTipStatus = async (id: string, status: TipStatus) => {
    setTips(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await dbService.updateTipStatus(id, status);
  };

  const getFusionAnalyses = (): FusionAnalysis[] => {
    return matches.slice(0, 6).map(m => {
       const scout = runScoutAnalysis(m, DEFAULT_CALIBRATION);
       const tip = tips.find(t => t.matchId === m.id) || null;
       return runFusionEngine(m, scout, tip);
    });
  };

  const totalTips = tips.length;
  const finishedTips = tips.filter(t => t.status === 'Won' || t.status === 'Lost');
  const wins = finishedTips.filter(t => t.status === 'Won').length;
  const winRate = finishedTips.length > 0 ? ((wins / finishedTips.length) * 100).toFixed(1) : '0.0';
  
  const profit = finishedTips.reduce((acc, t) => {
     if(t.status === 'Won') return acc + (t.odds - 1);
     return acc - 1;
  }, 0).toFixed(2);

  const performanceChartData = [
    { name: 'SOC', tips: tips.filter(t => t.sport === SportType.FOOTBALL).length, wins: tips.filter(t => t.sport === SportType.FOOTBALL && t.status === 'Won').length },
    { name: 'BSK', tips: tips.filter(t => t.sport === SportType.BASKETBALL).length, wins: tips.filter(t => t.sport === SportType.BASKETBALL && t.status === 'Won').length },
    { name: 'VOL', tips: tips.filter(t => t.sport === SportType.VOLLEYBALL).length, wins: tips.filter(t => t.sport === SportType.VOLLEYBALL && t.status === 'Won').length },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex font-sans text-gray-200">
      
      <aside className="w-20 lg:w-64 bg-surface-900 border-r border-white/5 flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
           <div className="w-8 h-8 bg-brand-500 rounded-sm flex items-center justify-center text-black font-bold text-lg shadow-[0_0_15px_rgba(245,158,11,0.4)]">M</div>
           <div className="hidden lg:block">
             <h1 className="font-display font-bold leading-none tracking-tight">MONKEY<span className="text-brand-500">TIPS</span></h1>
             <span className="text-gray-600 text-[10px] uppercase tracking-widest font-mono">Control Center</span>
           </div>
        </div>
        
        <nav className="mt-8 space-y-1 px-3">
          {[
            { name: 'Visão Geral', icon: '⚡', id: 'DASHBOARD' },
            { name: 'Monkey Vision', icon: '👁️', id: 'MONKEY_VISION' }, // Changed Icon and Name
            { name: 'Monkey Fusion', icon: '☢️', id: 'FUSION_CENTER' },
            { name: 'Scout Engine', icon: '📐', id: 'SCOUT_ENGINE' },
            { name: 'Laboratório IA', icon: '🧪', id: 'MONKEY_LABS' },
            { name: 'Calibragem', icon: '🎛️', id: 'CALIBRATION' },
            { name: 'Ativação', icon: '🗝️', id: 'ACTIVATION' },
            { name: 'Performance', icon: '📈', id: 'PERFORMANCE' }, 
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
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 rounded bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10"></div>
             <div className="hidden lg:block">
               <p className="text-sm font-medium text-white">Administrador</p>
               <p className="text-[10px] text-green-500 font-mono tracking-wider">● ONLINE</p>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-mono uppercase tracking-wider transition-colors">
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative">
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

        <header className="flex justify-between items-end mb-10 relative z-10">
          <div>
            <h2 className="text-2xl font-display font-medium text-white">
              {currentView === 'DASHBOARD' && 'Dashboard do Sistema'}
              {currentView === 'ACTIVATION' && 'Configuração de Infraestrutura'}
              {currentView === 'MONKEY_LABS' && 'Monkey Labs: Inteligência Visual'}
              {currentView === 'MONKEY_VISION' && 'Monkey Vision: Live Screen Reader'}
              {currentView === 'PERFORMANCE' && 'Performance Analítica'}
              {currentView === 'CALIBRATION' && 'Calibragem Estratégica'}
              {currentView === 'SCOUT_ENGINE' && 'Scout Engine: Matemática Pura'}
              {currentView === 'FUSION_CENTER' && 'Monkey Fusion: Decision Core'}
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

        {currentView === 'CALIBRATION' && (
          <div className="relative z-10 max-w-4xl mx-auto">
             <CalibrationPanel />
          </div>
        )}

        {currentView === 'SCOUT_ENGINE' && (
           <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matches.length === 0 ? (
                    <div className="col-span-full text-center py-20 border border-dashed border-white/10">
                        <p className="text-gray-500 font-mono">NENHUM DADO DE PARTIDA. SINCRONIZE NO DASHBOARD.</p>
                    </div>
                ) : matches.map(m => (
                  <div key={m.id} className="space-y-2">
                    <p className="text-white text-sm font-bold">{m.teamA} x {m.teamB}</p>
                    <ScoutCard result={runScoutAnalysis(m, DEFAULT_CALIBRATION)} />
                  </div>
                ))}
              </div>
           </div>
        )}

        {currentView === 'FUSION_CENTER' && (
           <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.length === 0 ? (
                    <div className="col-span-full text-center py-20 border border-dashed border-white/10">
                        <p className="text-gray-500 font-mono">AGUARDANDO DADOS DE PARTIDA PARA FUSÃO.</p>
                    </div>
                ) : getFusionAnalyses().map((analysis, idx) => (
                   <div key={idx} className="h-96">
                     <FusionTerminal analysis={analysis} />
                   </div>
                ))}
              </div>
           </div>
        )}

        {currentView === 'ACTIVATION' && (
           <div className="relative z-10 max-w-5xl mx-auto">
             <ActivationPanel />
           </div>
        )}

        {currentView === 'MONKEY_VISION' && (
           <div className="relative z-10 max-w-7xl mx-auto">
              <div className="grid grid-cols-3 gap-6 h-[70vh]">
                  {/* Browser Simulator */}
                  <div className="col-span-2 bg-surface-900 border border-white/5 flex flex-col rounded-t-lg overflow-hidden shadow-2xl">
                     {/* Browser Header */}
                     <div className="bg-surface-950 p-2 flex items-center gap-4 border-b border-white/5">
                        <div className="flex gap-1.5">
                           <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                           <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                           <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                        </div>
                        <div className="flex-1 bg-black/50 rounded-sm px-3 py-1 text-xs font-mono text-gray-500 flex justify-between items-center">
                           <span>{activeUrl}</span>
                           <span className="text-brand-500 animate-pulse">● LIVE CAPTURE</span>
                        </div>
                     </div>
                     
                     {/* Viewport Area */}
                     <div 
                        className="flex-1 bg-black relative group cursor-crosshair overflow-hidden"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                     >
                        {browserImage ? (
                           <img src={browserImage} alt="Live Screen" className="w-full h-full object-contain opacity-80" />
                        ) : (
                           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                              <p className="font-mono text-sm mb-2">AGUARDANDO SINAL DE VÍDEO...</p>
                              <p className="text-[10px] uppercase">Cole um Print (Ctrl+V) ou Arraste uma tela de jogo aqui.</p>
                           </div>
                        )}
                        
                        {isDragging && (
                           <div className="absolute inset-0 bg-brand-500/10 border-4 border-brand-500 border-dashed z-20 flex items-center justify-center">
                              <p className="text-brand-500 font-bold font-display bg-black/80 px-4 py-2">SOLTAR TELA</p>
                           </div>
                        )}
                        
                        {/* Scanline Effect Overlay */}
                        <div className="scanline pointer-events-none"></div>
                     </div>
                  </div>

                  {/* Vision Intelligence Panel */}
                  <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6 flex flex-col">
                     <h3 className="text-sm font-bold text-white mb-6 font-display flex items-center gap-2 border-b border-white/5 pb-2">
                        MONKEY VISION CORE
                        {isScanningScreen && <span className="animate-spin text-brand-500 text-xs">◐</span>}
                     </h3>

                     {visionData ? (
                        <div className="space-y-6 animate-fade-in flex-1 overflow-y-auto">
                           
                           {/* Placar */}
                           <div className="text-center bg-black/30 p-4 border border-white/5">
                              <p className="text-xs text-gray-500 uppercase mb-1">{visionData.sport}</p>
                              <div className="flex justify-between items-center px-4">
                                 <span className="font-bold text-white">{visionData.teamA}</span>
                                 <span className="text-2xl font-mono text-brand-500">{visionData.score}</span>
                                 <span className="font-bold text-white">{visionData.teamB}</span>
                              </div>
                              <p className="text-xs text-brand-500 font-mono mt-1">{visionData.time}</p>
                           </div>

                           {/* Odds Detectadas */}
                           <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Odds Visíveis</p>
                              <div className="grid grid-cols-2 gap-2">
                                 {visionData.detectedOdds.map((odd, idx) => (
                                    <div key={idx} className="bg-surface-800 p-2 flex justify-between items-center border-l-2 border-brand-500">
                                       <span className="text-xs text-gray-300 truncate">{odd.market}</span>
                                       <span className="text-sm font-bold text-white font-mono">{odd.value}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Contexto & AI */}
                           <div className="bg-brand-900/10 border border-brand-500/20 p-3">
                              <p className="text-[10px] text-brand-500 uppercase font-bold mb-1">Contexto Visual</p>
                              <p className="text-xs text-gray-300 leading-relaxed">
                                 {visionData.context}
                              </p>
                           </div>

                           <div className="mt-auto">
                              <button className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 text-xs font-bold uppercase tracking-widest transition-colors shadow-lg">
                                 Enviar para Fusion Engine
                              </button>
                           </div>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-xs font-mono space-y-2">
                           {isScanningScreen ? (
                              <>
                                 <p className="text-brand-500 animate-pulse">LENDO PIXELS...</p>
                                 <p>Extraindo Placar e Tempo...</p>
                              </>
                           ) : (
                              <p>Nenhuma telemetria visual.</p>
                           )}
                        </div>
                     )}
                  </div>
              </div>
           </div>
        )}

        {currentView === 'MONKEY_LABS' && (
           <div className="relative z-10 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div 
                    className={`bg-surface-900/50 backdrop-blur border p-8 flex flex-col items-center justify-center text-center min-h-[400px] border-dashed transition-all cursor-pointer group relative overflow-hidden ${
                      isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-white/5 hover:border-brand-500/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                 >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    <div className="w-24 h-24 bg-black/50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl border border-white/5">
                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload de Bilhete</h3>
                    <p className="text-gray-500 font-mono text-xs max-w-xs mb-4">
                       Arraste a imagem, clique para selecionar ou <span className="text-brand-500 font-bold">Cole (Ctrl+V)</span> direto aqui.
                    </p>
                    {isDragging && (
                       <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center backdrop-blur-sm">
                          <p className="text-brand-500 font-bold font-display text-xl animate-bounce">SOLTE PARA ANALISAR</p>
                       </div>
                    )}
                 </div>

                 <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-8 flex flex-col relative overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6 font-display flex items-center gap-2">
                       🧪 Resultado da Análise
                       {isAnalyzingTicket && <span className="animate-pulse text-brand-500 text-xs">● PROCESSANDO...</span>}
                    </h3>
                    
                    {isAnalyzingTicket ? (
                       <div className="flex-1 flex flex-col items-center justify-center text-brand-500 space-y-4">
                          <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
                          <p className="font-mono text-xs animate-pulse">Lendo imagem (OCR)...</p>
                          <p className="font-mono text-xs animate-pulse delay-75">Validando Odds...</p>
                       </div>
                    ) : ticketAnalysis ? (
                       <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center p-4 bg-black/30 border border-white/5">
                             <span className="text-gray-400 text-xs font-mono uppercase">Veredito IA</span>
                             <span className={`px-3 py-1 text-sm font-bold border uppercase tracking-wider ${
                                ticketAnalysis.verdict === 'APPROVED' ? 'bg-green-900/20 text-green-500 border-green-500' : 
                                ticketAnalysis.verdict === 'REJECTED' ? 'bg-red-900/20 text-red-500 border-red-500' : 'bg-yellow-900/20 text-yellow-500 border-yellow-500'
                             }`}>
                                {ticketAnalysis.verdict}
                             </span>
                          </div>

                          <div className="space-y-2">
                             <p className="text-gray-500 text-xs font-mono uppercase">Times Identificados</p>
                             <p className="text-white font-medium">{ticketAnalysis.extractedTeams}</p>
                          </div>

                          <div className="space-y-2">
                             <p className="text-gray-500 text-xs font-mono uppercase">Odd Total</p>
                             <p className="text-brand-500 font-mono text-xl">{ticketAnalysis.extractedOdds}</p>
                          </div>

                          <div className="space-y-2">
                             <p className="text-gray-500 text-xs font-mono uppercase">Análise Matemática</p>
                             <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-brand-500 pl-4 whitespace-pre-line">{ticketAnalysis.aiAnalysis}</p>
                          </div>
                          
                          <div className="mt-8 pt-6 border-t border-white/10">
                             <p className="text-gray-500 text-xs font-mono uppercase mb-2">Ação Recomendada</p>
                             <p className="text-white font-bold tracking-wide">{ticketAnalysis.suggestedAction}</p>
                          </div>
                       </div>
                    ) : (
                       <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-xs text-center">
                          Aguardando upload... <br/>
                          Suporta: JPG, PNG, Print Screen
                       </div>
                    )}
                 </div>
              </div>
           </div>
        )} 
        
        {currentView === 'PERFORMANCE' && (
           <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <StatCard title="Total Tips" value={totalTips.toString()} change="---" icon="📊" />
                 <StatCard title="Win Rate" value={`${winRate}%`} change={Number(winRate) > 50 ? "+Good" : "-Low"} icon="🎯" />
                 <StatCard title="Lucro Líquido (u)" value={profit} change={Number(profit) > 0 ? "+Profit" : "-Loss"} icon="💰" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <TipsHistoryPanel tips={tips} onUpdateStatus={handleUpdateTipStatus} />
                 <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
                    <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">Eficiência por Esporte</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData} barSize={40}>
                          <XAxis dataKey="name" stroke="#52525b" tick={{fill: '#71717a'}} />
                          <YAxis stroke="#52525b" tick={{fill: '#71717a'}} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A' }} />
                          <Bar dataKey="tips" name="Gerados" fill="#3f3f46" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="wins" name="Wins" fill="#10B981" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {currentView === 'DASHBOARD' && (
          <div className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Insights Gerados" value={tips.length.toString()} change="+12%" icon="📊" />
              <StatCard title="Precisão Modelo" value={`${winRate}%`} change={Number(winRate) > 0 ? "+2.1%" : "0%"} icon="🎯" />
              <StatCard title="Lucro (Unidades)" value={profit} change={Number(profit) > 0 ? "+5.4%" : "-1.2%"} icon="💰" />
              <StatCard title="Requisições API" value="45k" change="-1.2%" icon="📡" />
            </div>

            <div className="mb-8">
              <ProjectEvolutionRoadmap />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                         {isSyncing ? 'Sincronizando...' : '📡 Sync Data (Semana)'}
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
                      Implantar modelo Gemini 2.5 Flash para processar {matches.length} eventos. Correlacionando dados ao vivo/agendados com estatísticas históricas.
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
                      <BarChart data={performanceChartData} barSize={40}>
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