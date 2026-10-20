import { EvolutionUpgradeDef, PersistentProfile, PlayerEvolution, SavedRunState } from '../types/progression';

const STORAGE_KEY = 'nexus_aleatoire_save_profile_v1';

export const EVOLUTION_CATALOG: EvolutionUpgradeDef[] = [
  {
    id: 'hullLevel',
    name: 'Blindage Renforcé',
    description: 'Augmente la coque maximale de base de votre vaisseau.',
    maxLevel: 5,
    costs: [30, 70, 140, 250, 420],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `+${lvl * 12} PV max initiaux`),
    icon: 'shield',
  },
  {
    id: 'damageLevel',
    name: 'Condensateur Plasma',
    description: 'Amplifie de façon permanente les dégâts de tous vos tirs.',
    maxLevel: 5,
    costs: [40, 90, 180, 320, 520],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `+${lvl * 5}% aux dégâts d'armes`),
    icon: 'zap',
  },
  {
    id: 'speedLevel',
    name: 'Propulseurs Vectoriels',
    description: 'Accélère la vitesse de déplacement et la réactivité du vaisseau.',
    maxLevel: 5,
    costs: [25, 60, 120, 220, 380],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `+${lvl * 4}% vitesse de manœuvre`),
    icon: 'wind',
  },
  {
    id: 'dashLevel',
    name: 'Surcadence de Dash',
    description: 'Diminue le temps de recharge du propulseur d\'esquive.',
    maxLevel: 5,
    costs: [35, 80, 160, 280, 460],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `-${lvl * 6}% temps de recharge dash`),
    icon: 'chevrons-right',
  },
  {
    id: 'magnetLevel',
    name: 'Attracteur Magnétique',
    description: 'Élargit le rayon d\'aspiration des orbes d\'énergie et des nanites.',
    maxLevel: 5,
    costs: [20, 50, 100, 180, 300],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `+${lvl * 24} px rayon magnétique`),
    icon: 'magnet',
  },
  {
    id: 'overdriveLevel',
    name: 'Dynamo Quantique',
    description: 'Amorce chaque partie avec une jauge d\'Overdrive déjà préchargée.',
    maxLevel: 5,
    costs: [30, 70, 150, 260, 440],
    effectSummary: (lvl) => (lvl === 0 ? 'Aucun bonus' : `+${lvl * 10}% Overdrive initial`),
    icon: 'battery-charging',
  },
  {
    id: 'reviveLevel',
    name: 'Défibrillateur Quantique',
    description: 'Octroie 1 résurrection d\'urgence automatique à 40% PV en cas de destruction fatale.',
    maxLevel: 1,
    costs: [250],
    effectSummary: (lvl) => (lvl === 0 ? 'Désactivé' : '1 seconde chance par partie (40% PV + bouclier temporaire)'),
    icon: 'heart-pulse',
  },
];

const DEFAULT_EVOLUTIONS: PlayerEvolution = {
  hullLevel: 0,
  damageLevel: 0,
  speedLevel: 0,
  dashLevel: 0,
  magnetLevel: 0,
  overdriveLevel: 0,
  reviveLevel: 0,
};

const DEFAULT_PROFILE: PersistentProfile = {
  version: 1,
  quantumShards: 25, // Starter bonus crystals
  highScore: 0,
  highestWave: 1,
  totalKills: 0,
  totalElitesKilled: 0,
  totalRuns: 0,
  totalShardsEarned: 25,
  evolutions: DEFAULT_EVOLUTIONS,
  activeSavedRun: null,
};

class ProgressionManager {
  private profile: PersistentProfile;

  constructor() {
    this.profile = this.loadProfile();
  }

  private loadProfile(): PersistentProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          evolutions: {
            ...DEFAULT_EVOLUTIONS,
            ...(parsed.evolutions || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Erreur chargement profil persistant, réinitialisation par défaut', e);
    }
    return { ...DEFAULT_PROFILE };
  }

  public saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.error('Impossible de sauvegarder le profil dans localStorage', e);
    }
  }

  public getProfile(): PersistentProfile {
    return this.profile;
  }

  public getShards(): number {
    return this.profile.quantumShards;
  }

  public addShards(amount: number) {
    if (amount <= 0) return;
    this.profile.quantumShards += amount;
    this.profile.totalShardsEarned += amount;
    this.saveProfile();
  }

  public canAffordUpgrade(upgradeId: keyof PlayerEvolution): boolean {
    const def = EVOLUTION_CATALOG.find((u) => u.id === upgradeId);
    if (!def) return false;
    const currentLvl = this.profile.evolutions[upgradeId];
    if (currentLvl >= def.maxLevel) return false;
    const cost = def.costs[currentLvl];
    return this.profile.quantumShards >= cost;
  }

  public purchaseUpgrade(upgradeId: keyof PlayerEvolution): boolean {
    const def = EVOLUTION_CATALOG.find((u) => u.id === upgradeId);
    if (!def) return false;
    const currentLvl = this.profile.evolutions[upgradeId];
    if (currentLvl >= def.maxLevel) return false;

    const cost = def.costs[currentLvl];
    if (this.profile.quantumShards < cost) return false;

    this.profile.quantumShards -= cost;
    this.profile.evolutions[upgradeId] = currentLvl + 1;
    this.saveProfile();
    return true;
  }

  public recordRunCompletion(stats: {
    score: number;
    wave: number;
    kills: number;
    elitesKilled?: number;
    shardsGathered: number;
  }) {
    this.profile.totalRuns += 1;
    this.profile.totalKills += stats.kills;
    this.profile.totalElitesKilled += stats.elitesKilled || 0;
    this.profile.highScore = Math.max(this.profile.highScore, stats.score);
    this.profile.highestWave = Math.max(this.profile.highestWave, stats.wave);
    this.profile.quantumShards += stats.shardsGathered;
    this.profile.totalShardsEarned += stats.shardsGathered;
    // Clear active mid-run saved game
    this.profile.activeSavedRun = null;
    this.saveProfile();
  }

  public saveActiveRun(runState: SavedRunState) {
    this.profile.activeSavedRun = runState;
    this.saveProfile();
  }

  public clearActiveRun() {
    this.profile.activeSavedRun = null;
    this.saveProfile();
  }

  public getActiveSavedRun(): SavedRunState | null {
    return this.profile.activeSavedRun;
  }

  public exportSaveCode(): string {
    const jsonStr = JSON.stringify(this.profile);
    try {
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } catch {
      return jsonStr;
    }
  }

  public importSaveCode(code: string): boolean {
    try {
      let jsonStr = code.trim();
      try {
        jsonStr = decodeURIComponent(escape(atob(jsonStr)));
      } catch {}
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed.quantumShards === 'number' && parsed.evolutions) {
        this.profile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          evolutions: {
            ...DEFAULT_EVOLUTIONS,
            ...(parsed.evolutions || {}),
          },
        };
        this.saveProfile();
        return true;
      }
    } catch (e) {
      console.error('Code de sauvegarde invalide', e);
    }
    return false;
  }

  public resetAllProgress() {
    this.profile = { ...DEFAULT_PROFILE };
    this.saveProfile();
  }
}

export const progression = new ProgressionManager();
