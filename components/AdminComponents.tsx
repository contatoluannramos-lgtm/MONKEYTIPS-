import React, { useState } from 'react';
import { ImprovementProposal } from '../types';

export const StatCard = ({ title, value, change, icon }: { title: string, value: string, change: string, icon: string }) => (
  <div className="bg-dark-800 p-6 rounded-xl border border-dark-800 shadow-lg hover:border-monkey-500/30 transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
      <div className="p-2 bg-dark-900 rounded-lg text-2xl">{icon}</div>
    </div>
    <p className={`text-xs mt-3 font-medium ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
      {change} <span className="text-gray-500 ml-1">vs mês anterior</span>
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
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-800">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        💡 Melhorias das Análises
      </h3>
      
      <div className="space-y-4 mb-6">
        {proposals.map(p => (
          <div key={p.id} className="bg-dark-900 p-4 rounded-lg flex items-center justify-between group hover:bg-dark-900/80">
            <div>
              <h4 className="text-white font-medium">{p.title}</h4>
              <p className="text-gray-400 text-xs">{p.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                p.status === 'Implemented' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                {p.status}
              </span>
              <div className="text-gray-500 text-sm font-mono">{p.votes} votos</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nova sugestão..." 
          className="bg-dark-900 border border-gray-700 text-white px-4 py-2 rounded-lg flex-1 focus:outline-none focus:border-monkey-500"
        />
        <button 
          onClick={handleAdd}
          className="bg-monkey-600 hover:bg-monkey-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
};