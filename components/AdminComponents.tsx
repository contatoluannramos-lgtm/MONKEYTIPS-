
import React, { useState, useEffect } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase, Tip, TipStatus, CalibrationConfig, ScoutResult, FusionAnalysis, NewsAnalysis, TARGET_TEAMS_BRASILEIRAO, NewsProcessedItem, BotNewsPayload, Match, StatProcessedItem } from '../types';
import { dbService } from '../services/databaseService';
import { GoogleGenAI } from "@google/genai";
import { analyzeSportsNews, processBotNews, processMonkeyStats } from '../services/geminiService';
import { DEFAULT_CALIBRATION, runScoutAnalysis } from '../services/scoutEngine';
import { runFusionEngine } from '../services/fusionEngine';
import { webhookService } from '../services/webhookService';
import { fetchRSSFeeds, fetchPlayerStatsCrawler, testStatsProvider } from '../services/liveDataService';

// --- EXISTING COMPONENTS ---

export const StatCard = ({ title, value, change, icon }: { title: string, value: string, change: string, icon: string }) => (
  <div className="bg-surface-900 p-6 border border-white/5 shadow-lg hover:border-brand-500/30 transition-all group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white font-display">{value}</h3>
      </div>
      <div className="p-2 bg-surface-950 rounded border border-white/5 text-xl group-hover:text-brand-500 transition-colors">{icon}</div>
    </div>
    <p className={`text-xs mt-3 font-medium font-mono ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
      {change} <span className="text-gray-600 ml-1">vs mês ant.</span>
    </p>
  </div>
);

export const CalibrationPanel = () => {
  const [config, setConfig] = useState<CalibrationConfig>(DEFAULT_CALIBRATION);
  const [activeTab, setActiveTab] = useState<keyof CalibrationConfig>('football');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('monkey_calibration_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const handleChange = (section: keyof CalibrationConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    localStorage.setItem('monkey_calibration_config', JSON.stringify(config));
    alert('Protocolo Estratégico Salvo! A IA usará essas regras nas próximas análises.');
  };

  const loadWeekendPreset = () => {
    const weekendConfig: CalibrationConfig = {
        ...config,
        football: {
            ...config.football,
            instruction: "MODO WEEKEND: Jogos de fim de semana. Considere cansaço de copas e rotação de elenco. Dê peso maior para mandantes descansados.",
            weightRecentForm: 0.5, // Aumenta peso da forma (cansaço)
            over25Threshold: 60 // Mais rigoroso para Over
        },
        basketball: {
            ...config.basketball,
            instruction: "MODO WEEKEND NBA: Jogos de TV Nacional e Matinês. Tendência de ritmo inconsistente. Verifique se é B2B (Back-to-Back).",
            paceWeight: 0.8 // Pace define o jogo no fds
        }
    };
    setConfig(weekendConfig);
    alert("Preset 'WEEKEND MODE' carregado. Clique em Salvar para aplicar.");
  };

  const tabs: {id: keyof CalibrationConfig, label: string}[] = [
    { id: 'football', label: '⚽ Futebol' },
    { id: 'basketball', label: '🏀 Basquete' },
    { id: 'volleyball', label: '🏐 Vôlei' },
    { id: 'iceHockey', label: '🏒 Hóquei' },
    { id: 'onlineGames', label: '🎰 Jogos Online' },
  ];

  return (
    <div className="bg-surface-900/50 backdrop-blur rounded-none border border-white/5">
      <div className="border-b border-white/5 flex overflow-x-auto no-scrollbar items-center justify-between pr-4">
        <div className="flex">
            {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-mono font-bold uppercase transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-brand-500/10 text-brand-500 border-b-2 border-brand-500' : 'text-gray-500 hover:text-white'
                }`}
            >
                {tab.label}
            </button>
            ))}
        </div>
        <button 
            onClick={loadWeekendPreset}
            className="text-[10px] font-mono uppercase bg-surface-800 hover:bg-surface-700 text-brand-500 px-3 py-1 border border-brand-500/20"
        >
            ⚡ Carregar Preset Weekend
        </button>
      </div>

      <div className="p-8">
        <h3 className="text-lg font-bold text-white mb-6 font-display flex items-center gap-2">
           🎛️ Editor de Estratégia: {tabs.find(t => t.id === activeTab)?.label}
        </h3>

        {/* Strategic Text Area */}
        <div className="mb-8">
           <label className="block text-xs font-mono text-brand-500 uppercase tracking-widest mb-2 font-bold">
              Protocolo de Análise (Instrução para IA)
           </label>
           <div className="relative">
             <div className="absolute inset-0 bg-brand-500/5 pointer-events-none"></div>
             <textarea 
               className="w-full h-32 bg-black border border-white/10 text-gray-300 font-mono text-xs p-4 focus:border-brand-500 focus:outline-none resize-none leading-relaxed"
               value={(config[activeTab] as any).instruction}
               onChange={(e) => handleChange(activeTab, 'instruction', e.target.value)}
               placeholder="Digite aqui as regras que a IA deve seguir... Ex: 'Considere chuva como fator de Under Gols'"
             />
             <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 font-mono">TERMINAL INPUT</div>
           </div>
           <p className="text-[10px] text-gray-500 mt-2">
             * Este texto será injetado no prompt do sistema antes de cada análise de {tabs.find(t => t.id === activeTab)?.label}.
           </p>
        </div>

        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
          Parametrização Matemática (Scout Engine)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(config[activeTab]).map(([key, value]) => {
            if (key === 'instruction') return null; // Skip text area handled above
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <span className="text-brand-500 font-bold font-mono text-xs">{Number(value).toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={key.toLowerCase().includes('threshold') || key.toLowerCase().includes('line') ? "300" : "1"} 
                  step="0.01"
                  value={Number(value)}
                  onChange={(e) => handleChange(activeTab, key, parseFloat(e.target.value))}
                  className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
           <button 
             onClick={handleSave}
             className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-brand-500/10"
           >
             Salvar Protocolo
           </button>
        </div>
      </div>
    </div>
  );
};

export const ScoutCard = ({ result }: { result: ScoutResult }) => {
  return (
    <div className={`bg-surface-950 border p-4 font-mono relative overflow-hidden group ${result.isHotGame ? 'border-red-500/30' : 'border-white/10'}`}>
      <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-bold text-white">MATH</div>
      <div className="flex justify-between items-center mb-2">
         <span className="text-xs text-gray-500 uppercase">Scout Engine</span>
         <div className="flex items-center gap-2">
             {result.isHotGame && <span className="text-[10px] bg-red-500 text-black font-bold px-1 animate-pulse">HOT 🔥</span>}
             {result.spikeDetected && <span className="text-[10px] bg-brand-500 text-black font-bold px-1 animate-bounce">⚡ SPIKE</span>}
             <span className={`text-xs font-bold ${result.signal.includes('STRONG') ? 'text-brand-500' : 'text-gray-500'}`}>{result.signal}</span>
         </div>
      </div>
      
      <div className="flex items-end gap-2 mb-2">
         <span className="text-3xl font-bold text-white">{result.calculatedProbability.toFixed(0)}%</span>
         <span className="text-xs text-gray-500 mb-1">Prob. Matemática</span>
      </div>

      <div className="w-full bg-surface-800 h-1 mb-3">
         <div className="bg-brand-500 h-full" style={{ width: `${result.calculatedProbability}%` }}></div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] text-gray-400 border-l border-brand-500 pl-2">
            {result.details}
        </p>
        {result.spikeDetected && (
            <p className="text-[10px] text-brand-500 font-bold border-l border-brand-500 pl-2 animate-pulse">
                ⚠️ {result.spikeDetails}
            </p>
        )}
      </div>
    </div>
  );
};

export const FusionTerminal = ({ analysis }: { analysis: FusionAnalysis }) => {
  return (
    <div className="bg-surface-900 border border-white/5 p-6 flex flex-col h-full relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
           <div>
             <h4 className="font-display font-bold text-xl text-white">MONKEY FUSION™</h4>
             <p className="text-xs font-mono text-gray-500">ID: {analysis.matchId}</p>
           </div>
           <div className={`px-4 py-2 border font-bold font-mono text-sm tracking-widest uppercase ${
             analysis.verdict === 'GREEN_LIGHT' ? 'bg-green-500/20 text-green-500 border-green-500' :
             analysis.verdict === 'YELLOW_WARNING' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500' :
             'bg-red-500/20 text-red-500 border-red-500'
           }`}>
             {analysis.verdict.replace('_', ' ')}
           </div>
        </div>

        {analysis.scoutResult.isHotGame && (
            <div className="bg-red-500/10 border border-red-500/30 p-1 mb-4 text-center">
                <span className="text-red-500 font-bold font-mono text-xs tracking-widest uppercase animate-pulse">🔥 HOT GAME DETECTED 🔥</span>
            </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
           <div className="bg-black/30 p-2 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Scout (Bayes)</p>
              <p className="text-lg font-bold text-white">{analysis.scoutResult.calculatedProbability.toFixed(0)}%</p>
           </div>
           <div className="bg-black/30 p-2 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Confidence</p>
              <p className={`text-lg font-bold ${
                  analysis.confidenceLevel === 'HIGH' ? 'text-green-500' : 
                  analysis.confidenceLevel === 'MEDIUM' ? 'text-yellow-500' : 'text-gray-400'
              }`}>{analysis.confidenceLevel}</p>
           </div>
           <div className="bg-black/30 p-2 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">EV+</p>
              <p className={`text-lg font-bold ${analysis.ev > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analysis.ev > 0 ? '+' : ''}{analysis.ev}%
              </p>
           </div>
        </div>

        <div className="bg-black/40 p-4 border-l-2 border-brand-500 mb-4">
           <p className="text-[10px] text-brand-500 uppercase font-bold mb-1">AI Context Integration</p>
           <p className="text-xs text-gray-300 leading-relaxed">
             {analysis.aiContext}
           </p>
        </div>
        
        {/* News Impact Badge */}
        {analysis.newsImpactScore && analysis.newsImpactScore !== 0 && (
           <div className={`mt-2 p-2 text-center border ${analysis.newsImpactScore > 0 ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
               <span className={`text-xs font-mono font-bold ${analysis.newsImpactScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                   NEWS IMPACT: {analysis.newsImpactScore > 0 ? '+' : ''}{analysis.newsImpactScore}%
               </span>
           </div>
        )}

        <div className="mt-auto">
           <div className="flex justify-between text-[10px] font-mono text-gray-600 uppercase">
              <span>Odds: {analysis.marketOdd.toFixed(2)}</span>
              <span>Fusion Core v2.1</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export const MonkeyLivePanel = ({ matches, tips }: { matches: Match[], tips: Tip[] }) => {
    const [liveMatches, setLiveMatches] = useState<Match[]>([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    // DEFAULT TO TRUE: Always active independently, no need to click to start
    const [autoFire, setAutoFire] = useState(true);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [heartbeat, setHeartbeat] = useState(false);
  
    useEffect(() => {
        const savedUrl = localStorage.getItem('monkey_webhook_url');
        if (savedUrl) setWebhookUrl(savedUrl);
    }, []);
  
    useEffect(() => {
        // We do NOT check localStorage for 'false'. We force it ON by default in state initialization.
        // But we save it for reference.
        localStorage.setItem('monkey_autofire_state', autoFire.toString());
    }, [autoFire]);

    useEffect(() => {
        // Filter only live matches
        const live = matches.filter(m => m.status === 'Live');
        setLiveMatches(live);
    }, [matches]);
  
    useEffect(() => {
        // SCHEDULER: Updates every 30 seconds
        const interval: ReturnType<typeof setInterval> = setInterval(() => {
            setLastUpdate(new Date());
            setHeartbeat(prev => !prev); // Pulse effect
            try {
                processLiveCycle();
            } catch (err) {
                console.error("Live Cycle Error:", err);
                addLog("⚠️ ERRO NO CICLO LIVE. RECUPERANDO...");
            }
        }, 30000); // 30s cycle
  
        return () => clearInterval(interval);
    }, [liveMatches, autoFire, webhookUrl]);
  
    const processLiveCycle = () => {
        const time = new Date().toLocaleTimeString();
        
        if (liveMatches.length === 0) {
            // addLog(`[${time}] 💤 Sem jogos ao vivo. Standby.`);
            return;
        }

        // Run Fusion Analysis on Live Matches
        liveMatches.forEach(async (match) => {
             const tip = tips.find(t => t.matchId === match.id) || null;
             const config = DEFAULT_CALIBRATION; 
             const scout = runScoutAnalysis(match, config);
             const fusion = runFusionEngine(match, scout, tip);
  
             if (fusion.verdict === 'GREEN_LIGHT') {
                 addLog(`[${time}] 🔥 GREEN LIGHT: ${match.teamA} (Conf: ${fusion.finalConfidence}%)`);
                 if (autoFire && webhookUrl) {
                     const success = await webhookService.triggerAlert(match, fusion, webhookUrl);
                     if (success) addLog(`[${time}] 🚀 WEBHOOK DISPARADO!`);
                     else addLog(`[${time}] ❌ ERRO WEBHOOK`);
                 }
             }
        });
    };
  
    const addLog = (msg: string) => {
        setLogs(prev => [msg, ...prev].slice(0, 50));
    };
  
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center bg-surface-900 border border-white/5 p-4">
                    <div>
                        <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${heartbeat ? 'bg-green-500 shadow-green-500/50' : 'bg-green-900'} transition-colors duration-1000`}></span>
                            MONKEY LIVE ENGINE
                        </h3>
                        <p className="text-xs font-mono text-gray-500">CYCLE: 30s | 24/7 MONITORING MODE</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                             <p className="text-[10px] text-gray-500 uppercase">Last Update</p>
                             <p className="text-white font-mono">{lastUpdate.toLocaleTimeString()}</p>
                        </div>
                        <button 
                            onClick={() => setAutoFire(!autoFire)}
                            className={`px-4 py-2 text-xs font-bold uppercase border transition-all ${
                                autoFire ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gray-800 border-gray-600 text-gray-500'
                            }`}
                        >
                            {autoFire ? '🚨 AUTO-FIRE: ON' : 'AUTO-FIRE: PAUSED'}
                        </button>
                    </div>
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveMatches.length === 0 ? (
                        <div className="col-span-full py-20 text-center border border-dashed border-white/10 text-gray-500 font-mono">
                            NENHUMA PARTIDA AO VIVO DETECTADA NO MOMENTO.
                            <br/> <span className="text-xs">O sistema entrará em repouso até o início dos jogos.</span>
                        </div>
                    ) : liveMatches.map(m => {
                         const scout = runScoutAnalysis(m, DEFAULT_CALIBRATION);
                         return (
                            <div key={m.id} className="bg-surface-900 border border-white/5 p-4 relative overflow-hidden">
                                {scout.isHotGame && <div className="absolute top-0 right-0 p-1 bg-red-500/20 text-[10px] text-red-500 font-bold uppercase">HOT 🔥</div>}
                                {scout.spikeDetected && <div className="absolute top-0 left-0 p-1 bg-brand-500 text-[10px] text-black font-bold uppercase animate-pulse">⚡ SPIKE DETECTED</div>}
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-white font-bold text-sm">{m.teamA} v {m.teamB}</span>
                                    <span className="text-brand-500 font-mono text-xs">
                                        {m.sport === 'Futebol' ? `${(m.stats as any).currentMinute}'` : m.status}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-800 h-1 mb-2">
                                    <div className="bg-brand-500 h-full transition-all duration-500" style={{ width: `${scout.calculatedProbability}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                    <span>Prob: {scout.calculatedProbability.toFixed(0)}%</span>
                                    <span>Signal: {scout.signal}</span>
                                </div>
                            </div>
                         );
                    })}
                </div>
            </div>
  
            <div className="bg-black border border-white/5 p-4 flex flex-col h-full font-mono text-xs">
                <h4 className="text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">SYSTEM LOGS</h4>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    {logs.map((log, idx) => (
                        <p key={idx} className={log.includes('GREEN LIGHT') ? 'text-green-500 font-bold' : log.includes('WEBHOOK') ? 'text-blue-500' : 'text-gray-500'}>
                            {log}
                        </p>
                    ))}
                    {logs.length === 0 && <p className="text-gray-700 italic">Listening for events...</p>}
                </div>
            </div>
        </div>
    );
  };

interface NewsTerminalProps {
    newsQueue: NewsProcessedItem[];
    onNewsProcessed: (item: NewsProcessedItem) => void;
    onArchiveNews: (id: string) => void;
}

export const NewsTerminal: React.FC<NewsTerminalProps> = ({ newsQueue, onNewsProcessed, onArchiveNews }) => {
  const [manualInput, setManualInput] = useState('');
  const [inputType, setInputType] = useState<'URL' | 'TEXT' | 'JSON'>('URL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingRSS, setIsFetchingRSS] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FUTEBOL' | 'BASQUETE'>('ALL');

  const handleRSSIngest = async (source: 'GLOBO' | 'ESPN') => {
    setIsFetchingRSS(true);
    try {
        const items = await fetchRSSFeeds(source);
        // Processa apenas as 3 mais recentes para evitar sobrecarga
        for (const item of items.slice(0, 3)) {
            const payload: BotNewsPayload = {
                source: source === 'GLOBO' ? 'globoesporte' : 'other',
                league: 'futebol', // Default, AI ajustará
                urgency: 3,
                title: item.title,
                summary: item.description,
                published_at: item.pubDate,
                url: item.link
            };
            
            // Verifica duplicidade básica pelo título (opcional, aqui confio no Gemini)
            const processed = await processBotNews(payload);
            if(processed) onNewsProcessed(processed);
        }
        alert(`✅ Feed ${source} processado com sucesso!`);
    } catch (e) {
        alert("Erro ao buscar RSS: " + e);
    }
    setIsFetchingRSS(false);
  };

  const handleManualIngest = async () => {
      if (!manualInput.trim()) return;
      setIsProcessing(true);
      
      let payload: BotNewsPayload;

      if (inputType === 'JSON') {
          try {
              const json = JSON.parse(manualInput);
              
              // --- SERVER-SIDE VALIDATION TEST ---
              try {
                  const res = await fetch('/api/news/ingest', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(json)
                  });
                  
                  if (!res.ok) {
                      const errData = await res.json();
                      throw new Error(`SERVER ERROR: ${errData.error} - ${errData.details}`);
                  }
              } catch (apiErr: any) {
                  alert(apiErr.message);
                  setIsProcessing(false);
                  return;
              }
              // ----------------------------------

              payload = {
                  source: json.source || 'other',
                  league: json.league || 'futebol',
                  urgency: json.urgency || 3,
                  title: json.title,
                  summary: json.summary,
                  published_at: json.published_at || new Date().toISOString(),
                  url: json.url || ''
              };
          } catch (e: any) {
              alert("ERRO JSON: " + e.message);
              setIsProcessing(false);
              return;
          }
      } else {
          // Manual Mode (Mock Payload for AI)
          payload = {
              source: 'other',
              league: 'futebol', // Default, AI will correct context
              urgency: 3,
              title: inputType === 'URL' ? 'Análise de URL Externa' : 'Inserção Manual de Texto',
              summary: manualInput,
              published_at: new Date().toISOString(),
              url: inputType === 'URL' ? manualInput : ''
          };
      }

      // AI Processing
      const processed = await processBotNews(payload);
      if (processed) {
          onNewsProcessed(processed);
          setManualInput('');
      }
      setIsProcessing(false);
  };

  const activeNews = newsQueue.filter(n => n.status !== 'ARCHIVED');
  const filteredQueue = activeNews.filter(item => 
     selectedFilter === 'ALL' || item.originalData.league.toUpperCase() === selectedFilter
  );

  return (
    <div className="bg-[#0B0B0D] border border-[#1C1C1F] h-full flex flex-col font-sans">
       {/* Header */}
       <div className="p-6 border-b border-[#1C1C1F] flex justify-between items-center bg-[#121214]">
          <div>
             <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                MONKEY NEWS ENGINE
             </h3>
             <p className="text-[#A3A3A8] text-xs font-mono mt-1">INTEGRATION STATUS: ONLINE</p>
          </div>
       </div>

       {/* RSS Feeds Control */}
       <div className="px-4 pt-4 pb-2 bg-[#0B0B0D]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">LIVE FEEDS (RSS BRIDGE)</p>
          <div className="flex gap-2">
              <button 
                  onClick={() => handleRSSIngest('GLOBO')}
                  disabled={isFetchingRSS}
                  className="bg-green-900/20 hover:bg-green-900/40 border border-green-500/30 text-green-500 px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"
              >
                  {isFetchingRSS ? 'Scanning...' : '📡 G1 GLOBO'}
              </button>
              <button 
                  onClick={() => handleRSSIngest('ESPN')}
                  disabled={isFetchingRSS}
                  className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-500 px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"
              >
                  {isFetchingRSS ? 'Scanning...' : '📡 ESPN BRASIL'}
              </button>
          </div>
       </div>

       {/* Controls Area */}
       <div className="p-4 border-b border-[#1C1C1F] bg-[#0B0B0D]">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">INPUT MANUAL</p>
          <div className="flex gap-2">
              <select 
                value={inputType} 
                onChange={(e) => setInputType(e.target.value as any)}
                className="bg-[#1C1C1F] text-white text-xs border border-white/10 px-3 outline-none uppercase font-mono"
              >
                  <option value="URL">LINK / URL</option>
                  <option value="TEXT">TEXTO</option>
                  <option value="JSON">JSON PAYLOAD (BOT)</option>
              </select>
              <input 
                type="text" 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={inputType === 'JSON' ? 'Cole o JSON do Bot' : inputType === 'URL' ? "Cole o link..." : "Cole o texto..."}
                className="flex-1 bg-[#1C1C1F] text-white text-xs border border-white/10 px-4 py-3 focus:border-brand-500 outline-none font-mono"
              />
              <button 
                onClick={handleManualIngest}
                disabled={isProcessing || !manualInput}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '...' : 'PROCESSAR'}
              </button>
          </div>
       </div>

       {/* Filters */}
       <div className="p-2 border-b border-[#1C1C1F] flex gap-2 bg-[#0B0B0D]">
          {['ALL', 'FUTEBOL', 'BASQUETE'].map(filter => (
             <button
                key={filter}
                onClick={() => setSelectedFilter(filter as any)}
                className={`px-3 py-1 text-[10px] font-bold uppercase border ${
                   selectedFilter === filter 
                   ? 'bg-[#1C1C1F] text-white border-white/20' 
                   : 'bg-transparent text-[#A3A3A8] border-transparent hover:text-white'
                }`}
             >
                {filter}
             </button>
          ))}
       </div>

       {/* News List */}
       <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredQueue.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[#27272A] opacity-50">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <p className="mt-4 font-mono text-xs">AGUARDANDO DADOS (RSS OU MANUAL)...</p>
             </div>
          ) : (
             filteredQueue.map(item => (
                <div key={item.id} className="bg-[#121214] border border-[#1C1C1F] p-5 hover:border-brand-500/30 transition-all group relative overflow-hidden">
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                            item.originalData.source === 'nba' ? 'bg-blue-900/30 text-blue-500' : 'bg-green-900/30 text-green-500'
                         }`}>
                            {item.originalData.source}
                         </span>
                         <span className="text-[#A3A3A8] text-[10px] font-mono">{new Date(item.processedAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="text-[#A3A3A8] text-[10px] uppercase tracking-wider">Relevance</span>
                         <div className="w-24 h-1.5 bg-[#1C1C1F]">
                            <div className="h-full bg-brand-500" style={{ width: `${item.relevanceScore}%` }}></div>
                         </div>
                      </div>
                   </div>

                   <h4 className="text-white font-medium text-sm mb-2 group-hover:text-brand-500 transition-colors">{item.originalData.title}</h4>
                   <p className="text-[#A3A3A8] text-xs leading-relaxed mb-4 border-l-2 border-[#1C1C1F] pl-3">
                      {item.context}
                   </p>

                   <div className="grid grid-cols-2 gap-4 bg-[#0B0B0D] p-3 border border-[#1C1C1F]">
                      <div>
                         <p className="text-[10px] text-[#A3A3A8] uppercase font-bold">Impacto Estatístico</p>
                         <p className={`text-lg font-mono font-bold ${item.impactScore > 0 ? 'text-[#00FFB2]' : 'text-[#FF4E4E]'}`}>
                            {item.impactScore > 0 ? '+' : ''}{item.impactScore}%
                         </p>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#A3A3A8] uppercase font-bold">Ação Recomendada</p>
                         <p className="text-xs text-white font-medium mt-1">{item.recommendedAction}</p>
                      </div>
                   </div>

                   <div className="mt-3 pt-3 border-t border-[#1C1C1F] flex justify-between items-center">
                      <span className="text-[10px] text-brand-500 font-mono">Fusion Summary: {item.fusionSummary}</span>
                      <button onClick={() => onArchiveNews(item.id)} className="text-[10px] text-[#A3A3A8] hover:text-white underline decoration-dashed">Arquivar</button>
                   </div>
                </div>
             ))
          )}
       </div>
    </div>
  );
};

// --- UPDATED: KELLY CRITERION CALCULATOR ---
const KellyCalculator = () => {
    const [odds, setOdds] = useState('2.00');
    const [winProb, setWinProb] = useState('55');
    const [bankroll, setBankroll] = useState('1000');
    
    const calculateKelly = () => {
        const b = parseFloat(odds) - 1;
        const p = parseFloat(winProb) / 100;
        const q = 1 - p;
        
        if (b <= 0 || p <= 0) return { percent: 0, amount: 0 };
        
        const f = (b * p - q) / b;
        const kellyPercent = Math.max(0, f * 100); // Full Kelly
        const safeKelly = kellyPercent * 0.5; // Half Kelly (Safer)
        
        return {
            percent: safeKelly.toFixed(2),
            amount: (parseFloat(bankroll) * (safeKelly / 100)).toFixed(2)
        };
    };

    const result = calculateKelly();

    return (
        <div className="bg-[#121214] border border-[#1C1C1F] p-4 mt-4">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-[#1C1C1F] pb-2">
                💰 Gestão de Banca (Kelly Criterion)
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                    <label className="text-[9px] text-gray-500 block">Odd</label>
                    <input type="number" step="0.01" value={odds} onChange={e => setOdds(e.target.value)} className="w-full bg-[#0B0B0D] border border-white/10 text-white text-xs p-1" />
                </div>
                <div>
                    <label className="text-[9px] text-gray-500 block">Prob (%)</label>
                    <input type="number" value={winProb} onChange={e => setWinProb(e.target.value)} className="w-full bg-[#0B0B0D] border border-white/10 text-white text-xs p-1" />
                </div>
                <div>
                    <label className="text-[9px] text-gray-500 block">Banca ($)</label>
                    <input type="number" value={bankroll} onChange={e => setBankroll(e.target.value)} className="w-full bg-[#0B0B0D] border border-white/10 text-white text-xs p-1" />
                </div>
            </div>
            <div className="flex justify-between items-center bg-[#0B0B0D] p-2 border border-white/5">
                <span className="text-[10px] text-gray-400">Sugestão (Half Kelly):</span>
                <span className="text-sm font-bold text-brand-500">{result.percent}% (${result.amount})</span>
            </div>
        </div>
    );
};

// --- UPDATED COMPONENT: MONKEY STATS TERMINAL WITH ATOMIC PERSISTENCE ---
interface MonkeyStatsTerminalProps {
    statsQueue: StatProcessedItem[];
    onStatProcessed: (item: StatProcessedItem) => Promise<void>; // Updated signature to Promise
}

export const MonkeyStatsTerminal: React.FC<MonkeyStatsTerminalProps> = ({ statsQueue, onStatProcessed }) => {
    const [entity, setEntity] = useState('');
    const [rawStat, setRawStat] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCrawling, setIsCrawling] = useState(false);

    const handleManualProcess = async () => {
        if (!entity || !rawStat) return;
        setIsProcessing(true);
        
        try {
            // 1. AI Generation
            const result = await processMonkeyStats(entity, rawStat);
            
            if (result) {
                // 2. Database Persistence (Atomic wait)
                setIsProcessing(false);
                setIsSaving(true);
                await onStatProcessed(result);
                
                // 3. Clear Inputs only after success
                setEntity('');
                setRawStat('');
            }
        } catch (e) {
            console.error("Pipeline Error", e);
            alert("Erro no fluxo de processamento. Tente novamente.");
        } finally {
            setIsProcessing(false);
            setIsSaving(false);
        }
    };

    const handleCrawler = async () => {
        setIsCrawling(true);
        try {
            const crawlerData = await fetchPlayerStatsCrawler();
            for (const item of crawlerData) {
                // Sequencial para não estourar rate limit da IA e Banco
                const result = await processMonkeyStats(item.entity, item.stat);
                if (result) await onStatProcessed(result);
            }
        } catch (e) {
            console.error(e);
        }
        setIsCrawling(false);
    };

    return (
        <div className="bg-[#0B0B0D] border border-[#1C1C1F] h-full flex flex-col font-sans">
            {/* Header */}
            <div className="p-6 border-b border-[#1C1C1F] flex justify-between items-center bg-[#121214]">
                <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        MONKEY STATS (PLAYER PROPS)
                    </h3>
                    <p className="text-[#A3A3A8] text-xs font-mono mt-1">MODULE: DEEP STATISTICS ANALYZER</p>
                </div>
                <button 
                    onClick={handleCrawler}
                    disabled={isCrawling}
                    className="bg-blue-900/20 border border-blue-500/30 text-blue-500 px-4 py-2 text-xs font-bold uppercase hover:bg-blue-900/40 disabled:opacity-50"
                >
                    {isCrawling ? 'Crawling Data...' : '🕷️ Run Stats Crawler'}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Input & Calculator */}
                <div className="w-1/3 p-4 border-r border-[#1C1C1F] flex flex-col overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Entidade (Jogador/Time)</label>
                            <input 
                                className="w-full bg-[#1C1C1F] text-white text-xs border border-white/10 px-3 py-3 outline-none focus:border-brand-500"
                                placeholder="Ex: Erling Haaland"
                                value={entity}
                                onChange={(e) => setEntity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Dado Bruto (Estatística)</label>
                            <textarea 
                                className="w-full bg-[#1C1C1F] text-white text-xs border border-white/10 px-3 py-3 outline-none focus:border-brand-500 resize-none h-24"
                                placeholder="Ex: 5 chutes no último jogo, 3 no alvo. Média de 1.2 gols esperados."
                                value={rawStat}
                                onChange={(e) => setRawStat(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleManualProcess}
                            disabled={isProcessing || isSaving || !entity || !rawStat}
                            className={`w-full text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors shadow-lg ${
                                isProcessing || isSaving ? 'bg-gray-700 cursor-wait' : 'bg-brand-600 hover:bg-brand-500'
                            }`}
                        >
                            {isProcessing ? '🧠 Analyzing via Gemini...' : isSaving ? '💾 Saving to Engine...' : 'PROCESS STAT'}
                        </button>
                    </div>

                    <div className="mt-auto">
                        <KellyCalculator />
                    </div>
                </div>

                {/* Right Panel: List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#09090B]">
                    {statsQueue.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[#27272A] opacity-50">
                            <p className="font-mono text-xs">AGUARDANDO DADOS...</p>
                        </div>
                    ) : (
                        statsQueue.map(item => (
                            <div key={item.id} className="bg-[#121214] border border-[#1C1C1F] p-4 flex gap-4 hover:border-blue-500/30 transition-all group relative">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] text-gray-600 font-mono">{new Date(item.processedAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center border-r border-[#1C1C1F] pr-4 w-24">
                                    <span className={`text-2xl font-bold ${item.probability > 70 ? 'text-green-500' : 'text-white'}`}>{item.probability}%</span>
                                    <span className="text-[9px] text-gray-500 uppercase">Probabilidade</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <h4 className="text-brand-500 font-bold text-sm">{item.entityName}</h4>
                                        <span className="text-[9px] text-gray-500 uppercase bg-[#1C1C1F] px-2 py-0.5 rounded border border-white/5">{item.category}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs mb-3 font-mono border-l-2 border-white/10 pl-2">"{item.rawData}"</p>
                                    <div className="bg-[#0B0B0D] p-3 border border-[#1C1C1F] border-l-2 border-l-blue-500">
                                        <p className="text-[9px] text-blue-500 uppercase font-bold mb-1 tracking-wider">Market Opportunity</p>
                                        <p className="text-sm font-bold text-white mb-1">{item.marketFocus}</p>
                                        <p className="text-[10px] text-gray-500 italic">{item.aiAnalysis}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const ActivationPanel = () => {
  const [keys, setKeys] = useState({
    gemini: '',
    football: '',
    supabaseUrl: '',
    supabaseKey: '',
    webhookUrl: '',
    statsProvider: ''
  });
  
  const [status, setStatus] = useState({
    gemini: 'idle',
    football: 'idle',
    supabase: 'idle',
    stats: 'idle'
  });

  // DEFAULT TO TRUE: Live Mode active by default
  const [liveMode, setLiveMode] = useState(true);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load saved keys and set status if they exist
    const savedGemini = localStorage.getItem('monkey_gemini_api_key') || '';
    const savedFootball = localStorage.getItem('monkey_football_api_key') || '';
    const savedSupaUrl = localStorage.getItem('supabase_project_url') || '';
    const savedSupaKey = localStorage.getItem('supabase_anon_key') || '';
    const savedWebhook = localStorage.getItem('monkey_webhook_url') || '';
    const savedStats = localStorage.getItem('monkey_stats_api_key') || '';

    setKeys({ 
        gemini: savedGemini, 
        football: savedFootball,
        supabaseUrl: savedSupaUrl, 
        supabaseKey: savedSupaKey,
        webhookUrl: savedWebhook,
        statsProvider: savedStats
    });

    if (savedGemini) setStatus(prev => ({ ...prev, gemini: 'success' }));
    if (savedFootball) setStatus(prev => ({ ...prev, football: 'success' }));
    if (savedSupaUrl && savedSupaKey) setStatus(prev => ({ ...prev, supabase: 'success' }));
    if (savedStats) setStatus(prev => ({ ...prev, stats: 'success' }));

  }, []);

  const handleSave = (keyType: string, value: string) => {
    setKeys(prev => ({ ...prev, [keyType]: value }));
    
    if (keyType === 'gemini') localStorage.setItem('monkey_gemini_api_key', value);
    if (keyType === 'football') localStorage.setItem('monkey_football_api_key', value);
    if (keyType === 'supabaseUrl') localStorage.setItem('supabase_project_url', value);
    if (keyType === 'supabaseKey') localStorage.setItem('supabase_anon_key', value);
    if (keyType === 'webhookUrl') localStorage.setItem('monkey_webhook_url', value);
    if (keyType === 'statsProvider') localStorage.setItem('monkey_stats_api_key', value);
  };
  
  const handleReset = () => {
      if(confirm("Tem certeza? Isso apagará todas as chaves salvas.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const handleTestWebhook = async () => {
      if (!keys.webhookUrl) {
          alert("Por favor, insira uma URL de Webhook primeiro.");
          return;
      }
      setTestStatus('loading');
      const success = await webhookService.sendTestMessage(keys.webhookUrl);
      
      if (success) {
          setTestStatus('success');
          setTimeout(() => setTestStatus('idle'), 3000);
          alert("✅ Sucesso! Verifique seu canal do Discord/Telegram.");
      } else {
          setTestStatus('error');
          setTimeout(() => setTestStatus('idle'), 3000);
          alert("❌ Falha no envio. Verifique a URL.");
      }
  };

  const testConnection = async (type: 'gemini' | 'football' | 'supabase' | 'stats') => {
    setStatus(prev => ({ ...prev, [type]: 'loading' }));
    
    try {
        if (type === 'football') {
            // Teste REAL RapidAPI
            const res = await fetch("https://v3.football.api-sports.io/status", {
                headers: {
                    "x-rapidapi-key": keys.football,
                    "x-rapidapi-host": "v3.football.api-sports.io"
                }
            });
            const data = await res.json();
            if (data.errors && Object.keys(data.errors).length > 0) throw new Error("API Error");
            if (res.ok) setStatus(prev => ({ ...prev, football: 'success' }));
            else throw new Error("Failed");
        } 
        else if (type === 'gemini') {
             // Teste REAL Gemini
             const ai = new GoogleGenAI({ apiKey: keys.gemini });
             await ai.models.generateContent({
                 model: "gemini-2.5-flash",
                 contents: "Test"
             });
             setStatus(prev => ({ ...prev, gemini: 'success' }));
        }
        else if (type === 'supabase') {
             // Teste REAL Supabase
             const { createClient } = await import('@supabase/supabase-js');
             const sb = createClient(keys.supabaseUrl, keys.supabaseKey);
             const { error } = await sb.from('tips').select('count', { count: 'exact', head: true });
             if (error) throw error;
             setStatus(prev => ({ ...prev, supabase: 'success' }));
        }
        else if (type === 'stats') {
             // Teste MonkeyStats Data Source
             const success = await testStatsProvider(keys.statsProvider);
             if (success) setStatus(prev => ({ ...prev, stats: 'success' }));
             else throw new Error("Stats Provider Failed");
        }
    } catch (e) {
        console.error(e);
        setStatus(prev => ({ ...prev, [type]: 'error' }));
    }
  };

  return (
    <div className="bg-surface-950 p-8 font-sans text-gray-200">
      <div className="flex items-center justify-between mb-12">
         <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">☁️</span>
                <h2 className="text-3xl font-display font-bold text-brand-500">Ativação & Configuração</h2>
            </div>
            <p className="text-gray-500 text-sm font-mono ml-12">Configure as chaves de API e endpoints de coleta de dados</p>
            <div className="ml-12 mt-2 flex items-center gap-2 text-[10px] text-yellow-600">
                <span>💡 Suas chaves são armazenadas de forma segura no navegador (LocalStorage)</span>
            </div>
         </div>
         <button onClick={handleReset} className="text-xs text-red-500 border border-red-500/30 px-4 py-2 hover:bg-red-500/10">
             RESETAR CONFIGURAÇÕES
         </button>
      </div>

      <div className="bg-black/40 border border-white/5 p-8 rounded-lg mb-12">
         <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <span className="text-brand-500">⚡</span>
            <h3 className="text-lg font-bold text-white">Configurações Globais</h3>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase">Intervalo de Coleta (segundos)</label>
                <input type="number" className="w-full bg-surface-900 border border-white/10 p-3 text-white focus:border-brand-500 focus:outline-none rounded-none" defaultValue={5} />
                <p className="text-[10px] text-gray-600 mt-1">Frequência de atualização dos dados (min: 10s, max: 300s)</p>
            </div>
            <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase">Modo Live</label>
                <div className="flex items-center gap-3 p-3 bg-surface-900 border border-white/10">
                    <div 
                        className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${liveMode ? 'bg-brand-500' : 'bg-gray-600'}`}
                        onClick={() => setLiveMode(!liveMode)}
                    >
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${liveMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <span className={`text-xs font-bold ${liveMode ? 'text-white' : 'text-gray-500'}`}>
                        {liveMode ? '● Ativado' : 'Desativado'}
                    </span>
                </div>
            </div>
         </div>
         
         {/* Webhook Configuration */}
         <div className="mt-8 pt-6 border-t border-white/5">
             <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase flex items-center gap-2">
                 🔗 Webhook Automático (Discord/Telegram/n8n)
                 <span className="text-[9px] bg-red-500/20 text-red-500 px-1 rounded">LIVE ACTION</span>
             </label>
             <div className="flex gap-2">
                 <input 
                     type="text" 
                     className="flex-1 bg-surface-900 border border-white/10 p-3 text-white focus:border-brand-500 focus:outline-none rounded-none text-sm font-mono" 
                     placeholder="https://discord.com/api/webhooks/..."
                     value={keys.webhookUrl}
                     onChange={(e) => handleSave('webhookUrl', e.target.value)}
                 />
                 <button 
                    onClick={handleTestWebhook}
                    disabled={testStatus === 'loading'}
                    className={`px-4 py-2 text-xs font-bold uppercase border transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        testStatus === 'success' ? 'bg-green-500 text-black border-green-500' :
                        testStatus === 'error' ? 'bg-red-500 text-white border-red-500' :
                        'bg-surface-800 text-white border-white/10 hover:bg-surface-700'
                    }`}
                 >
                     {testStatus === 'loading' && <span className="animate-spin">↻</span>}
                     {testStatus === 'loading' ? "Enviando..." : 
                      testStatus === 'success' ? "Enviado!" : 
                      testStatus === 'error' ? "Erro" : "Testar"}
                 </button>
             </div>
             <p className="text-[10px] text-gray-600 mt-1">URL para envio de alertas automáticos quando o sistema detectar "GREEN LIGHT".</p>
         </div>
      </div>
      
      <div className="space-y-6">
          {/* GOOGLE GEMINI CARD */}
          <div className="bg-surface-900/50 border border-white/5 p-6 relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <span className="text-xl">🧠</span>
                      <h4 className="font-bold text-white">Google Gemini AI</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${status.gemini === 'success' ? 'border-green-500 text-green-500 bg-green-500/10' : status.gemini === 'error' ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-600'}`}>
                          {status.gemini === 'success' ? 'CONECTADO' : status.gemini === 'error' ? 'ERRO' : 'PENDENTE'}
                      </span>
                  </div>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">API Key (Google AI Studio)</label>
                      <input 
                          type="password" 
                          className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono tracking-wider focus:border-brand-500 focus:outline-none"
                          placeholder="Paste your Gemini Key here..."
                          value={keys.gemini}
                          onChange={(e) => handleSave('gemini', e.target.value)}
                      />
                      <p className="text-[10px] text-gray-600 mt-1">Necessário para gerar as Tips. Obtenha em: aistudio.google.com</p>
                  </div>
                  <button 
                      onClick={() => testConnection('gemini')}
                      className="w-full bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                      {status.gemini === 'loading' ? 'Validando...' : '⚡ Validar Chave'}
                  </button>
              </div>
          </div>

          {/* API FOOTBALL CARD */}
          <div className="bg-surface-900/50 border border-white/5 p-6 relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <span className="text-xl">⚽</span>
                      <h4 className="font-bold text-white">API-Football (RapidAPI)</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${status.football === 'success' ? 'border-green-500 text-green-500 bg-green-500/10' : status.football === 'error' ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-600'}`}>
                          {status.football === 'success' ? 'CONECTADO' : status.football === 'error' ? 'ERRO' : 'DESCONECTADO'}
                      </span>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">API Key (RapidAPI)</label>
                      <input 
                          type="password" 
                          className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono tracking-wider focus:border-brand-500 focus:outline-none"
                          placeholder="Paste RapidAPI Key..."
                          value={keys.football}
                          onChange={(e) => handleSave('football', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">Endpoint</label>
                      <input type="text" className="w-full bg-black/50 border border-white/10 p-3 text-gray-500 text-sm font-mono" value="https://v3.football.api-sports.io" disabled />
                  </div>
              </div>
              <button 
                  onClick={() => testConnection('football')}
                  className="w-full mt-4 bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                   {status.football === 'loading' ? 'Testando...' : '⚡ Testar Conexão'}
              </button>
          </div>

          {/* MONKEY STATS CORE CARD */}
          <div className="bg-surface-900/50 border border-white/5 p-6 relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <span className="text-xl">📊</span>
                      <h4 className="font-bold text-white">MonkeyStats Data Core</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${status.stats === 'success' ? 'border-green-500 text-green-500 bg-green-500/10' : status.stats === 'error' ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-600'}`}>
                          {status.stats === 'success' ? 'CONECTADO' : status.stats === 'error' ? 'ERRO' : 'PENDENTE'}
                      </span>
                  </div>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">Stats Provider Key (NBA/Player Props)</label>
                      <input 
                          type="password" 
                          className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono tracking-wider focus:border-brand-500 focus:outline-none"
                          placeholder="Paste Advanced Stats Key..."
                          value={keys.statsProvider}
                          onChange={(e) => handleSave('statsProvider', e.target.value)}
                      />
                      <p className="text-[10px] text-gray-600 mt-1">Habilita o crawler de estatísticas profundas (Player Props & Advanced Metrics).</p>
                  </div>
                  <button 
                      onClick={() => testConnection('stats')}
                      className="w-full bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                      {status.stats === 'loading' ? 'Verificando...' : '⚡ Testar Crawler'}
                  </button>
              </div>
          </div>

          {/* SUPABASE CARD */}
          <div className="bg-surface-900/50 border border-white/5 p-6 relative overflow-hidden group hover:border-brand-500/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <span className="text-xl">🗄️</span>
                      <h4 className="font-bold text-white">Supabase Database</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${status.supabase === 'success' ? 'border-green-500 text-green-500 bg-green-500/10' : status.supabase === 'error' ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-600'}`}>
                          {status.supabase === 'success' ? 'CONECTADO' : status.supabase === 'error' ? 'ERRO' : 'DESCONECTADO'}
                      </span>
                  </div>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">Project URL</label>
                      <input 
                          type="text" 
                          className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono tracking-wider focus:border-brand-500 focus:outline-none"
                          placeholder="https://xyz.supabase.co"
                          value={keys.supabaseUrl}
                          onChange={(e) => handleSave('supabaseUrl', e.target.value)}
                      />
                  </div>
                  <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 mb-1 uppercase">Anon Public Key</label>
                      <input 
                          type="password" 
                          className="w-full bg-black/50 border border-white/10 p-3 text-white text-sm font-mono tracking-wider focus:border-brand-500 focus:outline-none"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                          value={keys.supabaseKey}
                          onChange={(e) => handleSave('supabaseKey', e.target.value)}
                      />
                  </div>
                  <button 
                      onClick={() => testConnection('supabase')}
                      className="w-full bg-white text-black hover:bg-brand-400 font-bold py-3 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                      {status.supabase === 'loading' ? 'Conectando...' : '⚡ Testar Banco de Dados'}
                  </button>
              </div>
          </div>
      </div>
      
      <div className="mt-12 border-t border-white/5 pt-8">
          <h3 className="text-sm font-mono uppercase text-gray-500 mb-4">Controle de Versão & Deploy</h3>
          <div className="bg-black/30 p-4 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <div className="bg-white/5 p-2 rounded"><span className="text-xl">📦</span></div>
                  <div>
                      <p className="text-white font-bold text-sm">Monkey Tips v2.0-Release</p>
                      <p className="text-gray-500 text-xs font-mono">Branch: main | Build: Stable</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-green-500 text-xs font-bold uppercase mb-1">● Deploy Ativo</p>
                  <p className="text-gray-600 text-[10px]">Vercel Production</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export const TipsHistoryPanel = ({ tips, onUpdateStatus }: { tips: Tip[], onUpdateStatus: (id: string, status: TipStatus) => void }) => {
    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6 h-[500px] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">Histórico de Palpites</h3>
            <div className="space-y-4">
                {tips.map(tip => (
                    <div key={tip.id} className="bg-black/30 p-4 border border-white/5 flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-[10px] font-mono uppercase bg-white/10 px-2 rounded text-gray-300">{tip.sport}</span>
                                     <span className="text-xs text-gray-500">{new Date(tip.createdAt).toLocaleDateString()}</span>
                                 </div>
                                 <h4 className="text-white font-bold text-sm">{tip.matchTitle}</h4>
                                 <p className="text-brand-500 text-xs font-mono mt-1">Target: {tip.prediction} @ {tip.odds}</p>
                             </div>
                             <div className="flex flex-col gap-2 items-end">
                                 <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                                     tip.status === 'Won' ? 'bg-green-500/20 border-green-500 text-green-500' :
                                     tip.status === 'Lost' ? 'bg-red-500/20 border-red-500 text-red-500' :
                                     'bg-gray-500/20 border-gray-500 text-gray-400'
                                 }`}>
                                     {tip.status}
                                 </span>
                                 <div className="flex gap-1">
                                    {tip.status === 'Pending' && (
                                        <>
                                            <button onClick={() => onUpdateStatus(tip.id, 'Won')} className="text-[10px] bg-green-900 hover:bg-green-800 text-green-200 px-2 py-1 border border-green-700">WIN</button>
                                            <button onClick={() => onUpdateStatus(tip.id, 'Lost')} className="text-[10px] bg-red-900 hover:bg-red-800 text-red-200 px-2 py-1 border border-red-700">LOSS</button>
                                        </>
                                    )}
                                 </div>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const OperationalChecklist = () => {
    const items: ChecklistItem[] = [
        { id: '1', label: 'Verificar Conexão API Football', checked: true },
        { id: '2', label: 'Validar Chaves Gemini AI', checked: true },
        { id: '3', label: 'Sincronizar Banco de Dados', checked: true },
        { id: '4', label: 'Monitoramento de Erros Ativo', checked: false },
    ];
    
    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Checklist Operacional</h3>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                        <div className={`w-4 h-4 border flex items-center justify-center ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                            {item.checked && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                        <span className={`text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-white'}`}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ProjectEvolutionRoadmap = () => {
    const phases: RoadmapPhase[] = [
        { id: '1', title: 'Phase 1: Foundation', description: 'Core architecture and database', status: 'COMPLETED', progress: 100, tasks: [] },
        { id: '2', title: 'Phase 2: Intelligence', description: 'Gemini integration and Fusion Engine', status: 'COMPLETED', progress: 100, tasks: [] },
        { id: '3', title: 'Phase 3: Real-time', description: 'Live Engine and Webhooks', status: 'IN_PROGRESS', progress: 65, tasks: [] },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {phases.map(phase => (
                <div key={phase.id} className={`p-4 border ${phase.status === 'COMPLETED' ? 'bg-green-900/10 border-green-500/30' : phase.status === 'IN_PROGRESS' ? 'bg-brand-900/10 border-brand-500/30' : 'bg-surface-900 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-white font-bold text-sm">{phase.title}</h4>
                        <span className="text-[10px] font-mono">{phase.progress}%</span>
                    </div>
                    <p className="text-gray-500 text-xs mb-3">{phase.description}</p>
                    <div className="w-full bg-surface-800 h-1">
                        <div className={`h-full ${phase.status === 'COMPLETED' ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${phase.progress}%` }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const ImprovementsPanel = () => {
  const improvements: ImprovementProposal[] = [
    { id: '1', title: 'Better Mobile UI', description: 'Enhance responsiveness for small screens', votes: 10, status: 'Pending' },
    { id: '2', title: 'Dark Mode Toggle', description: 'Allow users to switch themes', votes: 5, status: 'Approved' },
  ];

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
      <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Propostas de Melhoria</h3>
      <div className="space-y-3">
        {improvements.map(imp => (
            <div key={imp.id} className="bg-black/20 p-3 border border-white/5 flex justify-between items-center">
                <div>
                    <p className="text-white text-sm font-bold">{imp.title}</p>
                    <p className="text-gray-500 text-xs">{imp.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-brand-500 text-xs font-bold">{imp.votes} Votes</span>
                    <span className={`text-[10px] px-2 py-0.5 border ${imp.status === 'Approved' ? 'border-green-500 text-green-500' : 'border-gray-500 text-gray-500'}`}>{imp.status}</span>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export const NewsImplementationChecklist = () => {
    const items = [
        { label: 'RSS Reader Bridge', done: true },
        { label: 'Gemini Context Analyzer', done: true },
        { label: 'Fusion Engine Link', done: true },
        { label: 'Real-time Webhook', done: false },
    ];
    
    return (
        <div className="bg-surface-900 border border-white/5 p-6 h-full">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest border-b border-white/5 pb-2">Modules Status</h3>
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.done ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                        <span className={`text-xs font-mono ${item.done ? 'text-white' : 'text-gray-500'}`}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
