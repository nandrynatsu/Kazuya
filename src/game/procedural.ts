import { BiomeConfig, Mutator, UpgradeCard, WeaponConfig, WeaponType } from '../types/game';

export const BIOMES: BiomeConfig[] = [
  {
    id: 'cyber_neon',
    name: 'Nébuleuse Cybernétique',
    themeColor: '#06b6d4', // cyan
    secondaryColor: '#3b82f6',
    accentColor: '#22d3ee',
    bgDark: '#030712',
    gridColor: 'rgba(6, 182, 212, 0.08)',
    particleColor: '#38bdf8',
    ambientDescription: 'Grille vectorielle dense sous brouillard d\'ions lumineux',
  },
  {
    id: 'magnetic_core',
    name: 'Noyau Magnétique',
    themeColor: '#f59e0b', // amber
    secondaryColor: '#ef4444',
    accentColor: '#fbbf24',
    bgDark: '#0c0704',
    gridColor: 'rgba(245, 158, 11, 0.08)',
    particleColor: '#f97316',
    ambientDescription: 'Foyers thermiques instables et courants de plasma ionisé',
  },
  {
    id: 'quantum_rift',
    name: 'Faille Quantique',
    themeColor: '#a855f7', // purple
    secondaryColor: '#ec4899',
    accentColor: '#c084fc',
    bgDark: '#080314',
    gridColor: 'rgba(168, 85, 247, 0.08)',
    particleColor: '#e879f9',
    ambientDescription: 'Distorsion spatio-temporelle aux reflets spectraux',
  },
  {
    id: 'emerald_matrix',
    name: 'Biogrid Émeraude',
    themeColor: '#10b981', // emerald
    secondaryColor: '#059669',
    accentColor: '#34d399',
    bgDark: '#02120a',
    gridColor: 'rgba(16, 185, 129, 0.08)',
    particleColor: '#6ee7b7',
    ambientDescription: 'Circuits bioluminescents et spore d\'énergie réactive',
  },
  {
    id: 'abyss_ice',
    name: 'Abîme Boréal',
    themeColor: '#38bdf8', // sky/ice
    secondaryColor: '#6366f1',
    accentColor: '#93c5fd',
    bgDark: '#030a16',
    gridColor: 'rgba(56, 189, 248, 0.08)',
    particleColor: '#bae6fd',
    ambientDescription: 'Vastes cristaux résonnants dans un vide cryogénique',
  },
];

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  plasma_burst: {
    id: 'plasma_burst',
    name: 'Fusil Plasma Stellaire',
    description: 'Cadence de tir soutenue, projectiles précis avec vélocité maximale.',
    fireRate: 5.5,
    damage: 18,
    speed: 680,
    range: 750,
    color: '#00f0ff',
    icon: 'zap',
  },
  homing_missiles: {
    id: 'homing_missiles',
    name: 'Micro-Missiles Guidés',
    description: 'Projectiles autoguidés traquant impitoyablement les menaces les plus proches.',
    fireRate: 3.2,
    damage: 26,
    speed: 460,
    range: 850,
    color: '#f43f5e',
    icon: 'target',
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Arc Voltaïque',
    description: 'Faisceau d\'énergie en chaîne qui se propage entre les cibles groupées.',
    fireRate: 2.8,
    damage: 32,
    speed: 750,
    range: 600,
    color: '#eab308',
    icon: 'activity',
  },
  orbital_disc: {
    id: 'orbital_disc',
    name: 'Orbes Gravitiques',
    description: 'Déploie des sphères en orbite continue qui broient tout ennemi au contact.',
    fireRate: 4.0,
    damage: 22,
    speed: 550,
    range: 700,
    color: '#a855f7',
    icon: 'disc',
  },
  sonic_shotgun: {
    id: 'sonic_shotgun',
    name: 'Canon à Dispersion',
    description: 'Salve de 5 shrapnels à haute vélocité pulvérisant à courte et moyenne portée.',
    fireRate: 2.0,
    damage: 16, // per pellet x 5
    speed: 580,
    range: 520,
    color: '#10b981',
    icon: 'shield',
  },
};

export const MUTATORS: Mutator[] = [
  {
    id: 'hyper_velocity',
    name: 'Surmultiplicateur Stellaire',
    description: '+25% vitesse de déplacement et dash rechargé plus rapidement.',
    icon: 'gauge',
    statModifier: { playerSpeed: 1.25, cooldownReduction: 0.2 },
  },
  {
    id: 'critical_core',
    name: 'Focalisateur Surchargé',
    description: '+35% dégâts d\'armes, recul de propulsion amplifié.',
    icon: 'crosshair',
    statModifier: { playerDamage: 1.35 },
  },
  {
    id: 'kinetic_armor',
    name: 'Blindage Polymère',
    description: '+30 PV maximum et régénération passive de bouclier.',
    icon: 'shield',
    statModifier: { playerHpMax: 30 },
  },
  {
    id: 'swarm_surge',
    name: 'Frénésie de l\'Essaim',
    description: 'Ennemis +15% plus rapides mais score et butin doublés.',
    icon: 'flame',
    statModifier: { enemySpeed: 1.15 },
  },
  {
    id: 'energy_conduit',
    name: 'Vortex Magnétique',
    description: 'Attraction des nanites d\'énergie augmentée de 100%.',
    icon: 'magnet',
    statModifier: { cooldownReduction: 0.1 },
  },
];

export const UPGRADE_POOL: UpgradeCard[] = [
  {
    id: 'dmg_boost',
    title: 'Amplificateur Phasique',
    description: 'Augmente tous les dégâts de vos armes de +25%.',
    rarity: 'commun',
    icon: 'zap',
    apply: (g) => {
      g.playerDamageMultiplier *= 1.25;
    },
  },
  {
    id: 'speed_boost',
    title: 'Propulseurs Vecteurs',
    description: 'Vitesse de déplacement augmentée de +20%.',
    rarity: 'commun',
    icon: 'wind',
    apply: (g) => {
      g.playerSpeedMultiplier *= 1.2;
    },
  },
  {
    id: 'pierce_boost',
    title: 'Pointes Cryo-Perforantes',
    description: 'Tous vos projectiles traversent 1 ennemi supplémentaire.',
    rarity: 'rare',
    icon: 'chevrons-right',
    apply: (g) => {
      g.projectilePierce += 1;
    },
  },
  {
    id: 'fire_rate',
    title: 'Refroidisseur Cryo-Cycle',
    description: 'Cadence de tir de votre arme principale accrue de +30%.',
    rarity: 'rare',
    icon: 'flame',
    apply: (g) => {
      g.fireRateMultiplier *= 1.3;
    },
  },
  {
    id: 'orbital_companion',
    title: 'Drone Sentinelle d\'Appui',
    description: 'Invoque un drone autonome qui tire en continu sur les cibles proches.',
    rarity: 'rare',
    icon: 'circle-dot',
    apply: (g) => {
      g.droneCount += 1;
    },
  },
  {
    id: 'explosive_kills',
    title: 'Nanites Détonantes',
    description: 'Les ennemis abattus explosent en provoquant une onde de choc de zone.',
    rarity: 'légendaire',
    icon: 'sparkles',
    apply: (g) => {
      g.hasExplosiveKills = true;
    },
  },
  {
    id: 'vampiric_shield',
    title: 'Drain Biologique',
    description: '10% de chance d\'absorber 6 PV à chaque élimination d\'adversaire.',
    rarity: 'rare',
    icon: 'heart-pulse',
    apply: (g) => {
      g.vampirismChance += 0.1;
    },
  },
  {
    id: 'overdrive_efficiency',
    title: 'Catalyseur Quantique',
    description: 'La jauge d\'Overdrive suprême se charge 50% plus vite.',
    rarity: 'rare',
    icon: 'battery-charging',
    apply: (g) => {
      g.overdriveGainMultiplier *= 1.5;
    },
  },
  {
    id: 'kinetic_blast_dash',
    title: 'Dash Nova Ondulatoire',
    description: 'Votre dash libère une onde de choc infligeant 50 dégâts et repoussant les monstres.',
    rarity: 'légendaire',
    icon: 'radio',
    apply: (g) => {
      g.dashHasNova = true;
    },
  },
  {
    id: 'twin_shot',
    title: 'Faisceau Double',
    description: 'Tire un projectile jumeau supplémentaire à chaque salve.',
    rarity: 'légendaire',
    icon: 'copy',
    apply: (g) => {
      g.extraProjectiles += 1;
    },
  },
];

export interface RandomRunConfig {
  seed: number;
  biome: BiomeConfig;
  weapon: WeaponConfig;
  mutator: Mutator;
}

export function generateRandomRun(forcedSeed?: number): RandomRunConfig {
  const seed = forcedSeed !== undefined ? forcedSeed : Math.floor(Math.random() * 999999);
  
  // Deterministic or pseudo-random pick based on seed
  const biomeIdx = Math.abs(seed) % BIOMES.length;
  const weaponKeys = Object.keys(WEAPONS) as WeaponType[];
  const weaponIdx = Math.abs(seed >> 2) % weaponKeys.length;
  const mutatorIdx = Math.abs(seed >> 4) % MUTATORS.length;

  return {
    seed,
    biome: BIOMES[biomeIdx],
    weapon: WEAPONS[weaponKeys[weaponIdx]],
    mutator: MUTATORS[mutatorIdx],
  };
}

export function getRandomUpgradeChoices(count: number = 3, existingUpgrades: string[] = []): UpgradeCard[] {
  const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
