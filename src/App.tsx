/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameStats } from './game/engine';
import { generateRandomRun, RandomRunConfig } from './game/procedural';
import { GameState, UpgradeCard } from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { UpgradeModal } from './components/UpgradeModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VirtualJoysticks } from './components/VirtualJoysticks';
import { EvolutionHangarModal } from './components/EvolutionHangarModal';
import { progression } from './game/progressionManager';
import { SavedRunState } from './types/progression';
import { sound } from './audio/soundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React state for HUD and UI overlays
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [runConfig, setRunConfig] = useState<RandomRunConfig>(() => generateRandomRun());
  const [hp, setHp] = useState<number>(100);
  const [maxHp, setMaxHp] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [dashPct, setDashPct] = useState<number>(1.0);
  const [overdrivePct, setOverdrivePct] = useState<number>(0);
  const [upgradeCards, setUpgradeCards] = useState<UpgradeCard[]>([]);
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [isHangarOpen, setIsHangarOpen] = useState<boolean>(false);
  const [quantumShards, setQuantumShards] = useState<number>(() => progression.getShards());
  const [shardsEarnedInRun, setShardsEarnedInRun] = useState<number>(0);
  const [savedRun, setSavedRun] = useState<SavedRunState | null>(() => progression.getActiveSavedRun());

  const [showJoysticks, setShowJoysticks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nexus_joysticks');
      if (saved !== null) return saved === 'true';
    } catch {}
    // Enabled by default so users immediately have the dual joysticks
    return true;
  });

  // High score tracking
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexus_high_score');
      return saved ? parseInt(saved, 10) : progression.getProfile().highScore || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (newState) => {
        setGameState(newState);
        // Refresh saved run state whenever state changes
        setSavedRun(progression.getActiveSavedRun());
      },
      onHpChange: (newHp, newMaxHp) => {
        setHp(newHp);
        setMaxHp(newMaxHp);
      },
      onScoreChange: (newScore) => setScore(newScore),
      onWaveChange: (newWave) => {
        setWave(newWave);
        setSavedRun(progression.getActiveSavedRun());
      },
      onDashCooldownChange: (pct) => setDashPct(pct),
      onOverdriveChange: (pct) => setOverdrivePct(pct),
      onUpgradePrompt: (cards) => setUpgradeCards(cards),
      onRunConfigChange: (cfg) => setRunConfig(cfg),
      onShardsChange: (shards) => {
        setShardsEarnedInRun(shards);
        setQuantumShards(progression.getShards());
      },
      onGameOver: (stats) => {
        setLastStats(stats);
        setSavedRun(null);
        setQuantumShards(progression.getShards());
        let newRecord = false;
        try {
          const currentHigh = parseInt(localStorage.getItem('nexus_high_score') || '0', 10);
          if (stats.score > currentHigh) {
            localStorage.setItem('nexus_high_score', String(stats.score));
            setHighScore(stats.score);
            newRecord = true;
          }
        } catch {}
        setIsNewHigh(newRecord);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    setShardsEarnedInRun(0);
    engineRef.current?.startRun();
    setSavedRun(null);
  };

  const handleResumeSavedRun = () => {
    const active = progression.getActiveSavedRun();
    if (active && engineRef.current) {
      engineRef.current.resumeSavedRun(active);
    }
  };

  const handleSaveAndExit = () => {
    if (engineRef.current) {
      engineRef.current.saveCurrentRun();
      engineRef.current.state = 'TITLE_MENU';
      setGameState('TITLE_MENU');
      sound.stopAtmosphereMusic();
      setSavedRun(progression.getActiveSavedRun());
    }
  };

  const handleReroll = () => {
    engineRef.current?.rerollLoadout();
  };

  const handleToggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleResume = () => {
    engineRef.current?.resumeGame();
  };

  const handleSelectUpgrade = (card: UpgradeCard) => {
    engineRef.current?.selectUpgrade(card);
    setSavedRun(progression.getActiveSavedRun());
  };

  const handleTriggerOverdrive = () => {
    engineRef.current?.triggerOverdrive();
  };

  const handleHome = () => {
    if (engineRef.current) {
      engineRef.current.state = 'TITLE_MENU';
      setGameState('TITLE_MENU');
      sound.stopAtmosphereMusic();
      engineRef.current.rerollLoadout();
      setSavedRun(progression.getActiveSavedRun());
    }
  };

  const handlePlayAgain = () => {
    if (engineRef.current) {
      setShardsEarnedInRun(0);
      engineRef.current.rerollLoadout();
      engineRef.current.startRun();
      setSavedRun(null);
    }
  };

  const handleToggleJoysticks = () => {
    setShowJoysticks((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nexus_joysticks', String(next));
      } catch {}
      return next;
    });
  };

  const handleProfileUpdated = () => {
    setQuantumShards(progression.getShards());
    setHighScore(progression.getProfile().highScore);
    setSavedRun(progression.getActiveSavedRun());
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030712] select-none">
      {/* 60fps Isolated Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* Dual Virtual Joysticks (Move on Left, Aim & Shoot on Right) */}
      {(gameState === 'PLAYING') && showJoysticks && (
        <VirtualJoysticks
          onMove={(vec) => engineRef.current?.setVirtualMove(vec)}
          onAim={(vec, isFiring) => engineRef.current?.setVirtualAim(vec, isFiring)}
          onDash={() => engineRef.current?.triggerDash()}
          onOverdrive={handleTriggerOverdrive}
          dashPct={dashPct}
          overdrivePct={overdrivePct}
          weaponColor={runConfig.weapon.color}
        />
      )}

      {/* Title Screen Overlay */}
      {gameState === 'TITLE_MENU' && (
        <TitleScreen
          runConfig={runConfig}
          onStart={handleStartGame}
          onResumeSavedRun={savedRun ? handleResumeSavedRun : undefined}
          savedRun={savedRun}
          onOpenHangar={() => setIsHangarOpen(true)}
          quantumShards={quantumShards}
          onReroll={handleReroll}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active In-Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'UPGRADE_SELECTION') && (
        <GameHUD
          hp={hp}
          maxHp={maxHp}
          score={score}
          wave={wave}
          dashPct={dashPct}
          overdrivePct={overdrivePct}
          shardsEarned={shardsEarnedInRun}
          runConfig={runConfig}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onTriggerOverdrive={handleTriggerOverdrive}
          showJoysticks={showJoysticks}
          onToggleJoysticks={handleToggleJoysticks}
        />
      )}

      {/* Upgrades Choice Modal */}
      {gameState === 'UPGRADE_SELECTION' && (
        <UpgradeModal
          cards={upgradeCards}
          onSelect={handleSelectUpgrade}
          wave={wave}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handlePlayAgain}
          onHome={handleHome}
          onSaveAndExit={handleSaveAndExit}
          onOpenHangar={() => setIsHangarOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAME_OVER' && lastStats && (
        <GameOverModal
          stats={lastStats}
          highScore={highScore}
          isNewHigh={isNewHigh}
          shardsEarned={shardsEarnedInRun}
          totalShards={quantumShards}
          onOpenHangar={() => setIsHangarOpen(true)}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )}

      {/* Persistent Evolution Hangar Modal */}
      {isHangarOpen && (
        <EvolutionHangarModal
          onClose={() => setIsHangarOpen(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
}
