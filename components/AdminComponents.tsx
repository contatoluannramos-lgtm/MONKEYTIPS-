
import React, { useState, useEffect } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase, Tip, TipStatus, CalibrationConfig, ScoutResult, FusionAnalysis, NewsAnalysis, TARGET_TEAMS_BRASILEIRAO, NewsProcessedItem, BotNewsPayload, Match } from '../types';
import { dbService } from '../services/databaseService';
import { GoogleGenAI } from "@google/genai";
import { analyzeSportsNews, processBotNews } from '../services/geminiService';
import { DEFAULT_CALIBRATION, runScoutAnalysis } from '../services/scoutEngine';
import { runFusionEngine } from '../services/fusionEngine';
import { webhookService } from '../services/webhookService';

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

      <p className="text-[10px] text-gray-400 border-l border-brand-500 pl-2">
        {result.details}
      </p>
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
    const [autoFire, setAutoFire] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
  
    useEffect(() => {
        const savedUrl = localStorage.getItem('monkey_webhook_url');
        if (savedUrl) setWebhookUrl(savedUrl);
    }, []);
  
    useEffect(() => {
        // Filter only live matches
        const live = matches.filter(m => m.status === 'Live');
        setLiveMatches(live);
    }, [matches]);
  
    useEffect(() => {
        // SCHEDULER: Updates every 30 seconds
        const interval: ReturnType<typeof setInterval> = setInterval(() => {
            setLastUpdate(new Date());
            processLiveCycle();
        }, 30000); // 30s cycle
  
        return () => clearInterval(interval);
    }, [liveMatches, autoFire, webhookUrl]);
  
    const processLiveCycle = () => {
        const time = new Date().toLocaleTimeString();
        // Run Fusion Analysis on Live Matches
        liveMatches.forEach(async (match) => {
             const tip = tips.find(t => t.matchId === match.id) || null;
             const config = DEFAULT_CALIBRATION; // Or load user config
             const scout = runScoutAnalysis(match, config);
             const fusion = runFusionEngine(match, scout, tip);
  
             if (fusion.verdict === 'GREEN_LIGHT') {
                 addLog(`[${time}] GREEN LIGHT: ${match.teamA} vs ${match.teamB} (Conf: ${fusion.finalConfidence}%)`);
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
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            MONKEY LIVE ENGINE
                        </h3>
                        <p className="text-xs font-mono text-gray-500">CYCLE: 30s | REAL-TIME MONITORING</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                             <p className="text-[10px] text-gray-500 uppercase">Last Update</p>
                             <p className="text-white font-mono">{lastUpdate.toLocaleTimeString()}</p>
                        </div>
                        <button 
                            onClick={() => setAutoFire(!autoFire)}
                            className={`px-4 py-2 text-xs font-bold uppercase border ${
                                autoFire ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-800 border-gray-600 text-gray-500'
                            }`}
                        >
                            {autoFire ? '🚨 AUTO-FIRE: ON' : 'AUTO-FIRE: OFF'}
                        </button>
                    </div>
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveMatches.length === 0 ? (
                        <div className="col-span-full py-20 text-center border border-dashed border-white/10 text-gray-500 font-mono">
                            NENHUMA PARTIDA AO VIVO DETECTADA NO MOMENTO.
                        </div>
                    ) : liveMatches.map(m => {
                         const scout = runScoutAnalysis(m, DEFAULT_CALIBRATION);
                         return (
                            <div key={m.id} className="bg-surface-900 border border-white/5 p-4 relative overflow-hidden">
                                {scout.isHotGame && <div className="absolute top-0 right-0 p-1 bg-red-500/20 text-[10px] text-red-500 font-bold uppercase">HOT 🔥</div>}
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
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FUTEBOL' | 'BASQUETE'>('ALL');

  const handleManualIngest = async () => {
      if (!manualInput.trim()) return;
      setIsProcessing(true);
      
      let payload: BotNewsPayload;

      if (inputType === 'JSON') {
          try {
              const json = JSON.parse(manualInput);
              if (!json.title || !json.summary) throw new Error("JSON inválido: title e summary obrigatórios.");
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
          // Mock a bot payload from manual input to reuse the same processing pipeline
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

      // Use the Bot Processor to keep consistency
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

       {/* Controls Area */}
       <div className="p-4 border-b border-[#1C1C1F] bg-[#0B0B0D]">
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
                placeholder={inputType === 'JSON' ? 'Cole o JSON do Bot: {"title": "...", "summary": "..."}' : inputType === 'URL' ? "Cole o link da notícia..." : "Cole o texto da notícia..."}
                className="flex-1 bg-[#1C1C1F] text-white text-xs border border-white/10 px-4 py-3 focus:border-brand-500 outline-none font-mono"
              />
              <button 
                onClick={handleManualIngest}
                disabled={isProcessing || !manualInput}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'PROCESSANDO...' : 'PROCESSAR'}
              </button>
          </div>
          {inputType === 'JSON' && <p className="text-[10px] text-gray-500 mt-2 font-mono">* Modo Debug: Cole aqui o payload que seu bot enviaria para o webhook.</p>}
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
                <p className="mt-4 font-mono text-xs">AGUARDANDO DADOS (MANUAL OU BOT)...</p>
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

export const ActivationPanel = () => {
  const [keys, setKeys] = useState({
    gemini: '',
    football: '',
    supabaseUrl: '',
    supabaseKey: '',
    webhookUrl: ''
  });
  
  const [status, setStatus] = useState({
    gemini: 'idle',
    football: 'idle',
    supabase: 'idle'
  });

  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => {
    // Load saved keys and set status if they exist
    const savedGemini = localStorage.getItem('monkey_gemini_api_key') || '';
    const savedFootball = localStorage.getItem('monkey_football_api_key') || '';
    const savedSupaUrl = localStorage.getItem('supabase_project_url') || '';
    const savedSupaKey = localStorage.getItem('supabase_anon_key') || '';
    const savedWebhook = localStorage.getItem('monkey_webhook_url') || '';

    setKeys({ 
        gemini: savedGemini, 
        football: savedFootball,
        supabaseUrl: savedSupaUrl, 
        supabaseKey: savedSupaKey,
        webhookUrl: savedWebhook
    });

    if (savedGemini) setStatus(prev => ({ ...prev, gemini: 'success' }));
    if (savedFootball) setStatus(prev => ({ ...prev, football: 'success' }));
    if (savedSupaUrl && savedSupaKey) setStatus(prev => ({ ...prev, supabase: 'success' }));

  }, []);

  const handleSave = (keyType: string, value: string) => {
    setKeys(prev => ({ ...prev, [keyType]: value }));
    
    if (keyType === 'gemini') localStorage.setItem('monkey_gemini_api_key', value);
    if (keyType === 'football') localStorage.setItem('monkey_football_api_key', value);
    if (keyType === 'supabaseUrl') localStorage.setItem('supabase_project_url', value);
    if (keyType === 'supabaseKey') localStorage.setItem('supabase_anon_key', value);
    if (keyType === 'webhookUrl') localStorage.setItem('monkey_webhook_url', value);
  };
  
  const handleReset = () => {
      if(confirm("Tem certeza? Isso apagará todas as chaves salvas.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const testConnection = async (type: 'gemini' | 'football' | 'supabase') => {
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
                 <button className="bg-surface-800 text-white px-4 py-2 text-xs font-bold uppercase border border-white/10 hover:bg-surface-700">
                     Testar
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
                      <p className="text-white font-bold text-sm">Monkey Tips v2.1-beta</p>
                      <p className="text-gray-500 text-xs font-mono">Branch: main | Commit: {Math.random().toString(16).substr(2, 7)}</p>
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

export const ProjectEvolutionRoadmap = () => {
  const [phases, setPhases] = useState<RoadmapPhase[]>([
    {
      id: 'p1',
      title: 'FASE 1: v1.5 - CORE (RODANDO)',
      description: 'Módulos Ativos: Pré-jogo, Live Padrão, Pré-Tips e Pipeline de Respostas.',
      status: 'COMPLETED',
      progress: 100,
      tasks: [
        { id: 't1_1', name: 'Modo Pré-Jogo (DanielScore)', isCompleted: true },
        { id: 't1_2', name: 'Live Padrão (Gol/Canto/Cartão)', isCompleted: true },
        { id: 't1_3', name: 'Pré-Tips Projetivas', isCompleted: true }
      ]
    },
    {
      id: 'p2',
      title: 'FASE 2: v1.6 - BACKEND API',
      description: 'Estrutura de APIs Server-side e validação de dados.',
      status: 'PENDING',
      progress: 0,
      tasks: [
        { id: 't2_1', name: 'API Endpoints (/tips/live, /pre)', isCompleted: false },
        { id: 't2_2', name: 'Validação Server-side', isCompleted: false },
        { id: 't2_3', name: 'Compatibilidade Vercel Edge', isCompleted: false }
      ]
    },
    {
      id: 'p3',
      title: 'FASE 3: v1.7 - INTERFACE',
      description: 'Painéis Oficiais, Dashboard Dark Mode e Layout Responsivo.',
      status: 'COMPLETED',
      progress: 100,
      tasks: [
        { id: 't3_1', name: 'Interface Monkey Dark', isCompleted: true },
        { id: 't3_2', name: 'Painéis Admin & Analista', isCompleted: true },
        { id: 't3_3', name: 'Dashboard Estatístico', isCompleted: true }
      ]
    },
    {
      id: 'p4',
      title: 'FASE 4: v1.8 - NEWS ENGINE',
      description: 'Automação Híbrida, Classificador de Relevância e Impacto.',
      status: 'IN_PROGRESS',
      progress: 80,
      tasks: [
        { id: 't4_1', name: 'Classificador de Relevância', isCompleted: true },
        { id: 't4_2', name: 'Módulo de Impacto na Aposta', isCompleted: true },
        { id: 't4_3', name: 'Histórico Supabase', isCompleted: true },
        { id: 't4_4', name: 'Automação Total (Scheduler)', isCompleted: false }
      ]
    },
    {
      id: 'p5',
      title: 'FASE 5: v1.9 - LIVE ENGINE',
      description: 'Coleta Real-Time, Algoritmo de Ritmo e Detecção de Spikes.',
      status: 'IN_PROGRESS',
      progress: 70,
      tasks: [
        { id: 't5_1', name: 'Engine Coleta Ao Vivo', isCompleted: true },
        { id: 't5_2', name: 'Pipeline Automático (Scout)', isCompleted: true },
        { id: 't5_3', name: 'Algoritmo de Ritmo (Pace/xG)', isCompleted: true },
        { id: 't5_4', name: 'Detecção de Spikes', isCompleted: false }
      ]
    },
    {
      id: 'p6',
      title: 'FASE 6: v2.0 - LANÇAMENTO',
      description: 'Plataforma 100% Autônoma, Reports e Operação 24/7.',
      status: 'PENDING',
      progress: 0,
      tasks: [
        { id: 't6_1', name: 'Live 100% Autônomo', isCompleted: false },
        { id: 't6_2', name: 'Pré-jogo integrado ao Fusion', isCompleted: false },
        { id: 't6_3', name: 'Sistema 24/7 Estável', isCompleted: false }
      ]
    }
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {phases.map(phase => (
          <div key={phase.id} className="bg-surface-900 border border-white/5 relative overflow-hidden group hover:border-brand-500/30 transition-all">
             {/* Progress Bar Top */}
             <div className="absolute top-0 left-0 w-full h-1 bg-surface-800">
                <div className={`h-full ${phase.status === 'COMPLETED' ? 'bg-green-500' : phase.status === 'IN_PROGRESS' ? 'bg-brand-500' : 'bg-gray-700'}`} style={{ width: `${phase.progress}%` }}></div>
             </div>

             <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                   <h4 className="text-xs font-bold text-white uppercase">{phase.title}</h4>
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      phase.status === 'COMPLETED' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                      phase.status === 'IN_PROGRESS' ? 'text-brand-500 border-brand-500/30 bg-brand-500/10' :
                      'text-gray-500 border-gray-600'
                   }`}>{phase.progress}%</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-4 leading-relaxed min-h-[2.5em]">{phase.description}</p>
                
                <div className="space-y-2">
                   {phase.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2">
                         <div className={`w-3 h-3 flex items-center justify-center border ${task.isCompleted ? 'bg-brand-500 border-brand-500' : 'border-gray-600'}`}>
                            {task.isCompleted && <svg className="w-2 h-2 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                         </div>
                         <span className={`text-xs font-mono ${task.isCompleted ? 'text-gray-300 line-through decoration-brand-500/50' : 'text-gray-500'}`}>
                            {task.name}
                         </span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       ))}
    </div>
  );
};

export const ImprovementsPanel = () => {
  const [proposals, setProposals] = useState<ImprovementProposal[]>([
    { id: '1', title: 'Adicionar eSports (LoL)', description: 'Incluir rastreamento de dragões e ouro.', votes: 42, status: 'Pending' },
    { id: '2', title: 'Melhorar filtro de odds', description: 'Permitir filtrar por range de odds (ex: 1.5 - 2.0)', votes: 28, status: 'Implemented' },
    { id: '3', title: 'Integração Telegram Bot', description: 'Envio automático de sinais via bot.', votes: 12, status: 'Approved' },
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display">
        💡 Melhorias do Sistema
      </h3>
      <div className="space-y-4">
        {proposals.map((prop) => (
          <div key={prop.id} className="bg-surface-900 border border-white/5 p-4 flex justify-between items-center hover:border-white/20 transition-colors">
            <div>
              <h4 className="font-bold text-gray-200 text-sm">{prop.title}</h4>
              <p className="text-gray-500 text-xs mt-1">{prop.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[10px] uppercase font-bold px-2 py-1 border ${
                prop.status === 'Implemented' ? 'border-green-500 text-green-500' : 
                prop.status === 'Approved' ? 'border-brand-500 text-brand-500' : 'border-gray-600 text-gray-500'
              }`}>
                {prop.status}
              </span>
              <span className="text-gray-400 text-xs font-mono">{prop.votes} votos</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OperationalChecklist = () => {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', label: 'Verificar Conexão API Football', checked: false },
    { id: '2', label: 'Validar Saldo Banca (Mock)', checked: false },
    { id: '3', label: 'Revisar Parâmetros de Risco', checked: true },
    { id: '4', label: 'Limpar Cache de Sessão', checked: false },
  ]);

  // Load checklist state from local storage on mount
  useEffect(() => {
      const saved = localStorage.getItem('monkey_ops_checklist');
      if (saved) {
          setItems(JSON.parse(saved));
      }
  }, []);

  const toggleItem = (id: string) => {
    const newItems = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(newItems);
    localStorage.setItem('monkey_ops_checklist', JSON.stringify(newItems));
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6 rounded-none">
      <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        📄 Checklist Operacional
      </h3>
      <div className="space-y-3">
        {items.map(item => (
          <div 
            key={item.id} 
            onClick={() => toggleItem(item.id)}
            className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${
              item.checked ? 'bg-green-900/10 border-green-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'
            }`}
          >
            <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${
              item.checked ? 'bg-green-500 border-green-500' : 'border-gray-600'
            }`}>
              {item.checked && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className={`text-xs font-mono ${item.checked ? 'text-green-500 line-through' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TipsHistoryPanel = ({ tips, onUpdateStatus }: { tips: Tip[], onUpdateStatus: (id: string, status: TipStatus) => void }) => {
  const pendingTips = tips.filter(t => t.status === 'Pending');
  
  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6 rounded-none">
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Histórico de Sinais (Validação)</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {pendingTips.length === 0 && <p className="text-xs text-gray-500 italic">Nenhum sinal pendente.</p>}
            
            {pendingTips.map(tip => (
                <div key={tip.id} className="flex justify-between items-center bg-black/30 p-3 border border-white/5">
                    <div>
                        <p className="text-white text-xs font-bold">{tip.matchTitle}</p>
                        <p className="text-brand-500 text-[10px] font-mono">{tip.prediction} @ {tip.odds.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdateStatus(tip.id, 'Won')}
                            className="px-2 py-1 bg-green-900/20 border border-green-500/50 text-green-500 text-[10px] uppercase hover:bg-green-500 hover:text-black transition-colors"
                        >
                            Green
                        </button>
                        <button 
                            onClick={() => onUpdateStatus(tip.id, 'Lost')}
                            className="px-2 py-1 bg-red-900/20 border border-red-500/50 text-red-500 text-[10px] uppercase hover:bg-red-500 hover:text-black transition-colors"
                        >
                            Red
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export const NewsImplementationChecklist = () => {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', label: 'Conectar backend real', checked: true },
    { id: '2', label: 'Ativar Scheduler Automático', checked: true },
    { id: '3', label: 'Criar classificador relevância', checked: true },
    { id: '4', label: 'Integrar Fusion Engine', checked: true },
    { id: '5', label: 'Criar histórico Supabase', checked: true },
    { id: '6', label: 'Frontend responsivo/animado', checked: true },
    { id: '7', label: 'Criar modo Monkey Live', checked: true },
    { id: '8', label: 'Webhook disparo automático', checked: true },
  ]);

  const toggle = (id: string) => {
     setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  return (
     <div className="bg-[#121214] border border-[#1C1C1F] p-6">
        <h3 className="text-white font-bold text-sm mb-4 border-b border-[#1C1C1F] pb-2">IMPLANTAÇÃO NEWS ENGINE</h3>
        <div className="space-y-2">
           {items.map(item => (
              <div key={item.id} onClick={() => toggle(item.id)} className="flex items-center gap-3 cursor-pointer hover:bg-[#1C1C1F] p-2 rounded">
                 <div className={`w-4 h-4 border rounded-sm flex items-center justify-center ${item.checked ? 'bg-brand-500 border-brand-500' : 'border-gray-600'}`}>
                    {item.checked && <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                 </div>
                 <span className={`text-xs font-mono ${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{item.label}</span>
              </div>
           ))}
        </div>
     </div>
  );
};
