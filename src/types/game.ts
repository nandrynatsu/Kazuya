export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'UPGRADE_SELECTION' | 'GAME_OVER' | 'VICTORY';

export type WeaponType = 'plasma_burst' | 'homing_missiles' | 'chain_lightning' | 'orbital_disc' | 'sonic_shotgun';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  description: string;
  fireRate: number; // shots per sec
  damage: number;
  speed: number;
  range: number;
  color: string;
  icon: string;
}

export interface BiomeConfig {
  id: string;
  name: string;
  themeColor: string;
  secondaryColor: string;
  accentColor: string;
  bgDark: string;
  gridColor: string;
  particleColor: string;
  ambientDescription: string;
}

export interface Mutator {
  id: string;
  name: string;
  description: string;
  icon: string;
  statModifier: {
    playerSpeed?: number;
    playerDamage?: number;
    playerHpMax?: number;
    enemySpeed?: number;
    enemyHp?: number;
    cooldownReduction?: number;
  };
}

export interface UpgradeCard {
  id: string;
  title: string;
  description: string;
  rarity: 'commun' | 'rare' | 'légendaire';
  icon: string;
  apply: (game: any) => void;
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
}

export type EnemyType = 
  | 'chaser' 
  | 'sniper' 
  | 'bomber' 
  | 'boss'
  | 'elite_phantom'
  | 'elite_tesla'
  | 'elite_juggernaut';

export interface Enemy extends Entity {
  type: EnemyType;
  speed: number;
  damage: number;
  scoreValue: number;
  isElite?: boolean;
  eliteTitle?: string;
  eliteAbilityTimer?: number;
  eliteAbilityCooldown?: number;
  eliteAbilityState?: 'idle' | 'charging' | 'active';
  eliteTargetX?: number;
  eliteTargetY?: number;
  eliteShieldAngle?: number;
  eliteShieldActive?: boolean;
  // Telegraphs
  telegraphTimer: number;
  isTelegraphing: boolean;
  telegraphDuration: number;
  shootCooldown: number;
  aimAngle?: number;
  pulsePhase: number;
  hitFlashTimer: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  isPlayer: boolean;
  lifetime: number;
  maxLifetime: number;
  pierce: number;
  homingTarget?: Enemy | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  isGlow?: boolean;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  isCritical?: boolean;
}

export interface EnergyOrb {
  id: number;
  x: number;
  y: number;
  value: number;
  color: string;
  vx: number;
  vy: number;
  pulse: number;
}
