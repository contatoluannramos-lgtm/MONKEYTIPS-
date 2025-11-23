import React from 'react';
import { SportType } from '../types';

interface ClientHeaderProps {
  activeSport: SportType | 'All';
  onSportChange: (sport: SportType | 'All') => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ activeSport, onSportChange }) => {
  return (
    <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-surface-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-sm flex items-center justify-center text-brand-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M12 2a10 10 0 0 0-10 10h10V2z"></path>
                <path d="M12 12l9.33 5.39a10 10 0 0 1-13.66 0L12 12z"></path>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-white leading-none">MONKEY<span className="text-brand-500">TIPS</span></span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-mono">Strategic Intelligence</span>
            </div>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-1 bg-surface-900/50 p-1 rounded-none border border-white/5">
              {['All', ...Object.values(SportType)].map((sport) => (
                <button
                  key={sport}
                  onClick={() => onSportChange(sport as SportType | 'All')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-300 font-display tracking-wide uppercase ${
                    activeSport === sport
                      ? 'bg-brand-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {sport === 'All' ? 'Visão Geral' : sport}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className="md:hidden flex overflow-x-auto py-3 px-4 space-x-3 border-t border-white/5 bg-surface-950 no-scrollbar">
         {['All', ...Object.values(SportType)].map((sport) => (
            <button
              key={sport}
              onClick={() => onSportChange(sport as SportType | 'All')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border ${
                activeSport === sport
                  ? 'bg-brand-500/10 border-brand-500 text-brand-500'
                  : 'bg-surface-800 border-transparent text-gray-500'
              }`}
            >
              {sport === 'All' ? 'Geral' : sport}
            </button>
          ))}
      </div>
    </nav>
  );
};

export const Footer = () => (
  <footer className="border-t border-white/5 py-12 mt-12 bg-surface-950">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <div className="flex justify-center mb-4 text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-display tracking-wide">© 2024 MONKEY TIPS INTEL.</p>
      <p className="text-gray-600 text-xs mt-3 font-mono">ALGORITHMIC SPORTS FORECASTING SYSTEM. 18+</p>
    </div>
  </footer>
);