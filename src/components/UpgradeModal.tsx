import React from 'react';
import { UpgradeCard } from '../types/game';
import { Zap, Wind, ChevronsRight, Flame, CircleDot, Sparkles, HeartPulse, BatteryCharging, Radio, Copy } from 'lucide-react';

interface UpgradeModalProps {
  cards: UpgradeCard[];
  onSelect: (card: UpgradeCard) => void;
  wave: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ cards, onSelect, wave }) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'dmg_boost': return <Zap className="w-5 h-5 text-sky-400" />;
      case 'speed_boost': return <Wind className="w-5 h-5 text-emerald-400" />;
      case 'pierce_boost': return <ChevronsRight className="w-5 h-5 text-purple-400" />;
      case 'fire_rate': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'orbital_companion': return <CircleDot className="w-5 h-5 text-sky-400" />;
      case 'explosive_kills': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'vampiric_shield': return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case 'overdrive_efficiency': return <BatteryCharging className="w-5 h-5 text-yellow-400" />;
      case 'kinetic_blast_dash': return <Radio className="w-5 h-5 text-cyan-400" />;
      case 'twin_shot': return <Copy className="w-5 h-5 text-indigo-400" />;
      default: return <Zap className="w-5 h-5 text-sky-400" />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'légendaire':
        return <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Légendaire</span>;
      case 'rare':
        return <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">Rare</span>;
      default:
        return <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Commun</span>;
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 select-none animate-fadeIn">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <div className="text-center mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-sky-400 mb-1">
            VAGUE {wave} SURVÉCUE
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Sélectionnez une Amélioration
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Choisissez un module cybernétique pour renforcer votre arsenal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className="flex flex-col text-left p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/70 hover:bg-slate-850 hover:shadow-[0_0_25px_rgba(56,189,248,0.2)] transition-all duration-200 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-slate-800/80 group-hover:scale-110 transition-transform duration-200">
                  {getIcon(card.id)}
                </div>
                {getRarityBadge(card.rarity)}
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors mb-2">
                {card.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed mb-4 grow">
                {card.description}
              </p>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors flex items-center justify-between">
                <span>INSTALLER LE MODULE</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
