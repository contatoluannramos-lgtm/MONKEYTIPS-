import React, { useState } from 'react';
import { ImprovementProposal, ChecklistItem, RoadmapPhase } from '../types';

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

export const ProjectEvolutionRoadmap = () => {
  const [phases, setPhases] = useState<RoadmapPhase[]>([
    {
      id: 'p1',
      title: 'FASE 1: FUNDAÇÃO (ATUAL)',
      description: 'Estrutura base, UI/UX Militar, IA Simples e Roteamento.',
      tasks: [
        { id: 't1_1', name: 'Design "Strategic Mind" e UI Tática', isCompleted: true },
        { id: 't1_2', name: 'Configuração do Google Gemini 2.5 Flash', isCompleted: true },
        { id: 't1_3', name: 'Separação Rígida Admin / Cliente', isCompleted: true },
        { id: 't1_4', name: 'Mock Data para MVP', isCompleted: true },
        { id: 't1_5', name: 'Deploy Inicial na Vercel', isCompleted: true },
      ]
    },
    {
      id: 'p2',
      title: 'FASE 2: INTEGRAÇÃO DE DADOS',
      description: 'Conexão com APIs reais e armazenamento persistente.',
      tasks: [
        { id: 't2_1', name: 'Integração API SofaScore/FlashScore (Ao Vivo)', isCompleted: false },
        { id: 't2_2', name: 'Banco de Dados (Supabase/Firebase)', isCompleted: false },
        { id: 't2_3', name: 'Autenticação Real de Admin', isCompleted: false },
        { id: 't2_4', name: 'Histórico de Performance das Tips', isCompleted: false },
      ]
    },
    {
      id: 'p3',
      title: 'FASE 3: MODELO DE IA AVANÇADO',
      description: 'Refinamento do prompt e análise preditiva complexa.',
      tasks: [
        { id: 't3_1', name: 'Ajuste Fino (Fine-tuning) por Liga', isCompleted: false },
        { id: 't3_2', name: 'Análise de Lesões e Clima em Tempo Real', isCompleted: false },
        { id: 't3_3', name: 'Comparador de Odds Automático', isCompleted: false },
        { id: 't3_4', name: 'Sistema de Alertas via Telegram/Email', isCompleted: false },
      ]
    },
    {
      id: 'p4',
      title: 'FASE 4: ESCALA E MONETIZAÇÃO',
      description: 'Transformar o sistema em produto SAAS comercial.',
      tasks: [
        { id: 't4_1', name: 'Área de Membros (Pagamento Stripe)', isCompleted: false },
        { id: 't4_2', name: 'App Mobile PWA', isCompleted: false },
        { id: 't4_3', name: 'Analytics de Usuário (Mixpanel)', isCompleted: false },
        { id: 't4_4', name: 'Suporte Multi-idioma', isCompleted: false },
      ]
    }
  ]);

  const toggleTask = (phaseId: string, taskId: string) => {
    setPhases(phases.map(phase => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          tasks: phase.tasks.map(task => 
            task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
          )
        };
      }
      return phase;
    }));
  };

  const calculateProgress = (tasks: { isCompleted: boolean }[]) => {
    const completed = tasks.filter(t => t.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur rounded-none p-6 border border-white/5 col-span-full">
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <div>
           <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
             🚀 Roadmap de Evolução do Projeto
           </h3>
           <p className="text-xs text-gray-500 font-mono mt-1">
             Progresso Global: {Math.round(phases.reduce((acc, p) => acc + calculateProgress(p.tasks), 0) / phases.length)}%
           </p>
        </div>
        <div className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-mono uppercase tracking-widest animate-pulse">
           Em Desenvolvimento
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {phases.map((phase) => {
          const progress = calculateProgress(phase.tasks);
          return (
            <div key={phase.id} className="bg-surface-950/50 p-4 border border-white/5 hover:border-white/20 transition-all flex flex-col h-full group">
              
              {/* Header */}
              <div className="mb-4">
                 <div className="flex justify-between items-center mb-2">
                   <h4 className="text-sm font-bold text-white font-display">{phase.title}</h4>
                   <span className={`text-[10px] font-mono font-bold ${progress === 100 ? 'text-green-500' : 'text-gray-500'}`}>{progress}%</span>
                 </div>
                 {/* Progress Bar */}
                 <div className="h-1.5 w-full bg-surface-800 rounded-none overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${progress === 100 ? 'bg-green-500' : 'bg-brand-500'}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                 </div>
                 <p className="text-[10px] text-gray-400 mt-2 leading-relaxed min-h-[2.5em]">{phase.description}</p>
              </div>

              {/* Tasks */}
              <div className="space-y-2 mt-auto">
                {phase.tasks.map(task => (
                  <div key={task.id} 
                       onClick={() => toggleTask(phase.id, task.id)}
                       className={`flex items-start gap-2 p-1.5 rounded-none cursor-pointer hover:bg-white/5 transition-colors border border-transparent ${task.isCompleted ? 'opacity-50' : 'opacity-100'}`}>
                    <div className={`w-4 h-4 mt-0.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
                       task.isCompleted ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-gray-600'
                    }`}>
                       {task.isCompleted && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"></path></svg>}
                    </div>
                    <span className={`text-xs font-mono leading-tight ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export const ImprovementsPanel = () => {
  const [proposals, setProposals] = useState<ImprovementProposal[]>([
    { id: '1', title: 'Adicionar eSports (LoL)', description: 'Incluir rastreamento de dragões e ouro.', votes: 42, status: 'Pending' },
    { id: '2', title: 'Melhorar filtro de odds', description: 'Permitir filtrar por range de odds (ex: 1.5 - 2.0)', votes: 28, status: 'Implemented' },
  ]);

  const [newTitle, setNewTitle] = useState('');

  const handleAdd = () => {
    if(!newTitle) return;
    setProposals([...proposals, {
      id: Date.now().toString(),
      title: newTitle,
      description: 'Nova sugestão do admin',
      votes: 0,
      status: 'Pending'
    }]);
    setNewTitle('');
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur rounded-none p-6 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display">
        💡 Melhorias do Sistema
      </h3>
      
      <div className="space-y-4 mb-6">
        {proposals.map(p => (
          <div key={p.id} className="bg-surface-950/50 p-4 border border-white/5 flex items-center justify-between group hover:border-brand-500/30 transition-colors">
            <div>
              <h4 className="text-white font-medium text-sm">{p.title}</h4>
              <p className="text-gray-500 text-xs font-mono">{p.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider border ${
                p.status === 'Implemented' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-brand-500/10 border-brand-500 text-brand-500'
              }`}>
                {p.status}
              </span>
              <div className="text-gray-500 text-xs font-mono">{p.votes} votos</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nova proposta de sistema..." 
          className="bg-surface-950 border border-white/10 text-white px-4 py-2 flex-1 focus:outline-none focus:border-brand-500 text-sm font-mono"
        />
        <button 
          onClick={handleAdd}
          className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 text-sm font-medium transition-colors uppercase tracking-wider"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export const OperationalChecklist = () => {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', label: 'Verificar status das APIs de Dados', checked: true },
    { id: '2', label: 'Confirmar escalações (Futebol)', checked: false },
    { id: '3', label: 'Analisar movimento de linhas (Odds)', checked: false },
    { id: '4', label: 'Revisar previsão de tempo (Clima)', checked: false },
  ]);

  const [newItem, setNewItem] = useState('');

  const toggleCheck = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const addItem = () => {
    if (!newItem) return;
    setItems([...items, { id: Date.now().toString(), label: newItem, checked: false }]);
    setNewItem('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="bg-surface-900/50 backdrop-blur rounded-none p-6 border border-white/5">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display">
        📋 Protocolo de Validação
      </h3>

      <div className="space-y-2 mb-6">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => toggleCheck(item.id)}
                className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-brand-500 border-brand-500 text-black' : 'bg-transparent border-gray-600 hover:border-brand-500'
                }`}
              >
                {item.checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"></path></svg>}
              </button>
              <span className={`text-sm font-mono ${item.checked ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                {item.label}
              </span>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-white/5 pt-4">
        <input 
          type="text" 
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Novo critério..." 
          className="bg-surface-950 border border-white/10 text-white px-3 py-1.5 flex-1 focus:outline-none focus:border-brand-500 text-xs font-mono"
        />
        <button 
          onClick={addItem}
          className="bg-surface-800 hover:bg-surface-700 text-white px-3 py-1.5 text-xs font-medium border border-white/10 uppercase"
        >
          +
        </button>
      </div>
    </div>
  );
};