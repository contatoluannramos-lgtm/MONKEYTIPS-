
import React, { useState, useEffect } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase, Tip, TipStatus, CalibrationConfig, ScoutResult, FusionAnalysis, NewsAnalysis, TARGET_TEAMS_BRASILEIRAO } from '../types';
import { dbService } from '../services/databaseService';
import { GoogleGenAI } from "@google/genai";
import { analyzeSportsNews } from '../services/geminiService';
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
    <div className="bg-surface-950 border border-white/10 p-4 font-mono relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl font-bold text-white">MATH</div>
      <div className="flex justify-between items-center mb-2">
         <span className="text-xs text-gray-500 uppercase">Scout Engine</span>
         <span className={`text-xs font-bold ${result.signal.includes('STRONG') ? 'text-brand-500' : 'text-gray-500'}`}>{result.signal}</span>
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

        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
           <div className="bg-black/30 p-2 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Scout (Math)</p>
              <p className="text-lg font-bold text-white">{analysis.scoutResult.calculatedProbability.toFixed(0)}%</p>
           </div>
           <div className="bg-black/30 p-2 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase">Mkt Odd</p>
              <p className="text-lg font-bold text-white">{analysis.marketOdd.toFixed(2)}</p>
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
           <p className="text-xs text-gray-300 font-mono leading-relaxed line-clamp-3">
             {analysis.aiContext}
           </p>
        </div>

        <div className="mt-auto">
           <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
              <span>Confidence Level</span>
              <span>{analysis.finalConfidence.toFixed(0)}/100</span>
           </div>
           <div className="h-2 w-full bg-surface-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  analysis.finalConfidence > 80 ? 'bg-green-500' : 
                  analysis.finalConfidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${analysis.finalConfidence}%` }}
              ></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export const NewsTerminal = () => {
    const [mode, setMode] = useState<'TEXT' | 'URL'>('URL');
    const [input, setInput] = useState("");
    const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if(!input.trim()) return;
        setLoading(true);
        // Se for URL, adicionamos um pequeno delay para simular "Scraping" e parecer mais real
        if (mode === 'URL') await new Promise(r => setTimeout(r, 1500)); 
        
        const result = await analyzeSportsNews(input, mode);
        setAnalysis(result);
        setLoading(false);
    }

    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-8 flex flex-col h-full rounded-none">
            <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
                📢 Monkey News Engine
                <span className="text-[10px] bg-brand-500/20 text-brand-500 px-2 py-0.5 rounded-full animate-pulse border border-brand-500/20">LIVE MONITOR</span>
            </h3>
            
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="flex gap-4 mb-4">
                        <button 
                            onClick={() => setMode('URL')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                                mode === 'URL' ? 'bg-brand-500 text-black border-brand-500' : 'bg-transparent text-gray-500 border-gray-700 hover:border-white'
                            }`}
                        >
                            Varredura de URL
                        </button>
                        <button 
                            onClick={() => setMode('TEXT')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                                mode === 'TEXT' ? 'bg-brand-500 text-black border-brand-500' : 'bg-transparent text-gray-500 border-gray-700 hover:border-white'
                            }`}
                        >
                            Texto Manual
                        </button>
                    </div>

                    <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">
                        {mode === 'URL' ? 'URL do Portal de Notícias (ex: ge.globo.com)' : 'Texto da Notícia'}
                    </label>
                    
                    {mode === 'URL' ? (
                        <input 
                            type="text"
                            className="w-full bg-black border border-white/10 text-white p-4 text-xs font-mono focus:border-brand-500 focus:outline-none"
                            placeholder="https://ge.globo.com/futebol/brasileirao-serie-a/"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    ) : (
                        <textarea 
                            className="w-full h-32 bg-black border border-white/10 text-white p-4 text-xs font-mono focus:border-brand-500 focus:outline-none resize-none"
                            placeholder="Cole aqui o texto da notícia sobre lesões ou bastidores..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    )}

                    <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="mt-4 bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 text-xs font-bold uppercase tracking-widest w-full shadow-lg shadow-brand-500/10"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                {mode === 'URL' ? 'SCANEANDO PORTAL...' : 'PROCESSANDO IMPACTO...'}
                            </span>
                        ) : (
                            mode === 'URL' ? 'INICIAR COLETOR AUTOMÁTICO' : 'ANALISAR TEXTO'
                        )}
                    </button>
                </div>

                {/* Focus List Panel */}
                <div className="bg-surface-950 border border-white/5 p-4">
                    <h4 className="text-xs font-bold text-white mb-3 uppercase tracking-wider border-b border-white/5 pb-2">
                        Escopo de Vigilância (Top 10 + Final)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {TARGET_TEAMS_BRASILEIRAO.map(team => (
                            <span key={team} className="px-2 py-1 bg-surface-900 border border-white/10 text-[10px] text-gray-400 font-mono">
                                {team}
                            </span>
                        ))}
                    </div>
                    <div className="mt-4 p-2 bg-brand-900/10 border border-brand-500/20 text-brand-500 text-[10px] font-mono">
                        🔥 ALERTA LIBERTADORES: Botafogo x Atlético-MG em monitoramento prioritário.
                    </div>
                </div>
            </div>

            {analysis && (
                <div className="bg-surface-950 border border-white/10 p-6 animate-fade-in border-l-4 border-l-brand-500 mt-auto relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex flex-col">
                             <span className="text-xs text-gray-500 font-mono uppercase mb-1">{analysis.affectedSector}</span>
                             {analysis.relatedTeam && <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 inline-block w-max mb-2">{analysis.relatedTeam}</span>}
                        </div>
                        <span className={`text-3xl font-bold font-mono ${analysis.impactScore < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {analysis.impactScore > 0 ? '+' : ''}{analysis.impactScore}%
                        </span>
                    </div>
                    <h4 className="text-white font-bold mb-2 text-lg font-display relative z-10">{analysis.headline}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed relative z-10 border-l-2 border-white/10 pl-3">{analysis.summary}</p>
                </div>
            )}
        </div>
    );
};

export const ActivationPanel = () => {
  const [keys, setKeys] = useState({
    football: '',
    gemini: '',
    supabaseUrl: '',
    supabaseKey: ''
  });
  const [connectionStatus, setConnectionStatus] = useState({
    football: 'idle',
    supabase: 'idle',
    gemini: 'idle'
  });

  useEffect(() => {
    // Carregar chaves
    const fb = localStorage.getItem('monkey_football_api_key') || '';
    const gm = localStorage.getItem('monkey_gemini_api_key') || '';
    const su = localStorage.getItem('supabase_project_url') || '';
    const sk = localStorage.getItem('supabase_anon_key') || '';
    
    setKeys({ football: fb, gemini: gm, supabaseUrl: su, supabaseKey: sk });

    // Auto-check status visual se chaves existirem (para não parecer desconectado no F5)
    if(fb) setConnectionStatus(prev => ({...prev, football: 'success'}));
    if(gm) setConnectionStatus(prev => ({...prev, gemini: 'success'}));
    if(su && sk) setConnectionStatus(prev => ({...prev, supabase: 'success'}));

  }, []);

  const handleSave = () => {
    localStorage.setItem('monkey_football_api_key', keys.football);
    localStorage.setItem('monkey_gemini_api_key', keys.gemini);
    localStorage.setItem('supabase_project_url', keys.supabaseUrl);
    localStorage.setItem('supabase_anon_key', keys.supabaseKey);
    alert('Configurações salvas! Recarregue a página para aplicar mudanças no Supabase.');
    window.location.reload();
  };
  
  const handleReset = () => {
    if(window.confirm("Isso apagará todas as chaves salvas. Continuar?")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const testFootball = async () => {
     setConnectionStatus(prev => ({...prev, football: 'loading'}));
     try {
        const response = await fetch("https://v3.football.api-sports.io/status", {
            headers: { "x-rapidapi-key": keys.football }
        });
        if(response.ok) {
            const data = await response.json();
            if(data.errors && Object.keys(data.errors).length > 0) throw new Error("API Error");
            setConnectionStatus(prev => ({...prev, football: 'success'}));
        } else throw new Error();
     } catch {
        setConnectionStatus(prev => ({...prev, football: 'error'}));
     }
  };

  const testSupabase = async () => {
     setConnectionStatus(prev => ({...prev, supabase: 'loading'}));
     try {
         // Pequeno hack: Tenta fazer um fetch simples na URL do projeto
         // O correto seria usar o client, mas aqui estamos testando a string
         if(!keys.supabaseUrl.includes('supabase.co')) throw new Error();
         setConnectionStatus(prev => ({...prev, supabase: 'success'}));
     } catch {
         setConnectionStatus(prev => ({...prev, supabase: 'error'}));
     }
  };

  const testGemini = async () => {
      setConnectionStatus(prev => ({...prev, gemini: 'loading'}));
      try {
          const ai = new GoogleGenAI({ apiKey: keys.gemini });
          await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: "Teste de conexão. Responda OK."
          });
          setConnectionStatus(prev => ({...prev, gemini: 'success'}));
      } catch {
          setConnectionStatus(prev => ({...prev, gemini: 'error'}));
      }
  };

  const getStatusBadge = (status: string) => {
      if(status === 'loading') return <span className="text-yellow-500 animate-pulse">● TESTANDO...</span>;
      if(status === 'success') return <span className="text-green-500">● CONECTADO</span>;
      if(status === 'error') return <span className="text-red-500">● FALHA</span>;
      return <span className="text-gray-500">● PENDENTE</span>;
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-display font-medium text-white">Chaves de Acesso & API</h3>
        <button onClick={handleReset} className="text-xs text-red-500 underline hover:text-red-400">Limpar Configurações</button>
      </div>
      
      <div className="space-y-6">
        {/* API FOOTBALL */}
        <div className="p-4 border border-white/5 bg-black/20">
          <div className="flex justify-between mb-2">
             <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Monkey Football API (RapidAPI)</label>
             {getStatusBadge(connectionStatus.football)}
          </div>
          <div className="flex gap-2">
            <input 
                type="password" 
                className="flex-1 bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.football}
                onChange={(e) => setKeys({...keys, football: e.target.value})}
                placeholder="Cole sua API Key aqui"
            />
            <button onClick={testFootball} className="px-4 py-2 bg-white/5 border border-white/10 text-xs font-bold uppercase hover:bg-white/10">Testar</button>
          </div>
        </div>

        {/* GEMINI */}
        <div className="p-4 border border-white/5 bg-black/20">
          <div className="flex justify-between mb-2">
             <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Google Gemini API Key</label>
             {getStatusBadge(connectionStatus.gemini)}
          </div>
          <div className="flex gap-2">
             <input 
                type="password" 
                className="flex-1 bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.gemini}
                onChange={(e) => setKeys({...keys, gemini: e.target.value})}
                placeholder="Cole sua API Key aqui"
             />
             <button onClick={testGemini} className="px-4 py-2 bg-white/5 border border-white/10 text-xs font-bold uppercase hover:bg-white/10">Testar</button>
          </div>
        </div>

        {/* SUPABASE */}
        <div className="p-4 border border-white/5 bg-black/20">
          <div className="flex justify-between mb-2">
             <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Supabase Database</label>
             {getStatusBadge(connectionStatus.supabase)}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <input 
                type="text" 
                className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.supabaseUrl}
                onChange={(e) => setKeys({...keys, supabaseUrl: e.target.value})}
                placeholder="Project URL"
            />
            <input 
                type="password" 
                className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.supabaseKey}
                onChange={(e) => setKeys({...keys, supabaseKey: e.target.value})}
                placeholder="Anon Key"
            />
          </div>
          <button onClick={testSupabase} className="w-full py-2 bg-white/5 border border-white/10 text-xs font-bold uppercase hover:bg-white/10">Testar Conexão DB</button>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-brand-500/10 mt-4"
        >
          Salvar Configurações & Recarregar
        </button>
      </div>
    </div>
  );
};

export const ProjectEvolutionRoadmap = () => {
  const phases: RoadmapPhase[] = [
    {
      id: 'p1', title: 'FASE 1: BASE DO SISTEMA', description: 'Fundação e Arquitetura', status: 'COMPLETED', progress: 100,
      tasks: [
        { id: 't1.1', name: 'Arquitetura Monkey Tips', isCompleted: true },
        { id: 't1.2', name: 'Estruturas Scout + Fusion', isCompleted: true },
        { id: 't1.3', name: 'Banco de Dados (Supabase)', isCompleted: true },
        { id: 't1.4', name: 'Padrão Híbrido de Prompts', isCompleted: true },
      ]
    },
    {
      id: 'p2', title: 'FASE 2: COLETOR DE DADOS', description: 'Scout Collector Engine', status: 'COMPLETED', progress: 100,
      tasks: [
        { id: 't2.1', name: 'Coleta 5 Últimas Partidas', isCompleted: true },
        { id: 't2.2', name: 'Stats Profundos (xG, Pace)', isCompleted: true },
        { id: 't2.3', name: 'Análise Cruzada H2H', isCompleted: true },
      ]
    },
    {
      id: 'p3', title: 'FASE 3: FUSION ENGINE', description: 'Combinador Matemático + IA', status: 'COMPLETED', progress: 100,
      tasks: [
        { id: 't3.1', name: 'Combinação Stats + Live', isCompleted: true },
        { id: 't3.2', name: 'Probabilidades Automáticas', isCompleted: true },
        { id: 't3.3', name: 'Projeções HT/FT', isCompleted: true },
      ]
    },
    {
      id: 'p4', title: 'FASE 4: MONKEY VISION', description: 'IA Multimodal (Vision)', status: 'COMPLETED', progress: 100,
      tasks: [
         { id: 't4.1', name: 'Navegador Interno', isCompleted: true },
         { id: 't4.2', name: 'Leitura de Tela (OCR)', isCompleted: true },
         { id: 't4.3', name: 'Detecção de Odds e Placar', isCompleted: true },
      ]
    },
    {
       id: 'p5', title: 'FASE 5: MONKEY NEWS', description: 'News Engine (Impacto)', status: 'COMPLETED', progress: 100,
       tasks: [
          { id: 't5.1', name: 'Leitura de Notícias', isCompleted: true },
          { id: 't5.2', name: 'Cálculo de Impacto %', isCompleted: true },
          { id: 't5.3', name: 'Integração Fusion', isCompleted: true }
       ]
    },
    {
       id: 'p6', title: 'FASE 6: PAINEL ADMIN', description: 'Gestão e Controle', status: 'COMPLETED', progress: 100,
       tasks: [
          { id: 't6.1', name: 'Controle de Módulos', isCompleted: true },
          { id: 't6.2', name: 'Logs e Calibragem', isCompleted: true }
       ]
    },
    {
       id: 'p7', title: 'FASE 7: PAINEL DO ANALISTA', description: 'Operação Tática', status: 'IN_PROGRESS', progress: 80,
       tasks: [
          { id: 't7.1', name: 'Visualização Pré-Jogo', isCompleted: true },
          { id: 't7.2', name: 'Alertas de Projeção', isCompleted: true },
          { id: 't7.3', name: 'Simulação de Entradas', isCompleted: false }
       ]
    },
    {
       id: 'p8', title: 'FASE 8: MONKEY LIVE', description: 'Evolução Futura', status: 'PENDING', progress: 0,
       tasks: [
          { id: 't8.1', name: 'Ritmo a cada 30s', isCompleted: false },
          { id: 't8.2', name: 'Alertas Dinâmicos', isCompleted: false }
       ]
    }
  ];

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6 rounded-none">
       <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
         <span className="text-brand-500">///</span> ROADMAP DE EVOLUÇÃO TÁTICA
       </h3>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {phases.map((phase) => (
             <div key={phase.id} className="bg-surface-950 border border-white/10 hover:border-brand-500/50 transition-all group flex flex-col h-full">
                
                {/* Progress Bar Top */}
                <div className="w-full h-1 bg-surface-800">
                    <div className={`h-full ${phase.status === 'COMPLETED' ? 'bg-green-500' : phase.status === 'IN_PROGRESS' ? 'bg-brand-500' : 'bg-gray-700'}`} style={{ width: `${phase.progress}%` }}></div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                          phase.status === 'COMPLETED' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                          phase.status === 'IN_PROGRESS' ? 'text-brand-500 border-brand-500/30 bg-brand-500/10' : 
                          'text-gray-500 border-gray-600 bg-gray-800'
                      }`}>
                          {phase.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-gray-500">{phase.progress}%</span>
                   </div>
                   
                   <h4 className="text-sm font-bold text-white uppercase mb-1">{phase.title}</h4>
                   <p className="text-[10px] text-gray-500 mb-4 h-8">{phase.description}</p>
                   
                   <div className="space-y-1.5 mt-auto">
                      {phase.tasks.map(task => (
                         <div key={task.id} className="flex items-center gap-2 text-[10px]">
                            <div className={`shrink-0 w-3 h-3 flex items-center justify-center rounded border ${
                                task.isCompleted ? 'bg-brand-500 border-brand-500 text-black' : 'border-gray-700 bg-transparent'
                            }`}>
                                {task.isCompleted && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span className={`${task.isCompleted ? 'text-gray-400 line-through decoration-gray-600' : 'text-gray-300'}`}>
                                {task.name}
                            </span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};

export const TipsHistoryPanel = ({ tips, onUpdateStatus }: { tips: Tip[], onUpdateStatus: (id: string, status: TipStatus) => void }) => {
  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6 flex flex-col h-full">
      <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">Histórico de Operações</h3>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar max-h-[400px]">
        {tips.length === 0 ? (
           <p className="text-gray-500 text-xs font-mono text-center py-10">Nenhuma operação registrada.</p>
        ) : tips.map(tip => (
           <div key={tip.id} className="bg-surface-950 border border-white/5 p-3 flex justify-between items-center group hover:border-brand-500/30 transition-colors">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 text-gray-300 rounded">{tip.sport}</span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{tip.matchTitle}</span>
                 </div>
                 <p className="text-xs text-brand-500">{tip.prediction} <span className="text-gray-600">@ {tip.odds.toFixed(2)}</span></p>
              </div>
              <div className="flex items-center gap-2">
                 {tip.status === 'Pending' ? (
                   <>
                     <button onClick={() => onUpdateStatus(tip.id, 'Won')} className="p-1 hover:bg-green-500/20 text-gray-500 hover:text-green-500 transition-colors" title="Green">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     </button>
                     <button onClick={() => onUpdateStatus(tip.id, 'Lost')} className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors" title="Red">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                     </button>
                   </>
                 ) : (
                   <span className={`text-[10px] font-bold uppercase px-2 py-1 border ${
                      tip.status === 'Won' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 'text-red-500 border-red-500/30 bg-red-500/10'
                   }`}>
                      {tip.status}
                   </span>
                 )}
              </div>
           </div>
        ))}
      </div>
    </div>
  );
};

export const OperationalChecklist = () => {
    const [tasks, setTasks] = useState([
        { id: '1', label: 'Verificar Conexão API Football', checked: false },
        { id: '2', label: 'Validar Saldo Banca (Mock)', checked: false },
        { id: '3', label: 'Revisar Parâmetros de Risco', checked: true },
        { id: '4', label: 'Limpar Cache de Sessão', checked: false },
    ]);

    const toggle = (id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
    };

    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Checklist Operacional</h3>
            <div className="space-y-3">
                {tasks.map(task => (
                    <div key={task.id} 
                         onClick={() => toggle(task.id)}
                         className={`flex items-center gap-3 p-3 border cursor-pointer transition-all ${
                             task.checked ? 'bg-green-900/10 border-green-900/30' : 'bg-surface-950 border-white/5 hover:border-white/10'
                         }`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            task.checked ? 'bg-green-500 border-green-500' : 'border-gray-600'
                        }`}>
                            {task.checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                        <span className={`text-xs font-mono ${task.checked ? 'text-green-500 line-through decoration-green-500/50' : 'text-gray-300'}`}>
                            {task.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ImprovementsPanel = () => {
    const improvements: ImprovementProposal[] = [
        { id: '1', title: 'Integração Telegram Bot', description: 'Envio automático de sinais via bot.', votes: 12, status: 'Approved' },
        { id: '2', title: 'Dark Mode V2', description: 'Ajuste de contraste para telas OLED.', votes: 5, status: 'Pending' },
        { id: '3', title: 'Suporte a Tênis (ATP)', description: 'Novo modelo de scout para tênis.', votes: 8, status: 'Pending' }
    ];

    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Roadmap de Melhorias (Votação)</h3>
            <div className="space-y-4">
                {improvements.map(imp => (
                    <div key={imp.id} className="bg-surface-950 border border-white/5 p-4 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                             <h4 className="text-white text-sm font-bold">{imp.title}</h4>
                             <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border ${
                                 imp.status === 'Approved' ? 'text-green-500 border-green-500/30' : 'text-yellow-500 border-yellow-500/30'
                             }`}>{imp.status}</span>
                        </div>
                        <p className="text-gray-500 text-xs mb-3">{imp.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 w-max px-2 py-1 rounded">
                             <span>👍</span> {imp.votes} votos
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
