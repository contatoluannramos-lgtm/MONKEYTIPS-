import React, { useState } from 'react';
import { ImprovementProposal, ChecklistItem } from '../types';

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