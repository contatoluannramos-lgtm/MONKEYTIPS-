
import React, { useState, useEffect } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase, Tip, TipStatus, CalibrationConfig, ScoutResult, FusionAnalysis, SportType } from '../types';
import { dbService } from '../services/databaseService';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../services/supabaseClient';
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

  const handleChange = (section: keyof CalibrationConfig, key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
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
      <div className="border-b border-white/5 flex overflow-x-auto no-scrollbar">
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

      <div className="p-8">
        <h3 className="text-lg font-bold text-white mb-6 font-display flex items-center gap-2">
           🎛️ Parâmetros do Algoritmo: {tabs.find(t => t.id === activeTab)?.label}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(config[activeTab]).map(([key, value]) => (
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
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
           <button className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors">
             Salvar Calibragem
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

// --- NEW IMPLEMENTATIONS (Previously Missing) ---

export const ActivationPanel = () => {
  const [keys, setKeys] = useState({
    football: '',
    gemini: '',
    supabaseUrl: '',
    supabaseKey: ''
  });

  useEffect(() => {
    setKeys({
      football: localStorage.getItem('monkey_football_api_key') || '',
      gemini: localStorage.getItem('monkey_gemini_api_key') || '',
      supabaseUrl: localStorage.getItem('supabase_project_url') || '',
      supabaseKey: localStorage.getItem('supabase_anon_key') || ''
    });
  }, []);

  const handleSave = () => {
    localStorage.setItem('monkey_football_api_key', keys.football);
    localStorage.setItem('monkey_gemini_api_key', keys.gemini);
    localStorage.setItem('supabase_project_url', keys.supabaseUrl);
    localStorage.setItem('supabase_anon_key', keys.supabaseKey);
    alert('Configurações salvas! Recarregue a página para aplicar mudanças no Supabase.');
    window.location.reload();
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-8">
      <h3 className="text-lg font-display font-medium text-white mb-6">Chaves de Acesso & API</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Monkey Football API (RapidAPI)</label>
          <input 
            type="password" 
            className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={keys.football}
            onChange={(e) => setKeys({...keys, football: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Google Gemini API Key</label>
          <input 
            type="password" 
            className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={keys.gemini}
            onChange={(e) => setKeys({...keys, gemini: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Supabase Project URL</label>
             <input 
                type="text" 
                className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.supabaseUrl}
                onChange={(e) => setKeys({...keys, supabaseUrl: e.target.value})}
             />
          </div>
          <div>
             <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Supabase Anon Key</label>
             <input 
                type="password" 
                className="w-full bg-black/50 border border-white/10 text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
                value={keys.supabaseKey}
                onChange={(e) => setKeys({...keys, supabaseKey: e.target.value})}
             />
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Salvar Configurações
        </button>
      </div>
    </div>
  );
};

export const ProjectEvolutionRoadmap = () => {
  const phases: RoadmapPhase[] = [
    {
      id: 'p1', title: 'Fase 1: Core', description: 'Estrutura base e integração API',
      tasks: [
        { id: 't1', name: 'Integração Gemini 2.5 Flash', isCompleted: true },
        { id: 't2', name: 'Setup Supabase Database', isCompleted: true },
        { id: 't3', name: 'Dashboard Admin V1', isCompleted: true },
      ]
    },
    {
      id: 'p2', title: 'Fase 2: Intelligence', description: 'Motores de decisão avançados',
      tasks: [
        { id: 't4', name: 'Scout Engine (Matemática)', isCompleted: true },
        { id: 't5', name: 'Fusion Center (Decision)', isCompleted: true },
        { id: 't6', name: 'Monkey Labs (Vision)', isCompleted: true },
      ]
    },
    {
      id: 'p3', title: 'Fase 3: Scale', description: 'Otimização e Novos Esportes',
      tasks: [
        { id: 't7', name: 'Calibragem Fina por Liga', isCompleted: false },
        { id: 't8', name: 'App Mobile Nativo', isCompleted: false },
      ]
    }
  ];

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6">
       <h3 className="text-lg font-display font-medium text-white mb-6">Roadmap de Evolução</h3>
       <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {phases.map((phase, index) => (
             <div key={phase.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-brand-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   {index + 1}
                </div>
                
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface-950 p-4 border border-white/5 rounded shadow-lg">
                   <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-sm">{phase.title}</span>
                   </div>
                   <p className="text-xs text-gray-500 mb-3">{phase.description}</p>
                   <div className="space-y-1">
                      {phase.tasks.map(task => (
                         <div key={task.id} className="flex items-center gap-2 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full ${task.isCompleted ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                            <span className={task.isCompleted ? 'text-gray-300 line-through opacity-60' : 'text-gray-400'}>{task.name}</span>
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

export const ImprovementsPanel = () => {
  const proposals: ImprovementProposal[] = [
     { id: 'i1', title: 'Dark Mode Real', description: 'Ajustar contraste para telas OLED.', votes: 12, status: 'Pending' },
     { id: 'i2', title: 'Odds em Tempo Real', description: 'WebSocket para atualizar odds sem refresh.', votes: 8, status: 'Approved' },
  ];

  return (
    <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6">
       <h3 className="text-lg font-display font-medium text-white mb-4">Propostas de Melhoria</h3>
       <div className="space-y-3">
          {proposals.map(prop => (
             <div key={prop.id} className="bg-surface-950 border-l-2 border-brand-500 p-3">
                <div className="flex justify-between items-start">
                   <h4 className="text-sm font-bold text-gray-200">{prop.title}</h4>
                   <span className={`text-[10px] px-2 py-0.5 rounded ${prop.status === 'Approved' ? 'bg-green-900 text-green-500' : 'bg-gray-800 text-gray-400'}`}>{prop.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
                <div className="mt-2 text-xs font-mono text-brand-500">▲ {prop.votes} Votos</div>
             </div>
          ))}
          <button className="w-full py-2 text-xs text-gray-500 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 transition-colors mt-2">
             + Adicionar Sugestão
          </button>
       </div>
    </div>
  );
};

export const OperationalChecklist = () => {
   const [items, setItems] = useState<ChecklistItem[]>([
      { id: 'c1', label: 'Verificar saldo API Key', checked: false },
      { id: 'c2', label: 'Calibrar Scout Engine para Weekend', checked: false },
      { id: 'c3', label: 'Backup do Supabase DB', checked: true },
   ]);

   const toggle = (id: string) => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
   };

   return (
      <div className="bg-surface-900/50 backdrop-blur border border-white/5 p-6">
         <h3 className="text-lg font-display font-medium text-white mb-4">Checklist Operacional</h3>
         <div className="space-y-2">
            {items.map(item => (
               <label key={item.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggle(item.id)}>
                  <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${item.checked ? 'bg-brand-500 border-brand-500' : 'border-gray-600 group-hover:border-brand-500'}`}>
                     {item.checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                  </div>
                  <span className={`text-sm ${item.checked ? 'text-gray-600 line-through' : 'text-gray-300'}`}>{item.label}</span>
               </label>
            ))}
         </div>
      </div>
   );
};

export const TipsHistoryPanel = ({ tips, onUpdateStatus }: { tips: Tip[], onUpdateStatus: (id: string, status: TipStatus) => void }) => {
   return (
      <div className="bg-surface-900/50 backdrop-blur border border-white/5 rounded-none overflow-hidden">
         <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-display font-medium text-white">Histórico de Sinais</h3>
            <div className="flex gap-2">
               <span className="text-xs font-mono text-gray-500">Total: {tips.length}</span>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-black/20 text-xs font-mono text-gray-500 uppercase tracking-wider">
                     <th className="px-6 py-3 border-b border-white/5">Data</th>
                     <th className="px-6 py-3 border-b border-white/5">Evento</th>
                     <th className="px-6 py-3 border-b border-white/5">Tip</th>
                     <th className="px-6 py-3 border-b border-white/5 text-center">Confiança</th>
                     <th className="px-6 py-3 border-b border-white/5 text-center">Odds</th>
                     <th className="px-6 py-3 border-b border-white/5 text-center">Status</th>
                     <th className="px-6 py-3 border-b border-white/5">Ações</th>
                  </tr>
               </thead>
               <tbody className="text-sm text-gray-300">
                  {tips.map(tip => (
                     <tr key={tip.id} className="hover:bg-white/5 transition-colors border-b border-white/5">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                           {new Date(tip.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold text-white">{tip.matchTitle}</div>
                           <div className="text-xs text-gray-500 uppercase">{tip.sport}</div>
                        </td>
                        <td className="px-6 py-4 text-brand-500 font-medium">
                           {tip.prediction}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`px-2 py-1 text-xs font-bold rounded ${tip.confidence > 80 ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                              {tip.confidence}%
                           </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono">
                           {tip.odds.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${tip.status === 'Pending' ? 'bg-blue-100 text-blue-800' : 
                                tip.status === 'Won' ? 'bg-green-100 text-green-800' : 
                                tip.status === 'Lost' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                              {tip.status}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex gap-2">
                              <button onClick={() => onUpdateStatus(tip.id, 'Won')} className="text-xs bg-green-500/10 text-green-500 hover:bg-green-500/20 px-2 py-1 rounded border border-green-500/20">WIN</button>
                              <button onClick={() => onUpdateStatus(tip.id, 'Lost')} className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded border border-red-500/20">LOSS</button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};
