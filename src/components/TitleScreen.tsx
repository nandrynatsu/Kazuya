import React from 'react';
import { Volume2, VolumeX, Shuffle, Play, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import { RandomRunConfig } from '../game/procedural';
import { SavedRunState } from '../types/progression';

interface TitleScreenProps {
  runConfig: RandomRunConfig;
  onStart: () => void;
  onResumeSavedRun?: () => void;
  savedRun?: SavedRunState | null;
  onOpenHangar: () => void;
  quantumShards: number;
  onReroll: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  runConfig,
  onStart,
  onResumeSavedRun,
  savedRun,
  onOpenHangar,
  quantumShards,
  onReroll,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none select-none overflow-y-auto">
      {/* Top Bar: High score, Quantum Shards, Hangar Button & audio toggle */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-mono tracking-wider hidden sm:block">
            MEILLEUR SCORE <span className="text-white font-bold tabular-nums ml-1.5">{highScore.toLocaleString()}</span>
          </div>

          {/* Shards Currency Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/30 text-sky-300 font-mono text-xs shadow-[0_0_15px_rgba(56,189,248,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold tabular-nums">{quantumShards.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 hidden md:inline">CRISTAUX</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Evolution Hangar CTA button */}
          <button
            onClick={onOpenHangar}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono text-xs font-bold border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Ouvrir le Hangar d'Évolutions persistantes"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>HANGAR ÉVOLUTION</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl border border-slate-700/60 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
            title="Activer/Désactiver le son (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline font-mono">{isMuted ? 'MUTE' : 'SON'}</span>
          </button>
        </div>
      </div>

      {/* Center Zone: Bespoke Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl mx-auto py-4">
        {/* Bespoke inline SVG title lockup */}
        <div className="mb-3">
          <svg
            className="w-72 sm:w-96 h-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.35)]"
            viewBox="0 0 400 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <text
              x="200"
              y="38"
              textAnchor="middle"
              fill="url(#titleGrad)"
              className="font-black tracking-widest text-3xl sm:text-4xl"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }}
            >
              NEXUS ALÉATOIRE
            </text>
            <text
              x="200"
              y="58"
              textAnchor="middle"
              fill="#94a3b8"
              className="text-[10px] tracking-widest font-mono"
              style={{ letterSpacing: '0.35em' }}
            >
              ROGUE ARENA · DOUBLE JOYSTICK & ÉVOLUTIONS
            </text>
          </svg>
        </div>

        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
          Arène rogue-lite procédurale avec double joystick (déplacement & visée/tir), arbres d'évolution permanents et sauvegarde automatique.
        </p>

        {/* Resume Saved Run Banner if any */}
        {savedRun && onResumeSavedRun && (
          <div className="pointer-events-auto w-full max-w-md bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 mb-4 text-left shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300 font-mono">PARTIE SAUVEGARDÉE DÉTECTÉE</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Vague {savedRun.wave} · {savedRun.score.toLocaleString()} pts
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Vous avez une partie suspendue à la Vague {savedRun.wave}. Vous pouvez la continuer sans perdre votre avancée !
            </p>
            <button
              onClick={onResumeSavedRun}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REPRENDRE LA PARTIE (VAGUE {savedRun.wave})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Procedural Seed & Loadout Card */}
        <div className="pointer-events-auto w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs">
            <span className="text-slate-400 font-mono">TIRAGE ALÉATOIRE #{runConfig.seed}</span>
            <button
              onClick={onReroll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Nouveau tirage</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <div className="text-[10px] text-slate-500 font-mono mb-0.5">BIOME</div>
              <div className="text-xs font-semibold text-slate-200 truncate">{runConfig.biome.name}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <div className="text-[10px] text-slate-500 font-mono mb-0.5">ARME</div>
              <div className="text-xs font-semibold text-slate-200 truncate">{runConfig.weapon.name}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50">
              <div className="text-[10px] text-slate-500 font-mono mb-0.5">MUTATEUR</div>
              <div className="text-xs font-semibold text-slate-200 truncate">{runConfig.mutator.name}</div>
            </div>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pointer-events-auto flex flex-col items-center gap-2">
          <button
            onClick={onStart}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold text-base rounded-2xl transition-all shadow-[0_0_30px_rgba(14,165,233,0.35)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{savedRun ? 'Nouvelle Partie Aléatoire' : 'Lancer la Partie'}</span>
          </button>
          <span className="text-xs text-slate-500 font-mono">Commandes : Double Joysticks virtuels à l'écran ou Clavier + Souris</span>
        </div>
      </div>

      {/* Flat Control-Hint Line */}
      <div className="text-center text-xs text-slate-500 font-mono py-2">
        <span>Joystick Gauche / WASD Déplacement</span>
        <span className="mx-2 text-slate-700">·</span>
        <span>Joystick Droit / Clic Visée & Tir</span>
        <span className="mx-2 text-slate-700">·</span>
        <span>Bouton Dash / Espace</span>
        <span className="mx-2 text-slate-700">·</span>
        <span>Bouton Overdrive / E</span>
      </div>
    </div>
  );
};

