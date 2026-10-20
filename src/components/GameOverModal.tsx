import React from 'react';
import { RotateCcw, Home, Trophy, Skull, Sparkles, ArrowRight } from 'lucide-react';
import { GameStats } from '../game/engine';

interface GameOverModalProps {
  stats: GameStats;
  highScore: number;
  isNewHigh: boolean;
  shardsEarned?: number;
  totalShards?: number;
  onOpenHangar?: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHigh,
  shardsEarned = 0,
  totalShards = 0,
  onOpenHangar,
  onPlayAgain,
  onHome,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem < 10 ? '0' : ''}${rem}s`;
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/90 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-400">
          <Skull className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-1">
          Coque Détruite
        </h2>

        {isNewHigh ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-amber-400 mb-4">
            <Trophy className="w-4 h-4" />
            <span>NOUVEAU RECORD ÉTABLI !</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-400 mb-4">
            FIN DE SESSION ROGUE
          </div>
        )}

        {/* Primary Score Counter */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
            SCORE FINAL
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white tabular-nums drop-shadow">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Quantum Crystals Shards Gained Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/70 to-indigo-950/70 border border-sky-500/40 mb-4">
          <div className="flex items-center gap-2.5 text-left">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-white font-mono">
                +{shardsEarned} Cristaux Quantiques
              </div>
              <div className="text-[10px] text-sky-300/80 font-mono">
                Solde total : {totalShards} cristaux sauvegardés
              </div>
            </div>
          </div>

          {onOpenHangar && (
            <button
              onClick={onOpenHangar}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(56,189,248,0.4)] cursor-pointer active:scale-95"
            >
              <span>ÉVOLUER</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Detailed Stats Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-left mb-5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">VAGUES SURVÉCUES</div>
            <div className="font-bold text-slate-200 tabular-nums text-sm">{stats.wave}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">ENNEMIS VAINCUS</div>
            <div className="font-bold text-slate-200 tabular-nums text-sm">{stats.kills}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">DÉGÂTS TOTAUX</div>
            <div className="font-bold text-slate-200 tabular-nums text-sm">{stats.damageDealt.toLocaleString()}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">TEMPS SURVÉCU</div>
            <div className="font-bold text-slate-200 tabular-nums text-sm">{formatTime(stats.timeSurvived)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="whitespace-nowrap">Rejouer (Nouveau Tirage)</span>
          </button>

          <button
            onClick={onHome}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Menu Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

