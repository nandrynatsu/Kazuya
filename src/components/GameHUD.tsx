import React from 'react';
import { Volume2, VolumeX, Pause, Zap, Flame, Shield, Sparkles, Gamepad2, CheckCircle2 } from 'lucide-react';
import { RandomRunConfig } from '../game/procedural';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  dashPct: number;
  overdrivePct: number;
  shardsEarned?: number;
  runConfig: RandomRunConfig;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerOverdrive: () => void;
  showJoysticks: boolean;
  onToggleJoysticks: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  score,
  wave,
  dashPct,
  overdrivePct,
  shardsEarned = 0,
  runConfig,
  isMuted,
  onToggleMute,
  onPause,
  onTriggerOverdrive,
  showJoysticks,
  onToggleJoysticks,
}) => {
  const hpPct = Math.max(0, Math.min(1, hp / maxHp));
  const isOverdriveReady = overdrivePct >= 99;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4 sm:p-7 flex flex-col justify-between select-none">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Health & Hull Status + Quantum Shards */}
        <div className="flex flex-col gap-1.5 min-w-[150px] sm:min-w-[210px]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">COQUE</span>
            <span className="text-white font-bold tabular-nums">
              {Math.round(hp)} / {maxHp}
            </span>
          </div>
          {/* Segmented/smooth health bar */}
          <div className="w-full h-2.5 bg-slate-900/90 border border-slate-700/60 rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                hpPct > 0.5
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : hpPct > 0.25
                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]'
              }`}
              style={{ width: `${hpPct * 100}%` }}
            />
          </div>

          {/* Shards Currency in Run & Autosave active badge */}
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-sky-500/30 text-sky-300 font-mono text-[11px]">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span className="font-bold tabular-nums">+{shardsEarned}</span>
              <span className="text-[9px] text-slate-500 hidden sm:inline">CRISTAUX</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>SAUVEGARDÉ</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Wave & Score Cluster */}
        <div className="flex flex-col items-center text-center">
          <div className="text-[11px] font-mono tracking-widest text-slate-400">
            VAGUE <span className="text-sky-400 font-bold tabular-nums text-sm ml-1">{wave}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums drop-shadow-md">
            {score.toLocaleString()}
          </div>
        </div>

        {/* Top-Right: Quick Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleJoysticks}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
              showJoysticks
                ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Activer/Désactiver les deux Joysticks virtuels (Déplacement & Tir)"
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden md:inline">JOYSTICKS</span>
          </button>
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Couper le son (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <button
            onClick={onPause}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Pause & Sauvegarder (Échap)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>


      {/* Bottom Perimeter Cluster (Elevated above joysticks when active) */}
      <div className={`flex items-end justify-between w-full ${showJoysticks ? 'mb-44' : ''}`}>
        {/* Bottom-Left: Weapon & Biome readout */}
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-lg px-3 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: runConfig.weapon.color }} />
            <span className="font-semibold text-slate-200">{runConfig.weapon.name}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 pl-1">
            {runConfig.biome.name} · {runConfig.mutator.name}
          </div>
        </div>

        {/* Bottom-Right: Dash & Overdrive Status (when joysticks are hidden) */}
        {!showJoysticks && (
          <div className="flex items-center gap-3 pointer-events-auto">
          {/* Dash Cooldown Indicator */}
          <div className="flex flex-col items-center">
            <div className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-800">
              <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="88"
                  strokeDashoffset={88 * (1 - dashPct)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-slate-300">DASH</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 mt-0.5">ESPACE</span>
          </div>

          {/* Overdrive Super Button */}
          <button
            onClick={onTriggerOverdrive}
            disabled={!isOverdriveReady}
            className={`relative flex flex-col items-center justify-center px-4 py-2 rounded-xl border transition-all cursor-pointer ${
              isOverdriveReady
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse active:scale-95'
                : 'bg-slate-900/90 text-slate-500 border-slate-800 cursor-not-allowed opacity-80'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wider">
              <Zap className="w-4 h-4 fill-current" />
              <span>OVERDRIVE</span>
            </div>
            <div className="text-[10px] font-mono tabular-nums mt-0.5 font-bold">
              {isOverdriveReady ? 'PRÊT (TOUCHE E)' : `${Math.floor(overdrivePct)}%`}
            </div>
          </button>
        </div>
      )}
      </div>
    </div>
  );
};
