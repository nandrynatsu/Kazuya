import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home, Save, Sparkles } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onSaveAndExit?: () => void;
  onOpenHangar?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onHome,
  onSaveAndExit,
  onOpenHangar,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/85 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
        <h2 className="text-xl font-bold text-white tracking-tight mb-1">Partie Suspendue</h2>
        <p className="text-xs text-slate-400 mb-5 font-mono">Progression sauvegardée en direct</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.3)]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="whitespace-nowrap">Reprendre la Partie</span>
          </button>

          {onSaveAndExit && (
            <button
              onClick={onSaveAndExit}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600/90 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl border border-emerald-400/40 transition-colors cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            >
              <Save className="w-4 h-4" />
              <span className="whitespace-nowrap">Sauvegarder & Quitter</span>
            </button>
          )}

          {onOpenHangar && (
            <button
              onClick={onOpenHangar}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-sky-300 text-sm font-medium rounded-xl border border-sky-500/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="whitespace-nowrap">Hangar d'Évolution</span>
            </button>
          )}

          <button
            onClick={onToggleMute}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="whitespace-nowrap">{isMuted ? 'Activer le Son' : 'Couper le Son'}</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-medium rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="whitespace-nowrap">Nouvelle Partie Aléatoire</span>
          </button>

          <button
            onClick={onHome}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer mt-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Retour au Menu Principal</span>
          </button>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-800 text-[11px] font-mono text-slate-500">
          Double Joysticks à l'écran · Sauvegarde automatique
        </div>
      </div>
    </div>
  );
};

