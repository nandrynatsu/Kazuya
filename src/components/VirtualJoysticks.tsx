import React, { useRef, useState, useCallback } from 'react';
import { Zap, Wind } from 'lucide-react';

interface VirtualJoysticksProps {
  onMove: (vector: { x: number; y: number } | null) => void;
  onAim: (vector: { x: number; y: number } | null, isFiring: boolean) => void;
  onDash: () => void;
  onOverdrive: () => void;
  dashPct: number;
  overdrivePct: number;
  weaponColor: string;
}

export const VirtualJoysticks: React.FC<VirtualJoysticksProps> = ({
  onMove,
  onAim,
  onDash,
  onOverdrive,
  dashPct,
  overdrivePct,
  weaponColor,
}) => {
  const maxRadius = 52; // Max displacement of joystick knob in pixels

  // Left Joystick (Movement) state
  const leftBaseRef = useRef<HTMLDivElement | null>(null);
  const leftPointerId = useRef<number | null>(null);
  const [leftKnob, setLeftKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [leftActive, setLeftActive] = useState<boolean>(false);

  // Right Joystick (Aim & Shoot) state
  const rightBaseRef = useRef<HTMLDivElement | null>(null);
  const rightPointerId = useRef<number | null>(null);
  const [rightKnob, setRightKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rightActive, setRightActive] = useState<boolean>(false);

  // Left Joystick Handlers
  const handleLeftDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (leftPointerId.current !== null) return;
    leftPointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setLeftActive(true);

    if (leftBaseRef.current) {
      const rect = leftBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxRadius);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      setLeftKnob({ x: kx, y: ky });
      onMove({ x: kx / maxRadius, y: ky / maxRadius });
    }
  }, [maxRadius, onMove]);

  const handleLeftMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId || !leftBaseRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = leftBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setLeftKnob({ x: kx, y: ky });
    onMove({ x: kx / maxRadius, y: ky / maxRadius });
  }, [maxRadius, onMove]);

  const handleLeftUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (leftPointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    leftPointerId.current = null;
    setLeftActive(false);
    setLeftKnob({ x: 0, y: 0 });
    onMove(null);
  }, [onMove]);

  // Right Joystick Handlers (Aim & Shoot)
  const handleRightDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (rightPointerId.current !== null) return;
    rightPointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setRightActive(true);

    if (rightBaseRef.current) {
      const rect = rightBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxRadius);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;
      setRightKnob({ x: kx, y: ky });
      const isFiring = dist > 6; // deadzone
      onAim({ x: kx / maxRadius, y: ky / maxRadius }, isFiring);
    }
  }, [maxRadius, onAim]);

  const handleRightMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (rightPointerId.current !== e.pointerId || !rightBaseRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = rightBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setRightKnob({ x: kx, y: ky });
    const isFiring = dist > 6;
    onAim({ x: kx / maxRadius, y: ky / maxRadius }, isFiring);
  }, [maxRadius, onAim]);

  const handleRightUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (rightPointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    rightPointerId.current = null;
    setRightActive(false);
    setRightKnob({ x: 0, y: 0 });
    onAim(null, false);
  }, [onAim]);

  const isOverdriveReady = overdrivePct >= 99;
  const isDashReady = dashPct >= 0.98;

  return (
    <div className="absolute inset-0 z-15 pointer-events-none select-none overflow-hidden touch-none">
      {/* LEFT JOYSTICK: DEPLACEMENT */}
      <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-12 flex flex-col items-center">
        <div
          ref={leftBaseRef}
          onPointerDown={handleLeftDown}
          onPointerMove={handleLeftMove}
          onPointerUp={handleLeftUp}
          onPointerCancel={handleLeftUp}
          className={`relative w-32 h-32 rounded-full border-2 transition-colors cursor-pointer pointer-events-auto flex items-center justify-center ${
            leftActive
              ? 'border-sky-400 bg-sky-950/40 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              : 'border-slate-700/60 bg-slate-900/60 backdrop-blur-none'
          }`}
        >
          {/* Outer radar ticks */}
          <div className="absolute w-full h-[1px] bg-slate-700/40" />
          <div className="absolute h-full w-[1px] bg-slate-700/40" />
          <div className="absolute w-20 h-20 rounded-full border border-slate-700/30" />

          {/* Draggable Knob */}
          <div
            className={`w-13 h-13 rounded-full transition-transform duration-75 flex items-center justify-center border shadow-lg ${
              leftActive
                ? 'bg-sky-400 border-white text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.8)] scale-105'
                : 'bg-slate-800 border-slate-600 text-slate-400'
            }`}
            style={{
              transform: `translate(${leftKnob.x}px, ${leftKnob.y}px)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-slate-950/40" />
          </div>
        </div>

        <span className="text-[10px] font-mono tracking-widest text-slate-400 mt-2 font-bold uppercase">
          Déplacement
        </span>
      </div>

      {/* RIGHT ZONE: ACTION BUTTONS & RIGHT JOYSTICK */}
      <div className="absolute bottom-6 sm:bottom-10 right-6 sm:right-12 flex flex-col items-center">
        {/* Quick Action Triggers (Dash & Overdrive) mounted above right joystick */}
        <div className="flex items-center gap-3 mb-3 pointer-events-auto">
          {/* Quick Dash Trigger */}
          <button
            onClick={onDash}
            disabled={!isDashReady}
            className={`relative w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
              isDashReady
                ? 'bg-sky-500/90 border-sky-300 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)] active:scale-95'
                : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title="Dash (Espace)"
          >
            <Wind className="w-5 h-5" />
            {/* Radial cooldown ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="132"
                strokeDashoffset={132 * (1 - dashPct)}
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Quick Overdrive Trigger */}
          <button
            onClick={onOverdrive}
            disabled={!isOverdriveReady}
            className={`relative w-12 h-12 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
              isOverdriveReady
                ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.7)] animate-pulse active:scale-95'
                : 'bg-slate-900/80 border-slate-800 text-slate-500 cursor-not-allowed opacity-70'
            }`}
            title="Overdrive Super (E)"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span className="absolute -bottom-1 text-[8px] font-mono font-bold">
              {isOverdriveReady ? 'PRÊT' : `${Math.floor(overdrivePct)}%`}
            </span>
          </button>
        </div>

        {/* RIGHT JOYSTICK: VISEE & TIR */}
        <div
          ref={rightBaseRef}
          onPointerDown={handleRightDown}
          onPointerMove={handleRightMove}
          onPointerUp={handleRightUp}
          onPointerCancel={handleRightUp}
          className={`relative w-32 h-32 rounded-full border-2 transition-colors cursor-pointer pointer-events-auto flex items-center justify-center ${
            rightActive
              ? 'border-rose-400 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
              : 'border-slate-700/60 bg-slate-900/60 backdrop-blur-none'
          }`}
        >
          {/* Outer radar ticks */}
          <div className="absolute w-full h-[1px] bg-slate-700/40" />
          <div className="absolute h-full w-[1px] bg-slate-700/40" />
          <div className="absolute w-20 h-20 rounded-full border border-slate-700/30" />

          {/* Directional Laser Pointer indicator when dragging */}
          {rightActive && (
            <div
              className="absolute w-12 h-0.5 bg-rose-400 origin-left shadow-[0_0_8px_#f43f5e]"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${Math.atan2(rightKnob.y, rightKnob.x)}rad)`,
              }}
            />
          )}

          {/* Draggable Knob */}
          <div
            className={`w-13 h-13 rounded-full transition-transform duration-75 flex items-center justify-center border shadow-lg ${
              rightActive
                ? 'bg-rose-500 border-white text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.8)] scale-105'
                : 'bg-slate-800 border-slate-600 text-slate-400'
            }`}
            style={{
              transform: `translate(${rightKnob.x}px, ${rightKnob.y}px)`,
              borderColor: rightActive ? '#ffffff' : weaponColor,
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: rightActive ? '#ffffff' : weaponColor }}
            />
          </div>
        </div>

        <span className="text-[10px] font-mono tracking-widest text-slate-400 mt-2 font-bold uppercase">
          Visée & Tir
        </span>
      </div>
    </div>
  );
};
