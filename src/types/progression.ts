export interface PlayerEvolution {
  hullLevel: number;        // +12 HP per level (max 5)
  damageLevel: number;      // +5% damage per level (max 5)
  speedLevel: number;       // +4% speed per level (max 5)
  dashLevel: number;        // -6% dash cooldown per level (max 5)
  magnetLevel: number;      // +20px orb pull radius per level (max 5)
  overdriveLevel: number;   // +10 starting overdrive per level (max 5)
  reviveLevel: number;      // 1 emergency revive with 40% HP (max 1)
}

export interface EvolutionUpgradeDef {
  id: keyof PlayerEvolution;
  name: string;
  description: string;
  maxLevel: number;
  costs: number[]; // cost for each level 1..max
  effectSummary: (level: number) => string;
  icon: string;
}

export interface SavedRunState {
  seed: number;
  wave: number;
  score: number;
  hp: number;
  maxHp: number;
  overdrive: number;
  biomeId: string;
  weaponId: string;
  mutatorId: string;
  upgradeIds: string[];
  timeSurvived: number;
  shardsEarnedInRun: number;
  revivesRemaining: number;
  timestamp: number;
}

export interface PersistentProfile {
  version: number;
  quantumShards: number;
  highScore: number;
  highestWave: number;
  totalKills: number;
  totalElitesKilled: number;
  totalRuns: number;
  totalShardsEarned: number;
  evolutions: PlayerEvolution;
  activeSavedRun: SavedRunState | null;
}
