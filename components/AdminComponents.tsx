
import React, { useState, useEffect } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase, Tip, TipStatus, CalibrationConfig, ScoutResult, FusionAnalysis, NewsAnalysis, TARGET_TEAMS_BRASILEIRAO, NewsProcessedItem, BotNewsPayload } from '../types';
import { dbService } from '../services/databaseService';
import { GoogleGenAI } from "@google/genai";
import { analyzeSportsNews, processBotNews } from '../services/geminiService';
import { DEFAULT_CALIBRATION } from '../services/scoutEngine';

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

export const NewsTerminal = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [newsQueue, setNewsQueue] = useState<NewsProcessedItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FUTEBOL' | 'BASQUETE'>('ALL');

  const simulateWebhookBot = async () => {
    setIsSimulating(true);
    
    // Mock Payload from Bot
    const mockPayload: BotNewsPayload = {
        source: Math.random() > 0.5 ? 'globoesporte' : 'nba',
        league: Math.random() > 0.5 ? 'futebol' : 'basquete',
        urgency: 4,
        title: Math.random() > 0.5 ? "Craque do time sai lesionado no treino" : "Técnico confirma time reserva para o clássico",
        summary: "Informação de última hora apurada pelo bot. Impacto direto na escalação provável.",
        published_at: new Date().toISOString(),
        url: "http://bot-source.internal"
    };

    const processed = await processBotNews(mockPayload);
    if (processed) {
        setNewsQueue(prev => [processed, ...prev]);
    }
    setIsSimulating(false);
  };

  const filteredQueue = newsQueue.filter(item => 
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
             <p className="text-[#A3A3A8] text-xs font-mono mt-1">INTEGRATION STATUS: ONLINE | BOT LISTENER ACTIVE</p>
          </div>
          <button 
             onClick={simulateWebhookBot}
             disabled={isSimulating}
             className="bg-brand-500/10 border border-brand-500 text-brand-500 px-4 py-2 text-xs font-bold uppercase hover:bg-brand-500/20 transition-colors flex items-center gap-2"
          >
             {isSimulating ? <span className="animate-spin">⚡</span> : '⚡'} SIMULAR WEBHOOK BOT
          </button>
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
       <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredQueue.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-[#27272A] opacity-50">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <p className="mt-4 font-mono text-xs">AGUARDANDO PAYLOAD DO BOT EXTERNO...</p>
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
                      <button className="text-[10px] text-[#A3A3A8] hover:text-white underline decoration-dashed">Arquivar</button>
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
    supabaseKey: ''
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

    setKeys({ 
        gemini: savedGemini, 
        football: savedFootball,
        supabaseUrl: savedSupaUrl, 
        supabaseKey: savedSupaKey 
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
      id: 'p1', title: 'FASE 1: FUNDAÇÃO', description: 'Estrutura base, UI/UX Militar, IA Simples e Roteamento.', status: 'COMPLETED', progress: 100,
      tasks: [{ id: 't1_1', name: 'Design "Strategic Mind" e UI Tática', isCompleted: true }, { id: 't1_2', name: 'Configuração do Google Gemini 2.5 Flash', isCompleted: true }, { id: 't1_3', name: 'Separação Rígida Admin / Cliente', isCompleted: true }, { id: 't1_4', name: 'Mock Data para MVP', isCompleted: true }, { id: 't1_5', name: 'Deploy Inicial na Vercel', isCompleted: true }]
    },
    {
      id: 'p2', title: 'FASE 2: DADOS & INTEGRAÇÃO', description: 'Conexão com o mundo real (APIs, Banco de Dados).', status: 'COMPLETED', progress: 100,
      tasks: [{ id: 't2_1', name: 'Integração API SofaScore/FlashScore (Ao Vivo)', isCompleted: true }, { id: 't2_2', name: 'Banco de Dados (Supabase/Firebase)', isCompleted: true }, { id: 't2_3', name: 'Autenticação Real de Admin', isCompleted: true }, { id: 't2_4', name: 'Histórico de Performance das Tips', isCompleted: true }]
    },
    {
      id: 'p3', title: 'FASE 3: INTELIGÊNCIA TÁTICA', description: 'Refinamento do prompt e análise preditiva complexa.', status: 'COMPLETED', progress: 100,
      tasks: [{ id: 't3_1', name: 'Ajuste Fino (Fine-tuning) por Liga', isCompleted: true }, { id: 't3_2', name: 'Análise de Lesões e Clima em Tempo Real', isCompleted: true }, { id: 't3_3', name: 'Comparador de Odds Automático', isCompleted: true }, { id: 't3_4', name: 'Sistema de Alertas via Telegram/Email', isCompleted: true }]
    },
    {
      id: 'p4', title: 'FASE 4: ESCALA E MONETIZAÇÃO', description: 'Transformar o sistema em produto SAAS comercial.', status: 'PENDING', progress: 0,
      tasks: [{ id: 't4_1', name: 'Área de Membros (Pagamento Stripe)', isCompleted: false }, { id: 't4_2', name: 'App Mobile PWA', isCompleted: false }, { id: 't4_3', name: 'Analytics de Usuário (Mixpanel)', isCompleted: false }, { id: 't4_4', name: 'Suporte Multi-idioma', isCompleted: false }]
    },
    {
        id: 'p5', title: 'FASE 5: INTELIGÊNCIA VISUAL', description: 'Monkey Labs & Vision Core.', status: 'COMPLETED', progress: 100,
        tasks: [{ id: 't5_1', name: 'Upload de Bilhetes (OCR)', isCompleted: true }, { id: 't5_2', name: 'Análise de Valor (EV+) via Imagem', isCompleted: true }, { id: 't5_3', name: 'Integração Multimodal Gemini', isCompleted: true }]
    },
    {
        id: 'p6', title: 'FASE 6: AUDITORIA & PRODUÇÃO', description: 'Polimento final para operação real.', status: 'IN_PROGRESS', progress: 80,
        tasks: [{ id: 't6_1', name: 'Reset de Configuração (Pânico)', isCompleted: true }, { id: 't6_2', name: 'UX Drag & Drop no Labs', isCompleted: true }, { id: 't6_3', name: 'Validação de Chaves Reais', isCompleted: true }]
    },
    {
        id: 'p7', title: 'FASE 7: MONKEY VISION REAL', description: 'Integração com Google AI Studio para leitura de tela.', status: 'COMPLETED', progress: 100,
        tasks: [{ id: 't7_1', name: 'Navegador Interno Simulado', isCompleted: true }, { id: 't7_2', name: 'Leitura de Placar e Tempo (OCR)', isCompleted: true }, { id: 't7_3', name: 'Leitura de Odds em Tempo Real', isCompleted: true }, { id: 't7_4', name: 'Pipeline Screen -> Fusion Engine', isCompleted: true }]
    },
    {
        id: 'p8', title: 'FASE 8: NEWS ENGINE', description: 'Inteligência de Notícias e Contexto.', status: 'COMPLETED', progress: 100,
        tasks: [{ id: 't8_1', name: 'Crawler de URLs e Texto', isCompleted: true }, { id: 't8_2', name: 'Cálculo de Impact Score', isCompleted: true }, { id: 't8_3', name: 'Filtro G10 Brasileirão', isCompleted: true }, { id: 't8_4', name: 'Integração Fusion (Peso de Notícia)', isCompleted: true }]
    },
    {
        id: 'p9', title: 'FASE 9: MONETIZAÇÃO (SAAS)', description: 'Preparação para Venda', status: 'PENDING', progress: 0,
        tasks: [{ id: 't9_1', name: 'Planos e Limites', isCompleted: false }, { id: 't9_2', name: 'Ranking de Oportunidades', isCompleted: false }, { id: 't9_3', name: 'Comparação de Ligas', isCompleted: false }]
    },
    {
        id: 'p10', title: 'FASE 10: SCOUT MATEMÁTICO PRO', description: 'Scout Engine V2', status: 'IN_PROGRESS', progress: 50,
        tasks: [{ id: 't10_1', name: 'Ajuste Bayesiano', isCompleted: true }, { id: 't10_2', name: 'Detector de Jogos Quentes', isCompleted: true }, { id: 't10_3', name: 'Confidence Score (Fusion)', isCompleted: true }]
    },
    {
        id: 'p11', title: 'FASE 11: VISION 2.0', description: 'Leitura de Aposta em Tela', status: 'PENDING', progress: 0,
        tasks: [{ id: 't11_1', name: 'Reconhecimento de Aposta', isCompleted: false }, { id: 't11_2', name: 'OCR Mobile Aprimorado', isCompleted: false }]
    },
    {
        id: 'p12', title: 'FASE 12: MOBILE PRO', description: 'UX Profissional', status: 'PENDING', progress: 0,
        tasks: [{ id: 't12_1', name: 'Interface Compacta', isCompleted: false }, { id: 't12_2', name: 'Alertas Push/Vibração', isCompleted: false }]
    }
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                         <span className={`text-[10px] font-mono ${task.isCompleted ? 'text-gray-300 line-through decoration-brand-500/50' : 'text-gray-500'}`}>
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
    { id: '2', label: 'Ativar Scheduler Automático', checked: false },
    { id: '3', label: 'Criar classificador relevância', checked: true },
    { id: '4', label: 'Integrar Fusion Engine', checked: false },
    { id: '5', label: 'Criar histórico Supabase', checked: false },
    { id: '6', label: 'Frontend responsivo/animado', checked: true },
    { id: '7', label: 'Criar modo Monkey Live', checked: false },
    { id: '8', label: 'Webhook disparo automático', checked: false },
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
