
import React, { useState, useEffect } from 'react';
import { Tip, Match, TipStatus, FusionAnalysis, ScoutResult, NewsProcessedItem, CalibrationConfig, StatProcessedItem, ImprovementProposal, ChecklistItem, RoadmapPhase, RoadmapTask, BotNewsPayload } from '../types';
import { DEFAULT_CALIBRATION } from '../engines/scoutEngine';
import { geminiEngine } from '../engines/geminiEngine';
import { fetchPlayerStatsCrawler, testStatsProvider, fetchRSSFeeds, fetchRealTeamStats, fetchSportsDataIOProps } from '../services/liveDataService';
import { webhookService } from '../services/webhookService';

// --- SHARED COMPONENTS ---

export const StatCard = ({ title, value, change, icon }: { title: string; value: string; change: string; icon: string }) => (
  <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6 rounded-none flex items-center justify-between group hover:border-brand-500/30 transition-colors">
    <div>
      <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white font-display">{value}</h3>
      <span className={`text-xs font-mono ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
        {change} vs last week
      </span>
    </div>
    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
      {icon}
    </div>
  </div>
);

// --- KELLY CALCULATOR ---
export const KellyCalculator = () => {
    const [odds, setOdds] = useState('');
    const [prob, setProb] = useState('');
    const [result, setResult] = useState<string | null>(null);

    const calculate = () => {
        const o = parseFloat(odds);
        const p = parseFloat(prob) / 100;
        if (!o || !p || o <= 1 || p <= 0 || p > 100) {
            setResult(null);
            return;
        }

        const b = o - 1;
        const q = 1 - p;
        const f = (b * p - q) / b;
        
        setResult((f * 100).toFixed(2));
    };

    return (
        <div className="bg-[#1C1C1F] p-4 border border-white/5 mt-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Kelly Criterion Calc</h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <input 
                    type="number" 
                    placeholder="Odds (Ex: 1.90)" 
                    className="bg-black/30 border border-white/10 text-white text-xs p-2 outline-none focus:border-brand-500"
                    value={odds}
                    onChange={e => setOdds(e.target.value)}
                />
                <input 
                    type="number" 
                    placeholder="Prob % (Ex: 60)" 
                    className="bg-black/30 border border-white/10 text-white text-xs p-2 outline-none focus:border-brand-500"
                    value={prob}
                    onChange={e => setProb(e.target.value)}
                />
            </div>
            <button 
                onClick={calculate}
                className="w-full bg-brand-900/20 text-brand-500 border border-brand-500/30 py-1 text-xs font-bold uppercase hover:bg-brand-500/10"
            >
                Calculate Stake
            </button>
            {result !== null && (
                <div className="mt-2 text-center">
                    <span className="text-[10px] text-gray-500 uppercase">Sugestão de Stake:</span>
                    <p className={`font-mono font-bold ${parseFloat(result) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {parseFloat(result) > 0 ? `${result}%` : 'No Value Bet'}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- ACTIVATION PANEL ---
export const ActivationPanel = () => {
    const [footballKey, setFootballKey] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    
    // Supabase Configs
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');

    useEffect(() => {
        setFootballKey(localStorage.getItem('monkey_football_api_key') || '');
        setWebhookUrl(localStorage.getItem('monkey_webhook_url') || '');
        setSupabaseUrl(localStorage.getItem('supabase_project_url') || '');
        setSupabaseKey(localStorage.getItem('supabase_anon_key') || '');
    }, []);

    const saveKeys = () => {
        localStorage.setItem('monkey_football_api_key', footballKey);
        localStorage.setItem('monkey_webhook_url', webhookUrl);
        localStorage.setItem('supabase_project_url', supabaseUrl);
        localStorage.setItem('supabase_anon_key', supabaseKey);
        alert('Configurações salvas no armazenamento local seguro. A página será recarregada para aplicar.');
        window.location.reload(); // Reload to apply configs
    };

    const testWebhook = async () => {
        if (!webhookUrl) return alert("Configure a URL primeiro");
        const success = await webhookService.sendTestMessage(webhookUrl);
        alert(success ? "Webhook disparado com sucesso!" : "Falha ao disparar webhook.");
    };

    return (
        <div className="bg-surface-900/50 border border-white/5 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-display font-medium text-white mb-6">Chaves de Acesso (API)</h3>
            
            <div className="space-y-6">
                <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-sm mb-4">
                    <p className="text-green-500 text-xs font-bold uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        AI Core Active (Environment)
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 pl-4">Gemini API Key is managed via system environment variables.</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">API-Football Key (Data Source)</label>
                    <input 
                        type="password" 
                        value={footballKey}
                        onChange={(e) => setFootballKey(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 text-white p-3 font-mono text-sm focus:border-brand-500 outline-none"
                        placeholder="x-rapidapi-key"
                    />
                </div>
                
                <div className="pt-6 border-t border-white/5">
                    <h4 className="text-sm font-bold text-white mb-4">Banco de Dados (Supabase)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Project URL</label>
                            <input 
                                type="text" 
                                value={supabaseUrl}
                                onChange={(e) => setSupabaseUrl(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 text-white p-3 font-mono text-sm focus:border-brand-500 outline-none"
                                placeholder="https://xyz.supabase.co"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Anon Key</label>
                            <input 
                                type="password" 
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 text-white p-3 font-mono text-sm focus:border-brand-500 outline-none"
                                placeholder="eyJhbGciOi..."
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                    <div className="flex justify-between items-end">
                        <div className="flex-1 mr-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Discord Webhook (Alertas)</label>
                            <input 
                                type="text" 
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 text-white p-3 font-mono text-sm focus:border-brand-500 outline-none"
                                placeholder="https://discord.com/api/webhooks/..."
                            />
                        </div>
                        <button 
                            onClick={testWebhook}
                            className="bg-surface-800 border border-white/10 text-white px-4 py-3 text-xs font-bold uppercase hover:bg-surface-700"
                        >
                            Testar
                        </button>
                    </div>
                </div>

                <button 
                    onClick={saveKeys}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 text-xs font-bold uppercase tracking-widest transition-colors shadow-lg"
                >
                    Salvar e Reiniciar Sistema
                </button>
            </div>
        </div>
    );
};

// --- TIPS HISTORY PANEL ---
export const TipsHistoryPanel = ({ tips, onUpdateStatus }: { tips: Tip[]; onUpdateStatus: (id: string, status: TipStatus) => void }) => {
    return (
        <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6 overflow-hidden">
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-6">Histórico de Operações</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase text-gray-500 font-mono tracking-wider">
                            <th className="py-3 px-4">Data</th>
                            <th className="py-3 px-4">Jogo</th>
                            <th className="py-3 px-4">Tip</th>
                            <th className="py-3 px-4">Odd</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-gray-300 font-mono">
                        {tips.map(tip => (
                            <tr key={tip.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="py-3 px-4 opacity-50">{new Date(tip.createdAt).toLocaleDateString()}</td>
                                <td className="py-3 px-4 font-bold text-white">{tip.matchTitle}</td>
                                <td className="py-3 px-4 text-brand-500">{tip.prediction}</td>
                                <td className="py-3 px-4">{tip.odds.toFixed(2)}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-sm border ${
                                        tip.status === 'Won' ? 'bg-green-500/10 border-green-500 text-green-500' :
                                        tip.status === 'Lost' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                        'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                                    }`}>
                                        {tip.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right space-x-2">
                                    <button onClick={() => onUpdateStatus(tip.id, 'Won')} className="text-green-500 hover:text-green-400 text-[10px] border border-green-500/30 px-2 py-1">WIN</button>
                                    <button onClick={() => onUpdateStatus(tip.id, 'Lost')} className="text-red-500 hover:text-red-400 text-[10px] border border-red-500/30 px-2 py-1">LOSS</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- CALIBRATION PANEL ---
export const CalibrationPanel = () => {
    const [config, setConfig] = useState<CalibrationConfig>(DEFAULT_CALIBRATION);

    useEffect(() => {
        const saved = localStorage.getItem('monkey_calibration_config');
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch(e) {
                console.error("Failed to parse calibration config", e);
            }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('monkey_calibration_config', JSON.stringify(config));
        alert('Calibragem salva com sucesso!');
    };

    return (
        <div className="bg-surface-900/50 border border-white/5 p-8">
            <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-display font-medium text-white">Calibragem dos Motores (Scout v2)</h3>
                 <button onClick={handleSave} className="bg-brand-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-brand-500">Salvar Ajustes</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-brand-500 font-mono text-sm font-bold uppercase border-b border-brand-500/30 pb-2">Futebol</h4>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Over 2.5 Threshold (%)</label>
                        <input 
                            type="number" 
                            className="bg-black/30 border border-white/10 text-white w-full p-2 text-sm"
                            value={config.football.over25Threshold}
                            onChange={(e) => setConfig({...config, football: {...config.football, over25Threshold: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Poisson Strength</label>
                        <input 
                            type="number" step="0.1"
                            className="bg-black/30 border border-white/10 text-white w-full p-2 text-sm"
                            value={config.football.poissonStrength}
                            onChange={(e) => setConfig({...config, football: {...config.football, poissonStrength: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Instrução Tática (Prompt)</label>
                        <textarea 
                            className="bg-black/30 border border-white/10 text-white w-full p-2 text-xs h-24"
                            value={config.football.instruction}
                            onChange={(e) => setConfig({...config, football: {...config.football, instruction: e.target.value}})}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-orange-500 font-mono text-sm font-bold uppercase border-b border-orange-500/30 pb-2">Basquete (NBA)</h4>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Line Threshold (Pts)</label>
                        <input 
                            type="number" 
                            className="bg-black/30 border border-white/10 text-white w-full p-2 text-sm"
                            value={config.basketball.lineThreshold}
                            onChange={(e) => setConfig({...config, basketball: {...config.basketball, lineThreshold: parseFloat(e.target.value)}})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Pace Weight</label>
                        <input 
                            type="number" step="0.1"
                            className="bg-black/30 border border-white/10 text-white w-full p-2 text-sm"
                            value={config.basketball.paceWeight}
                            onChange={(e) => setConfig({...config, basketball: {...config.basketball, paceWeight: parseFloat(e.target.value)}})}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SCOUT CARD ---
export const ScoutCard = ({ result }: { result: ScoutResult }) => (
    <div className={`bg-surface-900 border p-4 relative overflow-hidden ${
        result.signal === 'STRONG_OVER' ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
        result.signal === 'STRONG_UNDER' ? 'border-red-500/50' : 'border-white/10'
    }`}>
        {result.isHotGame && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 uppercase animate-pulse">
                Hot Game 🔥
            </div>
        )}
        <div className="flex justify-between items-start mb-2">
             <span className="text-[10px] text-gray-500 font-mono uppercase">{result.matchId}</span>
             <span className="font-bold text-white text-lg">{result.calculatedProbability}%</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
             <div className={`w-2 h-2 rounded-full ${
                 result.signal.includes('OVER') ? 'bg-green-500' : 
                 result.signal.includes('UNDER') ? 'bg-red-500' : 'bg-gray-500'
             }`}></div>
             <span className="text-xs font-bold text-gray-300">{result.signal}</span>
        </div>
        <p className="text-[10px] text-gray-500 font-mono border-t border-white/5 pt-2">
            {result.details}
        </p>
        {result.spikeDetected && (
            <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 p-1 text-[9px] text-yellow-500 text-center uppercase font-bold">
                ⚠️ Spike: {result.spikeDetails}
            </div>
        )}
    </div>
);

// --- FUSION TERMINAL ---
export const FusionTerminal = ({ analysis }: { analysis: FusionAnalysis }) => {
    return (
        <div className="bg-black border border-white/10 h-full flex flex-col font-mono text-xs p-4 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
             
             <div className="flex justify-between items-center mb-4 mt-2">
                 <span className="text-gray-500">FUSION ID: {analysis.matchId.substring(0, 8)}</span>
                 <span className={`px-2 py-0.5 border ${
                     analysis.verdict === 'GREEN_LIGHT' ? 'border-green-500 text-green-500 bg-green-500/10' :
                     analysis.verdict === 'YELLOW_WARNING' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                     'border-red-500 text-red-500 bg-red-500/10'
                 }`}>
                     {analysis.verdict}
                 </span>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="bg-white/5 p-2 border-l-2 border-brand-500">
                     <span className="block text-gray-500 text-[9px] uppercase">Scout Score</span>
                     <span className="text-xl font-bold text-white">{analysis.scoutResult.calculatedProbability}%</span>
                 </div>
                 <div className="bg-white/5 p-2 border-l-2 border-blue-500">
                     <span className="block text-gray-500 text-[9px] uppercase">Final Conf.</span>
                     <span className="text-xl font-bold text-white">{analysis.finalConfidence}%</span>
                 </div>
             </div>

             <div className="space-y-2 mb-4">
                 <div className="flex justify-between border-b border-white/5 pb-1">
                     <span className="text-gray-500">EV (Expected Value)</span>
                     <span className={analysis.ev > 0 ? 'text-green-500' : 'text-red-500'}>{analysis.ev}%</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-1">
                     <span className="text-gray-500">Market Odd</span>
                     <span className="text-white">{analysis.marketOdd}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-1">
                     <span className="text-gray-500">News Impact</span>
                     <span className="text-white">{analysis.newsImpactScore && analysis.newsImpactScore > 0 ? `+${analysis.newsImpactScore}` : analysis.newsImpactScore || 0}</span>
                 </div>
             </div>

             <div className="mt-auto bg-gray-900 p-2 border border-white/5 text-gray-400 italic">
                 "{analysis.aiContext.substring(0, 100)}..."
             </div>
        </div>
    );
};

// --- NEWS TERMINAL ---
export const NewsTerminal = ({ newsQueue, onNewsProcessed, onArchiveNews }: { 
    newsQueue: NewsProcessedItem[], 
    onNewsProcessed: (item: NewsProcessedItem) => Promise<void>,
    onArchiveNews: (id: string) => Promise<void>
}) => {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<'TEXT' | 'URL'>('TEXT');
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
                    source: source === 'GLOBO' ? 'globoesporte' : 'espn',
                    league: 'futebol', // Default, AI ajustará
                    urgency: 3,
                    title: item.title,
                    summary: item.description,
                    published_at: item.pubDate,
                    url: item.link
                };
                
                const processedResult = await geminiEngine.processBotNews(payload);
                if(processedResult) {
                    const fullItem: NewsProcessedItem = {
                        ...processedResult,
                        id: `news-${Date.now()}-${Math.random()}`,
                        originalData: payload,
                        status: 'PENDING',
                        processedAt: new Date().toISOString()
                    };
                    await onNewsProcessed(fullItem);
                }
            }
            alert(`✅ Feed ${source} processado com sucesso!`);
        } catch (e) {
            alert("Erro ao buscar RSS: " + e);
        }
        setIsFetchingRSS(false);
    };
    
    const handleManualIngest = async () => {
        if (!input.trim()) return;
        setIsProcessing(true);
        
        let payload: BotNewsPayload = {
            source: 'other',
            league: 'futebol', 
            urgency: 3,
            title: mode === 'URL' ? 'Análise de URL Externa' : 'Inserção Manual de Texto',
            summary: input,
            published_at: new Date().toISOString(),
            url: mode === 'URL' ? input : ''
        };

        const processedResult = await geminiEngine.processBotNews(payload);
        if (processedResult) {
             const fullItem: NewsProcessedItem = {
                ...processedResult,
                id: `news-${Date.now()}-${Math.random()}`,
                originalData: payload,
                status: 'PENDING',
                processedAt: new Date().toISOString()
            };
            await onNewsProcessed(fullItem);
            setInput('');
        }
        setIsProcessing(false);
    };

    const activeNews = newsQueue.filter(n => n.status !== 'ARCHIVED');
    const filteredQueue = activeNews.filter(item => 
        selectedFilter === 'ALL' || (item.originalData.league && item.originalData.league.toUpperCase() === selectedFilter)
    );

    return (
        <div className="bg-[#0B0B0D] border border-[#1C1C1F] h-full flex flex-col p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-blue-500">⚡</span> Monkey News Wire
            </h3>
            
            {/* RSS Controls */}
            <div className="mb-6 flex gap-2">
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

            <div className="flex gap-2 mb-2">
                <button 
                    onClick={() => setMode('TEXT')}
                    className={`px-4 py-2 text-xs font-bold uppercase border ${mode === 'TEXT' ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500'}`}
                >
                    Texto
                </button>
                <button 
                    onClick={() => setMode('URL')}
                    className={`px-4 py-2 text-xs font-bold uppercase border ${mode === 'URL' ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500'}`}
                >
                    URL Link
                </button>
            </div>

            <div className="flex gap-2 mb-8">
                <input 
                    className="flex-1 bg-[#1C1C1F] text-white text-sm border border-white/10 p-3 outline-none focus:border-brand-500"
                    placeholder={mode === 'TEXT' ? "Cole o texto da notícia aqui..." : "https://site.com/noticia"}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <button 
                    onClick={handleManualIngest}
                    disabled={isProcessing}
                    className="bg-brand-600 text-white px-6 font-bold uppercase text-xs hover:bg-brand-500 disabled:opacity-50"
                >
                    {isProcessing ? 'Lendo...' : 'Processar'}
                </button>
            </div>
            
            {/* Filters */}
            <div className="p-2 border-b border-[#1C1C1F] flex gap-2 bg-[#0B0B0D] mb-4">
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

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {filteredQueue.map(item => {
                    const isRSS = ['globoesporte', 'espn'].includes(item.originalData.source);
                    return (
                        <div key={item.id} className={`p-4 border border-white/10 bg-[#121214] relative ${item.status === 'ARCHIVED' ? 'opacity-50 grayscale' : ''}`}>
                             {item.status !== 'ARCHIVED' && (
                                 <button onClick={() => onArchiveNews(item.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500">×</button>
                             )}
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                     {isRSS && (
                                         <span className="text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.5 animate-pulse rounded-sm">LIVE RSS 📡</span>
                                     )}
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                                        item.originalData.source === 'espn' ? 'bg-red-900/30 text-red-500' :
                                        item.originalData.source === 'globoesporte' ? 'bg-green-900/30 text-green-500' :
                                        'bg-gray-800 text-gray-400'
                                     }`}>
                                        {item.originalData.source}
                                     </span>
                                 </div>
                                 <span className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
                                     item.impactScore > 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                                 }`}>
                                     Impact: {item.impactScore}
                                 </span>
                             </div>
                             <h4 className="text-white font-bold text-sm line-clamp-2 mb-1">{item.originalData.title}</h4>
                             <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.fusionSummary}</p>
                             <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                                 <span className="text-[10px] text-gray-600">{new Date(item.processedAt).toLocaleTimeString()}</span>
                                 <span className="text-[10px] text-brand-500 uppercase font-bold">{item.recommendedAction}</span>
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- LIVE PANEL ---
export const MonkeyLivePanel = ({ matches, tips }: { matches: Match[], tips: Tip[] }) => {
    // Filter only live matches
    const liveMatches = matches.filter(m => m.status === 'Live');

    return (
        <div className="bg-surface-900 border border-white/5 h-full flex flex-col">
            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h3 className="text-white font-display uppercase tracking-widest text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Live Monitor
                </h3>
                <span className="text-gray-500 text-xs font-mono">{liveMatches.length} Jogos Ao Vivo</span>
            </div>
            
            <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                {liveMatches.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center text-gray-600 font-mono text-xs h-32">
                        SEM JOGOS AO VIVO NO MOMENTO
                    </div>
                ) : liveMatches.map(match => (
                    <div key={match.id} className="bg-black border border-white/10 p-4 relative group hover:border-brand-500/50 transition-colors">
                        <div className="flex justify-between mb-4">
                            <span className="text-[10px] bg-red-900/30 text-red-500 border border-red-500/30 px-2 rounded uppercase font-bold">LIVE {match.stats.currentMinute}'</span>
                            <span className="text-xs text-gray-400 font-mono">{match.league}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4">
                             <div className="text-center w-1/3">
                                 <p className="text-white font-bold truncate">{match.teamA}</p>
                             </div>
                             <div className="text-2xl font-mono font-bold text-brand-500 bg-brand-500/10 px-3 py-1 rounded">
                                 {match.stats.homeScore}-{match.stats.awayScore}
                             </div>
                             <div className="text-center w-1/3">
                                 <p className="text-white font-bold truncate">{match.teamB}</p>
                             </div>
                        </div>

                        {/* Estatísticas Rápidas */}
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-gray-500 font-mono bg-white/5 p-2 rounded-sm mb-2">
                            <div>
                                <span className="block text-white font-bold">{match.stats.attacks?.dangerous || 0}</span>
                                AP
                            </div>
                            <div>
                                <span className="block text-white font-bold">{(match.stats.shotsOnTarget?.home || 0) + (match.stats.shotsOnTarget?.away || 0)}</span>
                                Chutes
                            </div>
                            <div>
                                <span className="block text-white font-bold">{match.stats.corners?.total || 0}</span>
                                Cantos
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- STATIC COMPONENTS ---

export const OperationalChecklist = () => (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Verificação de Sistemas</h3>
        <ul className="space-y-3">
            {[
                { label: 'Ingestão de Dados (API)', status: 'Operational', color: 'text-green-500' },
                { label: 'Scout Engine v2.1', status: 'Operational', color: 'text-green-500' },
                { label: 'Fusion Core (Gemini)', status: 'Standby', color: 'text-yellow-500' },
                { label: 'Database Sync', status: 'Operational', color: 'text-green-500' },
            ].map((item: ChecklistItem, i) => (
                <li key={i} className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2 last:border-0">
                    <span className="text-gray-300">{item.label}</span>
                    <span className={`font-bold ${item.color} uppercase`}>● {item.status}</span>
                </li>
            ))}
        </ul>
    </div>
);

export const ImprovementsPanel = () => (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">Melhorias do Sistema</h3>
        <ul className="space-y-4">
             {[
                 { title: 'Scout de Basquete', desc: 'Ajustar peso do Pace para jogos Back-to-Back.' },
                 { title: 'Filtro de Notícias', desc: 'Ignorar notícias de fofoca, focar em lesões.' }
             ].map((item: ImprovementProposal, i) => (
                 <li key={i} className="group">
                     <p className="text-white font-bold text-xs mb-1 group-hover:text-brand-500 transition-colors">» {item.title}</p>
                     <p className="text-gray-500 text-[10px] pl-3 border-l border-white/10">{item.desc}</p>
                 </li>
             ))}
        </ul>
    </div>
);

export const ProjectEvolutionRoadmap = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
            { phase: '01', title: 'Fundação', status: 'Completed', desc: 'Core do sistema e integração API.' },
            { phase: '02', title: 'Inteligência', status: 'In Progress', desc: 'Fusion Engine e Scout Avançado.' },
            { phase: '03', title: 'Automação', status: 'Pending', desc: 'Bots de Telegram e Auto-Bet.' },
            { phase: '04', title: 'Escala', status: 'Pending', desc: 'SaaS Multi-Tenant.' }
        ].map((p: RoadmapPhase, i) => (
            <div key={i} className={`border p-4 relative overflow-hidden ${p.status === 'In Progress' ? 'border-brand-500 bg-brand-500/5' : 'border-white/10 bg-surface-900/50'}`}>
                <span className="text-[40px] font-bold absolute -right-2 -top-4 opacity-5 text-white">{p.phase}</span>
                <p className={`text-[10px] uppercase font-bold mb-2 ${p.status === 'Completed' ? 'text-green-500' : p.status === 'In Progress' ? 'text-brand-500' : 'text-gray-600'}`}>
                    ● {p.status}
                </p>
                <h4 className="text-white font-bold text-sm mb-1">{p.title}</h4>
                <p className="text-gray-500 text-[10px]">{p.desc}</p>
            </div>
        ))}
    </div>
);

export const NewsImplementationChecklist = () => (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none p-6">
        <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-4">News Engine Tasks</h3>
        <ul className="space-y-2">
            {[
                { label: 'Conexão RSS GloboEsporte', done: true },
                { label: 'Análise de Sentimento (Gemini)', done: true },
                { label: 'Correlação com Scout Engine', done: false },
                { label: 'Alerta de "Breaking News"', done: false }
            ].map((task: RoadmapTask, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                    <span className={task.done ? 'text-green-500' : 'text-gray-600'}>{task.done ? '☑' : '☐'}</span>
                    <span className={task.done ? 'line-through opacity-50' : ''}>{task.label}</span>
                </li>
            ))}
        </ul>
    </div>
);

// --- MONKEY STATS TERMINAL (UPDATED WITH KELLY AND IMPORTS) ---

interface MonkeyStatsTerminalProps {
    statsQueue: StatProcessedItem[];
    onStatProcessed: (item: StatProcessedItem) => Promise<void>;
}

export const MonkeyStatsTerminal: React.FC<MonkeyStatsTerminalProps> = ({ statsQueue, onStatProcessed }) => {
    const [activeTab, setActiveTab] = useState<'TERMINAL' | 'CONFIG'>('TERMINAL');
    const [entity, setEntity] = useState('');
    const [rawStat, setRawStat] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCrawling, setIsCrawling] = useState(false);

    // CONFIG STATE
    const [configKey, setConfigKey] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    useEffect(() => {
        const savedKey = localStorage.getItem('monkey_stats_api_key');
        if (savedKey) setConfigKey(savedKey);
    }, []);

    const handleSaveConfig = () => {
        localStorage.setItem('monkey_stats_api_key', configKey);
        alert("Chave de API salva com sucesso! O módulo agora usará esta credencial.");
    };

    const handleTestConnection = async () => {
        setConnectionStatus('loading');
        try {
            const success = await testStatsProvider(configKey);
            setConnectionStatus(success ? 'success' : 'error');
        } catch {
            setConnectionStatus('error');
        }
    };

    const handleManualProcess = async () => {
        if (!entity || !rawStat) return;
        setIsProcessing(true);
        
        try {
            const result = await geminiEngine.processRawStat(entity, rawStat);
            if (result) {
                setIsProcessing(false);
                setIsSaving(true);
                const fullItem: StatProcessedItem = {
                    ...result,
                    id: `stat-${Date.now()}-${Math.random()}`,
                    entityName: entity,
                    rawData: rawStat,
                    status: 'PENDING',
                    processedAt: new Date().toISOString()
                };
                await onStatProcessed(fullItem);
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
            // Tenta usar a API Real se a chave estiver configurada
            let crawlerData = [];
            if (configKey && configKey.length > 5) {
                console.log("Using Real SportsDataIO API...");
                crawlerData = await fetchSportsDataIOProps(configKey);
                if (crawlerData.length === 0) {
                    alert("Aviso: Nenhum dado retornado da SportsDataIO. Usando fallback de simulação.");
                    crawlerData = await fetchPlayerStatsCrawler();
                }
            } else {
                crawlerData = await fetchPlayerStatsCrawler();
            }

            for (const item of crawlerData) {
                const result = await geminiEngine.processRawStat(item.entity, item.stat);
                if (result) {
                     const fullItem: StatProcessedItem = {
                        ...result,
                        id: `stat-${Date.now()}-${Math.random()}`,
                        entityName: item.entity,
                        rawData: item.stat,
                        status: 'PENDING',
                        processedAt: new Date().toISOString()
                    };
                    await onStatProcessed(fullItem);
                }
            }
        } catch (e) {
            console.error(e);
        }
        setIsCrawling(false);
    };

    // --- NEW FUNCTION: REAL TEAM DATA FETCH ---
    const handleFetchTeamRealData = async () => {
        if (!entity) return alert("Digite o ID ou Nome do time no campo Entidade.");
        // Check if entity is numeric (Team ID)
        if (!/^\d+$/.test(entity)) return alert("Para buscar dados reais, use o ID do time (Ex: 127 para Flamengo) no campo Entidade.");

        setIsProcessing(true);
        try {
            const result = await fetchRealTeamStats(entity);
            if (result) {
                setEntity(result.name);
                setRawStat(result.stat);
            } else {
                alert("Não foi possível encontrar dados recentes para este time ou API Key inválida.");
            }
        } catch(e) {
            console.error(e);
        }
        setIsProcessing(false);
    };

    return (
        <div className="bg-[#0B0B0D] border border-[#1C1C1F] h-full flex flex-col font-sans">
            {/* Header with Navigation */}
            <div className="flex flex-col md:flex-row border-b border-[#1C1C1F] bg-[#121214]">
                <div className="p-6 flex items-center gap-4 border-r border-[#1C1C1F] min-w-[300px]">
                     <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        MONKEY STATS
                    </h3>
                    <p className="text-[#A3A3A8] text-[10px] font-mono mt-1">DEEP DATA CORE</p>
                </div>
                <div className="flex flex-1 items-end">
                    <button 
                        onClick={() => setActiveTab('TERMINAL')}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-colors border-r border-[#1C1C1F] ${activeTab === 'TERMINAL' ? 'bg-[#0B0B0D] text-white border-t-2 border-t-blue-500' : 'text-gray-500 hover:text-gray-300 bg-[#121214]'}`}
                    >
                        Workstation
                    </button>
                    <button 
                        onClick={() => setActiveTab('CONFIG')}
                        className={`px-8 py-4 text-xs font-bold uppercase tracking-widest transition-colors border-r border-[#1C1C1F] ${activeTab === 'CONFIG' ? 'bg-[#0B0B0D] text-white border-t-2 border-t-blue-500' : 'text-gray-500 hover:text-gray-300 bg-[#121214]'}`}
                    >
                        Data Source (API)
                    </button>
                </div>
                {activeTab === 'TERMINAL' && (
                    <div className="p-4 flex items-center gap-2">
                        <button 
                            onClick={handleFetchTeamRealData}
                            className="bg-surface-800 border border-white/10 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-surface-700"
                        >
                            📡 Fetch Real Team Data
                        </button>
                        <button 
                            onClick={handleCrawler}
                            disabled={isCrawling}
                            className="bg-blue-900/20 border border-blue-500/30 text-blue-500 px-4 py-2 text-xs font-bold uppercase hover:bg-blue-900/40 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isCrawling ? <span className="animate-spin">◐</span> : '🕷️'}
                            {isCrawling ? 'Crawling...' : 'RUN LIVE SCAN'}
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'TERMINAL' ? (
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel: Input & Calculator */}
                    <div className="w-1/3 p-4 border-r border-[#1C1C1F] flex flex-col overflow-y-auto">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Entidade (Jogador/Time)</label>
                                <input 
                                    className="w-full bg-[#1C1C1F] text-white text-xs border border-white/10 px-3 py-3 outline-none focus:border-brand-500"
                                    placeholder="Ex: Erling Haaland ou ID 127"
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
                            statsQueue.map(item => {
                                // Verifica se é um dado de demonstração
                                const isDemo = (item.entityName && item.entityName.includes('[DEMO]')) || (item.rawData && item.rawData.includes('[DEMO]'));
                                
                                return (
                                    <div key={item.id} className={`bg-[#121214] border border-[#1C1C1F] p-4 flex gap-4 hover:border-blue-500/30 transition-all group relative ${isDemo ? 'opacity-90' : ''}`}>
                                        <div className="absolute top-0 right-0 p-2 flex items-center gap-2">
                                            {isDemo && (
                                                <span className="text-[9px] bg-yellow-500 text-black font-bold px-2 py-0.5 uppercase rounded-sm animate-pulse">⚠️ SIMULATION</span>
                                            )}
                                            <span className="text-[9px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{new Date(item.processedAt).toLocaleTimeString()}</span>
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
                                );
                            })
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-12 max-w-3xl mx-auto w-full">
                    <div className="bg-[#121214] border border-[#1C1C1F] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🕷️</div>
                        <h3 className="text-xl font-bold text-white mb-2 font-display">Configuração de Fonte de Dados</h3>
                        <p className="text-gray-500 text-sm mb-8 font-mono">Conecte provedores externos (NBA API, Sportmonks ou Custom Crawler) para alimentar o módulo de estatísticas avançadas.</p>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Endpoint API Key / Crawler Token</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="password" 
                                        className="flex-1 bg-black/50 border border-white/10 p-4 text-white font-mono text-sm focus:border-blue-500 outline-none"
                                        placeholder="sk_live_..."
                                        value={configKey}
                                        onChange={(e) => setConfigKey(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSaveConfig}
                                        className="bg-white text-black font-bold uppercase text-xs px-6 hover:bg-gray-200"
                                    >
                                        Salvar
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-2">A chave é armazenada localmente e usada apenas para requisições de Player Props.</p>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Teste de Conectividade</h4>
                                        <p className="text-xs text-gray-500">Verifique se o endpoint está respondendo corretamente.</p>
                                    </div>
                                    <button 
                                        onClick={handleTestConnection}
                                        disabled={connectionStatus === 'loading' || !configKey}
                                        className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border transition-all ${
                                            connectionStatus === 'success' ? 'bg-green-500/20 border-green-500 text-green-500' :
                                            connectionStatus === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' :
                                            'bg-surface-800 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {connectionStatus === 'loading' ? 'Testando...' : 
                                         connectionStatus === 'success' ? '● Conectado' : 
                                         connectionStatus === 'error' ? 'Erro de Conexão' : 'Testar Conexão'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
