import { sound } from '../audio/soundManager';
import { BiomeConfig, Enemy, EnemyType, EnergyOrb, FloatingText, GameState, Particle, Projectile, UpgradeCard, WeaponConfig } from '../types/game';
import { BIOMES, generateRandomRun, getRandomUpgradeChoices, MUTATORS, RandomRunConfig, UPGRADE_POOL, WEAPONS } from './procedural';
import { progression } from './progressionManager';
import { SavedRunState } from '../types/progression';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onHpChange: (hp: number, maxHp: number) => void;
  onScoreChange: (score: number) => void;
  onWaveChange: (wave: number) => void;
  onDashCooldownChange: (pct: number) => void;
  onOverdriveChange: (pct: number) => void;
  onUpgradePrompt: (cards: UpgradeCard[]) => void;
  onGameOver: (stats: GameStats) => void;
  onRunConfigChange: (config: RandomRunConfig) => void;
  onShardsChange?: (shards: number) => void;
}

export interface GameStats {
  score: number;
  wave: number;
  kills: number;
  damageDealt: number;
  timeSurvived: number;
  seed: number;
  biomeName: string;
  weaponName: string;
  mutatorName: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private callbacks: GameEngineCallbacks;

  // Run config
  public runConfig: RandomRunConfig;
  public state: GameState = 'TITLE_MENU';

  // Player state
  public player = {
    x: 0,
    y: 0,
    radius: 16,
    vx: 0,
    vy: 0,
    speed: 280,
    hp: 100,
    maxHp: 100,
    invincibleTimer: 0,
    dashTimer: 0,
    dashDuration: 0.18,
    dashCooldown: 0,
    dashMaxCooldown: 1.4,
    dashVx: 0,
    dashVy: 0,
    isDashing: false,
    squashX: 1,
    squashY: 1,
    rotation: 0,
    overdrive: 0, // 0 to 100
    hitFlashTimer: 0,
  };

  // Upgrades and modifiers
  public playerSpeedMultiplier: number = 1.0;
  public playerDamageMultiplier: number = 1.0;
  public fireRateMultiplier: number = 1.0;
  public projectilePierce: number = 1;
  public droneCount: number = 0;
  public hasExplosiveKills: boolean = false;
  public vampirismChance: number = 0;
  public overdriveGainMultiplier: number = 1.0;
  public dashHasNova: boolean = false;
  public extraProjectiles: number = 0;
  public activeUpgrades: UpgradeCard[] = [];
  public shardsEarnedInRun: number = 0;
  public revivesRemaining: number = 0;
  public magnetRadius: number = 140;

  // Entities
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private energyOrbs: EnergyOrb[] = [];
  private floatingTexts: FloatingText[] = [];
  private ambientMotes: Particle[] = [];

  // Wave & Encounter state
  public score: number = 0;
  public wave: number = 1;
  private kills: number = 0;
  private damageDealtTotal: number = 0;
  private timeSurvived: number = 0;
  private waveEnemiesRemaining: number = 14;
  private waveEnemiesSpawned: number = 0;
  private waveTotalEnemies: number = 14;
  private spawnTimer: number = 0;
  private shootCooldownTimer: number = 0;

  // Game feel systems
  private cameraShakeTrauma: number = 0;
  private hitstopTimer: number = 0; // brief 40-80ms pause
  private titleCamTime: number = 0;

  // Input states
  private heldKeys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;
  private inputBuffer: { action: string; time: number }[] = [];
  private nextEntityId: number = 1;

  // Virtual dual-joystick inputs
  private virtualMove: { x: number; y: number } | null = null;
  private virtualAim: { x: number; y: number } | null = null;
  private isVirtualFiring: boolean = false;

  public setVirtualMove(vector: { x: number; y: number } | null) {
    this.virtualMove = vector;
  }

  public setVirtualAim(vector: { x: number; y: number } | null, isFiring: boolean) {
    this.virtualAim = vector;
    this.isVirtualFiring = isFiring;
    if (vector && (vector.x !== 0 || vector.y !== 0)) {
      this.player.rotation = Math.atan2(vector.y, vector.x);
    }
  }

  public triggerDash() {
    this.queueAction('dash');
  }

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.runConfig = generateRandomRun();
    this.callbacks.onRunConfigChange(this.runConfig);

    this.resize();
    this.initMotes();
    this.setupListeners();
    this.startLoop();
  }

  public resize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    if (this.state === 'TITLE_MENU') {
      this.player.x = rect.width / 2;
      this.player.y = rect.height / 2;
    }
  }

  private initMotes() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.ambientMotes = [];
    for (let i = 0; i < 45; i++) {
      this.ambientMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        radius: Math.random() * 2 + 1,
        color: this.runConfig.biome.particleColor,
        alpha: Math.random() * 0.4 + 0.1,
        decay: 0,
      });
    }
  }

  private setupListeners() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      // Prevent browser default scroll for space and arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      this.heldKeys.add(e.code);
      this.heldKeys.add(e.key.toLowerCase());

      // Edge-triggered actions
      if (e.code === 'Space' || e.code === 'KeyZ') {
        this.queueAction('dash');
      }

      if (e.code === 'KeyE' || e.code === 'KeyQ') {
        this.triggerOverdrive();
      }

      if (e.code === 'Escape') {
        this.togglePause();
      }

      if (e.code === 'KeyM') {
        sound.toggleMute();
      }

      // Title screen quick start
      if (this.state === 'TITLE_MENU' && (e.code === 'Enter' || e.code === 'Space')) {
        this.startRun();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.code);
      this.heldKeys.delete(e.key.toLowerCase());
    });

    window.addEventListener('blur', () => {
      this.heldKeys.clear();
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.queueAction('dash');
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support for mobile / touch devices
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        this.isMouseDown = true;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isMouseDown = false;
    });
  }

  public rerollLoadout(forcedSeed?: number) {
    this.runConfig = generateRandomRun(forcedSeed);
    this.callbacks.onRunConfigChange(this.runConfig);
    this.initMotes();
    sound.playHit();
  }

  public startRun() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.state = 'PLAYING';
    this.callbacks.onStateChange(this.state);

    // Read persistent evolutions from progressionManager
    const evo = progression.getProfile().evolutions;
    const mut = this.runConfig.mutator;

    // Apply baseline HP + Evolution Hull Bonus (+12 per rank)
    const baseHp = 100 + (mut.statModifier.playerHpMax || 0) + (evo.hullLevel * 12);
    this.player.maxHp = baseHp;
    this.player.hp = baseHp;
    this.player.x = width / 2;
    this.player.y = height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dashCooldown = 0;
    // Overdrive starting bonus (+10% per rank)
    this.player.overdrive = Math.min(100, 15 + (evo.overdriveLevel * 10));
    this.player.isDashing = false;

    // Movement & Damage multipliers with Evolution bonuses
    this.playerSpeedMultiplier = (mut.statModifier.playerSpeed || 1.0) * (1 + evo.speedLevel * 0.04);
    this.playerDamageMultiplier = (mut.statModifier.playerDamage || 1.0) * (1 + evo.damageLevel * 0.05);
    this.magnetRadius = 140 + (evo.magnetLevel * 24);
    this.revivesRemaining = evo.reviveLevel;

    this.fireRateMultiplier = 1.0;
    this.projectilePierce = 1;
    this.droneCount = 0;
    this.hasExplosiveKills = false;
    this.vampirismChance = 0;
    this.overdriveGainMultiplier = 1.0;
    this.dashHasNova = false;
    this.extraProjectiles = 0;
    this.activeUpgrades = [];
    this.shardsEarnedInRun = 0;

    // Reset combat state
    this.score = 0;
    this.wave = 1;
    this.kills = 0;
    this.damageDealtTotal = 0;
    this.timeSurvived = 0;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.energyOrbs = [];
    this.floatingTexts = [];
    this.startWave(1);

    sound.startAtmosphereMusic();
    sound.playWaveStart();

    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onWaveChange(this.wave);
    this.callbacks.onOverdriveChange(this.player.overdrive);
    this.callbacks.onDashCooldownChange(1.0);
    this.callbacks.onShardsChange?.(this.shardsEarnedInRun);
  }

  public resumeSavedRun(saved: SavedRunState) {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // Restore run configuration
    const foundBiome = BIOMES.find((b) => b.id === saved.biomeId) || BIOMES[0];
    const foundWeapon = WEAPONS[saved.weaponId as keyof typeof WEAPONS] || WEAPONS.plasma_burst;
    const foundMutator = MUTATORS.find((m) => m.id === saved.mutatorId) || MUTATORS[0];

    this.runConfig = {
      seed: saved.seed,
      biome: foundBiome,
      weapon: foundWeapon,
      mutator: foundMutator,
    };
    this.callbacks.onRunConfigChange(this.runConfig);
    this.initMotes();

    // Read evolutions
    const evo = progression.getProfile().evolutions;
    this.state = 'PLAYING';
    this.callbacks.onStateChange(this.state);

    this.player.maxHp = saved.maxHp;
    this.player.hp = saved.hp;
    this.player.x = width / 2;
    this.player.y = height / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dashCooldown = 0;
    this.player.overdrive = saved.overdrive;
    this.player.isDashing = false;

    this.playerSpeedMultiplier = (foundMutator.statModifier.playerSpeed || 1.0) * (1 + evo.speedLevel * 0.04);
    this.playerDamageMultiplier = (foundMutator.statModifier.playerDamage || 1.0) * (1 + evo.damageLevel * 0.05);
    this.magnetRadius = 140 + (evo.magnetLevel * 24);
    this.revivesRemaining = saved.revivesRemaining;

    this.fireRateMultiplier = 1.0;
    this.projectilePierce = 1;
    this.droneCount = 0;
    this.hasExplosiveKills = false;
    this.vampirismChance = 0;
    this.overdriveGainMultiplier = 1.0;
    this.dashHasNova = false;
    this.extraProjectiles = 0;
    this.activeUpgrades = [];

    // Reapply saved upgrade cards
    saved.upgradeIds.forEach((uid) => {
      const card = UPGRADE_POOL.find((c) => c.id === uid);
      if (card) {
        this.activeUpgrades.push(card);
        card.apply(this);
      }
    });

    this.score = saved.score;
    this.wave = saved.wave;
    this.kills = 0;
    this.damageDealtTotal = 0;
    this.timeSurvived = saved.timeSurvived;
    this.shardsEarnedInRun = saved.shardsEarnedInRun;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.energyOrbs = [];
    this.floatingTexts = [];

    this.startWave(this.wave);
    sound.startAtmosphereMusic();
    sound.playWaveStart();

    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onWaveChange(this.wave);
    this.callbacks.onOverdriveChange(this.player.overdrive);
    this.callbacks.onDashCooldownChange(1.0);
    this.callbacks.onShardsChange?.(this.shardsEarnedInRun);

    this.addFloatingText(width / 2, height / 2 - 40, `PARTIE RESTAURÉE · VAGUE ${this.wave}`, '#38bdf8', true);
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.callbacks.onStateChange(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.callbacks.onStateChange(this.state);
      this.lastTime = performance.now();
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.callbacks.onStateChange(this.state);
      this.lastTime = performance.now();
    }
  }

  public saveCurrentRun() {
    if (this.state === 'GAME_OVER') return;
    progression.saveActiveRun({
      seed: this.runConfig.seed,
      wave: this.wave,
      score: this.score,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      overdrive: this.player.overdrive,
      biomeId: this.runConfig.biome.id,
      weaponId: this.runConfig.weapon.id,
      mutatorId: this.runConfig.mutator.id,
      upgradeIds: this.activeUpgrades.map((u) => u.id),
      timeSurvived: Math.round(this.timeSurvived),
      shardsEarnedInRun: this.shardsEarnedInRun,
      revivesRemaining: this.revivesRemaining,
      timestamp: Date.now(),
    });
  }

  public selectUpgrade(card: UpgradeCard) {
    this.activeUpgrades.push(card);
    card.apply(this);
    sound.playUpgradeFanfare();

    this.state = 'PLAYING';
    this.callbacks.onStateChange(this.state);
    this.lastTime = performance.now();
    this.startWave(this.wave + 1);
  }

  public triggerOverdrive() {
    if (this.state !== 'PLAYING' || this.player.overdrive < 99) return;
    this.player.overdrive = 0;
    this.callbacks.onOverdriveChange(0);

    sound.playOverdrive();
    this.addScreenShake(0.8);

    // Shockwave pulse
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const shockwaveRange = Math.max(width, height);

    // Spawn massive particle ring
    for (let i = 0; i < 90; i++) {
      const angle = (i / 90) * Math.PI * 2;
      const spd = Math.random() * 450 + 200;
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 4 + 2,
        color: this.runConfig.weapon.color,
        alpha: 1.0,
        decay: 1.2,
        isGlow: true,
      });
    }

    // Clear enemy projectiles
    this.projectiles = this.projectiles.filter((p) => p.isPlayer);

    // Blast all enemies
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (dist <= shockwaveRange) {
        const dmg = Math.round(90 * this.playerDamageMultiplier);
        this.hitEnemy(enemy, dmg, true);
      }
    }
  }

  private queueAction(action: string) {
    this.inputBuffer.push({ action, time: performance.now() });
  }

  private startWave(waveNum: number) {
    this.wave = waveNum;
    this.callbacks.onWaveChange(this.wave);

    const isBossWave = this.wave % 5 === 0;
    this.waveTotalEnemies = isBossWave ? 1 : 12 + this.wave * 4;
    this.waveEnemiesRemaining = this.waveTotalEnemies;
    this.waveEnemiesSpawned = 0;
    this.spawnTimer = 0.5;

    sound.playWaveStart();
    this.addFloatingText(this.player.x, this.player.y - 45, isBossWave ? `BOSS: COLOSSE ALÉATOIRE !` : `VAGUE ${this.wave}`, '#ffffff', true);
  }

  private startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Frame delta time clamp

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    sound.stopAtmosphereMusic();
  }

  private update(dt: number) {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    // Hitstop pause check
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Camera shake decay
    if (this.cameraShakeTrauma > 0) {
      this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 2.8);
    }

    // Ambient background motes update (runs in all states)
    for (const mote of this.ambientMotes) {
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      if (mote.x < 0) mote.x = width;
      if (mote.x > width) mote.x = 0;
      if (mote.y < 0) mote.y = height;
      if (mote.y > height) mote.y = 0;
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= dt * 1.2;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (this.state === 'TITLE_MENU') {
      this.titleCamTime += dt;
      // Gentle floating animation for hero showcase
      this.player.x = width / 2 + Math.cos(this.titleCamTime * 0.8) * 15;
      this.player.y = height / 2 + Math.sin(this.titleCamTime * 1.2) * 10;
      this.player.rotation = this.titleCamTime * 0.4;
      return;
    }

    if (this.state !== 'PLAYING') return;

    this.timeSurvived += dt;

    // Process buffered inputs (dash with coyote/buffering)
    const now = performance.now();
    while (this.inputBuffer.length > 0) {
      const item = this.inputBuffer.shift()!;
      if (now - item.time <= 180) { // 180ms buffer window
        if (item.action === 'dash' && this.player.dashCooldown <= 0) {
          this.executeDash();
          break;
        }
      }
    }

    this.updatePlayer(dt, width, height);
    this.updateProjectiles(dt, width, height);
    this.updateEnemies(dt, width, height);
    this.updateOrbs(dt);
    this.checkCollisions(width, height);
    this.updateWaveSpawning(dt, width, height);
  }

  private executeDash() {
    this.player.isDashing = true;
    this.player.dashTimer = this.player.dashDuration;
    const cooldownReduction = this.runConfig.mutator.statModifier.cooldownReduction || 0;
    this.player.dashCooldown = this.player.dashMaxCooldown * (1 - cooldownReduction);
    this.player.invincibleTimer = this.player.dashDuration + 0.05;

    // Dash vector: towards current movement or aim direction
    let dirX = 0;
    let dirY = 0;

    if (this.virtualMove && (Math.abs(this.virtualMove.x) > 0.1 || Math.abs(this.virtualMove.y) > 0.1)) {
      dirX = this.virtualMove.x;
      dirY = this.virtualMove.y;
    } else if (this.virtualAim && (Math.abs(this.virtualAim.x) > 0.1 || Math.abs(this.virtualAim.y) > 0.1)) {
      dirX = this.virtualAim.x;
      dirY = this.virtualAim.y;
    } else {
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('KeyZ') || this.heldKeys.has('ArrowUp')) dirY -= 1;
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) dirY += 1;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('KeyQ') || this.heldKeys.has('ArrowLeft')) dirX -= 1;
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) dirX += 1;
    }

    if (dirX === 0 && dirY === 0) {
      // Dash towards mouse
      const angle = Math.atan2(this.mouseY - this.player.y, this.mouseX - this.player.x);
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
    } else {
      const len = Math.hypot(dirX, dirY);
      dirX /= len;
      dirY /= len;
    }

    const dashSpeed = 820 * this.playerSpeedMultiplier;
    this.player.dashVx = dirX * dashSpeed;
    this.player.dashVy = dirY * dashSpeed;

    // Squash and stretch
    this.player.squashX = 1.4;
    this.player.squashY = 0.6;

    sound.playDash();

    // Dash Nova upgrade
    if (this.dashHasNova) {
      this.addScreenShake(0.3);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(a) * 260,
          vy: Math.sin(a) * 260,
          radius: 3,
          color: '#38bdf8',
          alpha: 1,
          decay: 2.5,
        });
      }
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) <= 120) {
          this.hitEnemy(enemy, Math.round(50 * this.playerDamageMultiplier));
        }
      }
    }
  }

  private updatePlayer(dt: number, width: number, height: number) {
    const p = this.player;

    // Dash timer
    if (p.isDashing) {
      p.dashTimer -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;

      // Spawn ghost trail particles
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: -p.dashVx * 0.1,
        vy: -p.dashVy * 0.1,
        radius: p.radius * 0.8,
        color: this.runConfig.weapon.color,
        alpha: 0.5,
        decay: 3.5,
      });

      if (p.dashTimer <= 0) {
        p.isDashing = false;
      }
    } else {
      // Normal movement: keyboard or virtual move joystick
      let moveX = 0;
      let moveY = 0;

      if (this.virtualMove && (Math.abs(this.virtualMove.x) > 0.05 || Math.abs(this.virtualMove.y) > 0.05)) {
        moveX = this.virtualMove.x;
        moveY = this.virtualMove.y;
      } else {
        if (this.heldKeys.has('KeyW') || this.heldKeys.has('KeyZ') || this.heldKeys.has('ArrowUp')) moveY -= 1;
        if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveY += 1;
        if (this.heldKeys.has('KeyA') || this.heldKeys.has('KeyQ') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
        if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;

        if (moveX !== 0 && moveY !== 0) {
          const factor = 1 / Math.SQRT2;
          moveX *= factor;
          moveY *= factor;
        }
      }

      const targetSpeed = p.speed * this.playerSpeedMultiplier;
      p.vx += (moveX * targetSpeed - p.vx) * Math.min(1, dt * 14);
      p.vy += (moveY * targetSpeed - p.vy) * Math.min(1, dt * 14);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Clamp inside arena walls
    p.x = Math.max(p.radius + 12, Math.min(width - p.radius - 12, p.x));
    p.y = Math.max(p.radius + 12, Math.min(height - p.radius - 12, p.y));

    // Aim rotation: face virtual aim vector, or mouse cursor
    if (this.virtualAim && (Math.abs(this.virtualAim.x) > 0.1 || Math.abs(this.virtualAim.y) > 0.1)) {
      p.rotation = Math.atan2(this.virtualAim.y, this.virtualAim.x);
    } else {
      const dx = this.mouseX - p.x;
      const dy = this.mouseY - p.y;
      if (Math.hypot(dx, dy) > 20) {
        p.rotation = Math.atan2(dy, dx);
      }
    }

    // Cooldown recoveries
    if (p.dashCooldown > 0) {
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      const pct = 1 - p.dashCooldown / p.dashMaxCooldown;
      this.callbacks.onDashCooldownChange(pct);
    }

    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
    if (p.hitFlashTimer > 0) p.hitFlashTimer -= dt;

    // Squash & stretch recovery
    p.squashX += (1 - p.squashX) * Math.min(1, dt * 12);
    p.squashY += (1 - p.squashY) * Math.min(1, dt * 12);

    // Continuous firing (Mouse held, Space held, or Right Joystick active)
    this.shootCooldownTimer -= dt;
    const isFiring = this.isMouseDown || this.heldKeys.has('Space') || this.isVirtualFiring;
    const fireInterval = 1 / (this.runConfig.weapon.fireRate * this.fireRateMultiplier);

    if (isFiring && this.shootCooldownTimer <= 0) {
      this.fireWeapon();
      this.shootCooldownTimer = fireInterval;
    }

    // Companion Drones fire
    if (this.droneCount > 0 && this.shootCooldownTimer <= 0 && this.enemies.length > 0) {
      this.fireDroneShot();
    }
  }

  private fireWeapon() {
    const p = this.player;
    const wp = this.runConfig.weapon;
    const baseDamage = wp.damage * this.playerDamageMultiplier;
    const count = 1 + this.extraProjectiles;

    // Visual recoil & sound
    p.squashX = 0.85;
    p.squashY = 1.15;
    sound.playShoot(this.nextEntityId);

    if (wp.id === 'sonic_shotgun') {
      const pellets = 5 + this.extraProjectiles * 2;
      for (let i = 0; i < pellets; i++) {
        const spread = (Math.random() - 0.5) * 0.55;
        const angle = p.rotation + spread;
        const speed = wp.speed * (0.9 + Math.random() * 0.25);
        this.projectiles.push({
          id: this.nextEntityId++,
          x: p.x + Math.cos(angle) * (p.radius + 6),
          y: p.y + Math.sin(angle) * (p.radius + 6),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 3.5,
          damage: baseDamage * 0.65,
          color: wp.color,
          isPlayer: true,
          lifetime: 0,
          maxLifetime: wp.range / speed,
          pierce: this.projectilePierce,
        });
      }
    } else if (wp.id === 'homing_missiles') {
      for (let i = 0; i < count; i++) {
        const angle = p.rotation + (i - (count - 1) / 2) * 0.25;
        this.projectiles.push({
          id: this.nextEntityId++,
          x: p.x + Math.cos(angle) * (p.radius + 6),
          y: p.y + Math.sin(angle) * (p.radius + 6),
          vx: Math.cos(angle) * wp.speed,
          vy: Math.sin(angle) * wp.speed,
          radius: 4,
          damage: baseDamage,
          color: wp.color,
          isPlayer: true,
          lifetime: 0,
          maxLifetime: wp.range / wp.speed,
          pierce: this.projectilePierce,
          homingTarget: this.findNearestEnemy(p.x, p.y),
        });
      }
    } else {
      // Plasma / Lightning / Orbital
      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * 0.15;
        const angle = p.rotation + offset;
        this.projectiles.push({
          id: this.nextEntityId++,
          x: p.x + Math.cos(angle) * (p.radius + 6),
          y: p.y + Math.sin(angle) * (p.radius + 6),
          vx: Math.cos(angle) * wp.speed,
          vy: Math.sin(angle) * wp.speed,
          radius: 4.5,
          damage: baseDamage,
          color: wp.color,
          isPlayer: true,
          lifetime: 0,
          maxLifetime: wp.range / wp.speed,
          pierce: this.projectilePierce,
        });
      }
    }
  }

  private fireDroneShot() {
    const target = this.findNearestEnemy(this.player.x, this.player.y);
    if (!target) return;
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.projectiles.push({
      id: this.nextEntityId++,
      x: this.player.x + Math.cos(this.timeSurvived * 3) * 35,
      y: this.player.y + Math.sin(this.timeSurvived * 3) * 35,
      vx: Math.cos(angle) * 580,
      vy: Math.sin(angle) * 580,
      radius: 3,
      damage: 14 * this.playerDamageMultiplier,
      color: '#38bdf8',
      isPlayer: true,
      lifetime: 0,
      maxLifetime: 1.2,
      pierce: 1,
    });
  }

  private findNearestEnemy(fromX: number, fromY: number): Enemy | null {
    let bestDist = Infinity;
    let best: Enemy | null = null;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - fromX, e.y - fromY);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private updateProjectiles(dt: number, width: number, height: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Homing behavior
      if (proj.homingTarget && this.enemies.includes(proj.homingTarget)) {
        const targetAngle = Math.atan2(proj.homingTarget.y - proj.y, proj.homingTarget.x - proj.x);
        const currentAngle = Math.atan2(proj.vy, proj.vx);
        const speed = Math.hypot(proj.vx, proj.vy);
        const newAngle = currentAngle + Math.sin(targetAngle - currentAngle) * Math.min(1, dt * 7);
        proj.vx = Math.cos(newAngle) * speed;
        proj.vy = Math.sin(newAngle) * speed;
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.lifetime += dt;

      // Particle sparks
      if (Math.random() < 0.35) {
        this.particles.push({
          x: proj.x,
          y: proj.y,
          vx: -proj.vx * 0.15 + (Math.random() - 0.5) * 30,
          vy: -proj.vy * 0.15 + (Math.random() - 0.5) * 30,
          radius: 2,
          color: proj.color,
          alpha: 0.8,
          decay: 4.0,
        });
      }

      // Check boundary or lifetime expiration
      if (
        proj.lifetime >= proj.maxLifetime ||
        proj.x < 0 || proj.x > width ||
        proj.y < 0 || proj.y > height
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number, width: number, height: number) {
    const enemySpeedMul = this.runConfig.mutator.statModifier.enemySpeed || 1.0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.pulsePhase += dt * 4;
      if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;

      const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      const angleToPlayer = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);

      switch (enemy.type) {
        case 'chaser': {
          // Fast lurker that charges with visible windup
          if (!enemy.isTelegraphing && distToPlayer < 240 && Math.random() < 0.02) {
            enemy.isTelegraphing = true;
            enemy.telegraphTimer = enemy.telegraphDuration;
            enemy.aimAngle = angleToPlayer;
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing) {
            enemy.telegraphTimer -= dt;
            if (enemy.telegraphTimer <= 0) {
              // Lunge!
              enemy.isTelegraphing = false;
              const lungeSpeed = enemy.speed * 2.8 * enemySpeedMul;
              enemy.vx = Math.cos(enemy.aimAngle || angleToPlayer) * lungeSpeed;
              enemy.vy = Math.sin(enemy.aimAngle || angleToPlayer) * lungeSpeed;
            } else {
              // Decelerate during telegraph
              enemy.vx *= 0.85;
              enemy.vy *= 0.85;
            }
          } else {
            // Seek player
            const spd = enemy.speed * enemySpeedMul;
            enemy.vx += (Math.cos(angleToPlayer) * spd - enemy.vx) * Math.min(1, dt * 4);
            enemy.vy += (Math.sin(angleToPlayer) * spd - enemy.vy) * Math.min(1, dt * 4);
          }
          break;
        }

        case 'sniper': {
          // Keeps distance, shows targeting laser, then fires projectile
          enemy.shootCooldown -= dt;
          if (distToPlayer < 220) {
            // Back away
            enemy.vx += (-Math.cos(angleToPlayer) * enemy.speed - enemy.vx) * Math.min(1, dt * 3);
            enemy.vy += (-Math.sin(angleToPlayer) * enemy.speed - enemy.vy) * Math.min(1, dt * 3);
          } else {
            enemy.vx *= 0.9;
            enemy.vy *= 0.9;
          }

          if (!enemy.isTelegraphing && enemy.shootCooldown <= 0) {
            enemy.isTelegraphing = true;
            enemy.telegraphTimer = enemy.telegraphDuration;
            enemy.aimAngle = angleToPlayer;
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing) {
            // Track player aim
            enemy.aimAngle = angleToPlayer;
            enemy.telegraphTimer -= dt;
            if (enemy.telegraphTimer <= 0) {
              enemy.isTelegraphing = false;
              enemy.shootCooldown = 2.4;
              // Shoot high-speed projectile
              const speed = 440;
              this.projectiles.push({
                id: this.nextEntityId++,
                x: enemy.x + Math.cos(enemy.aimAngle) * (enemy.radius + 4),
                y: enemy.y + Math.sin(enemy.aimAngle) * (enemy.radius + 4),
                vx: Math.cos(enemy.aimAngle) * speed,
                vy: Math.sin(enemy.aimAngle) * speed,
                radius: 5,
                damage: 22,
                color: '#ef4444',
                isPlayer: false,
                lifetime: 0,
                maxLifetime: 3.5,
                pierce: 1,
              });
            }
          }
          break;
        }

        case 'bomber': {
          // Approaches player, locks in place, expands detonator ring, explodes!
          if (!enemy.isTelegraphing && distToPlayer < 90) {
            enemy.isTelegraphing = true;
            enemy.telegraphTimer = enemy.telegraphDuration;
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing) {
            enemy.vx *= 0.8;
            enemy.vy *= 0.8;
            enemy.telegraphTimer -= dt;
            if (enemy.telegraphTimer <= 0) {
              // Detonate!
              this.explodeBomber(enemy);
              this.enemies.splice(i, 1);
              continue;
            }
          } else {
            const spd = enemy.speed * enemySpeedMul;
            enemy.vx = Math.cos(angleToPlayer) * spd;
            enemy.vy = Math.sin(angleToPlayer) * spd;
          }
          break;
        }

        case 'boss': {
          // Goliath Boss
          enemy.shootCooldown -= dt;
          enemy.vx += (Math.cos(angleToPlayer) * enemy.speed - enemy.vx) * Math.min(1, dt * 2);
          enemy.vy += (Math.sin(angleToPlayer) * enemy.speed - enemy.vy) * Math.min(1, dt * 2);

          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = 2.8;
            // Radial bullet curtain
            const count = 12;
            for (let b = 0; b < count; b++) {
              const a = (b / count) * Math.PI * 2 + enemy.pulsePhase;
              this.projectiles.push({
                id: this.nextEntityId++,
                x: enemy.x + Math.cos(a) * enemy.radius,
                y: enemy.y + Math.sin(a) * enemy.radius,
                vx: Math.cos(a) * 220,
                vy: Math.sin(a) * 220,
                radius: 5,
                damage: 20,
                color: '#f97316',
                isPlayer: false,
                lifetime: 0,
                maxLifetime: 4.0,
                pierce: 1,
              });
            }
            sound.playShoot(1);
          }
          break;
        }

        case 'elite_phantom': {
          // Elite: Spectre Phasique - Phase warp & homing tri-shards
          enemy.eliteAbilityTimer = (enemy.eliteAbilityTimer ?? 3.5) - dt;

          if (enemy.eliteAbilityTimer <= 0 && enemy.eliteAbilityState !== 'charging') {
            enemy.isTelegraphing = true;
            enemy.eliteAbilityState = 'charging';
            enemy.telegraphDuration = 0.9;
            enemy.telegraphTimer = 0.9;
            const warpAngle = Math.random() * Math.PI * 2;
            const warpDist = 170 + Math.random() * 60;
            enemy.eliteTargetX = Math.max(40, Math.min(width - 40, this.player.x + Math.cos(warpAngle) * warpDist));
            enemy.eliteTargetY = Math.max(40, Math.min(height - 40, this.player.y + Math.sin(warpAngle) * warpDist));
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing && enemy.eliteAbilityState === 'charging') {
            enemy.telegraphTimer -= dt;
            enemy.vx *= 0.85;
            enemy.vy *= 0.85;

            if (enemy.telegraphTimer <= 0) {
              // Warp to target location!
              sound.playEliteWarp();
              // Spawn phase particles at old & new locations
              for (let k = 0; k < 14; k++) {
                const a = Math.random() * Math.PI * 2;
                const spd = Math.random() * 140 + 40;
                this.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  radius: 2.5,
                  color: '#c084fc',
                  alpha: 1,
                  decay: 3.5,
                });
                this.particles.push({
                  x: enemy.eliteTargetX!,
                  y: enemy.eliteTargetY!,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  radius: 2.5,
                  color: '#e879f9',
                  alpha: 1,
                  decay: 3.5,
                });
              }

              enemy.x = enemy.eliteTargetX!;
              enemy.y = enemy.eliteTargetY!;

              // Fire tri-shard homing barrage
              const newAngleToPlayer = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
              [-0.28, 0, 0.28].forEach((offset) => {
                const angle = newAngleToPlayer + offset;
                this.projectiles.push({
                  id: this.nextEntityId++,
                  x: enemy.x + Math.cos(angle) * (enemy.radius + 6),
                  y: enemy.y + Math.sin(angle) * (enemy.radius + 6),
                  vx: Math.cos(angle) * 360,
                  vy: Math.sin(angle) * 360,
                  radius: 4.5,
                  damage: 22,
                  color: '#c084fc',
                  isPlayer: false,
                  lifetime: 0,
                  maxLifetime: 3.2,
                  pierce: 1,
                });
              });

              enemy.isTelegraphing = false;
              enemy.eliteAbilityState = 'idle';
              enemy.eliteAbilityTimer = 3.6;
            }
          } else {
            // Ethereal floating drift towards player
            const drift = Math.sin(enemy.pulsePhase) * 55;
            const spd = enemy.speed * enemySpeedMul;
            enemy.vx += (Math.cos(angleToPlayer) * spd - Math.sin(angleToPlayer) * drift - enemy.vx) * Math.min(1, dt * 3);
            enemy.vy += (Math.sin(angleToPlayer) * spd + Math.cos(angleToPlayer) * drift - enemy.vy) * Math.min(1, dt * 3);
          }
          break;
        }

        case 'elite_tesla': {
          // Elite: Conducteur Tesla - Static Dynamo & Electrical Burst
          enemy.eliteAbilityTimer = (enemy.eliteAbilityTimer ?? 4.0) - dt;

          if (enemy.eliteAbilityTimer <= 0 && enemy.eliteAbilityState !== 'charging') {
            enemy.isTelegraphing = true;
            enemy.eliteAbilityState = 'charging';
            enemy.telegraphDuration = 1.2;
            enemy.telegraphTimer = 1.2;
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing && enemy.eliteAbilityState === 'charging') {
            enemy.telegraphTimer -= dt;
            enemy.vx *= 0.8;
            enemy.vy *= 0.8;

            // Crackling particles
            if (Math.random() < 0.6) {
              this.particles.push({
                x: enemy.x + (Math.random() - 0.5) * 35,
                y: enemy.y + (Math.random() - 0.5) * 35,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                radius: 2,
                color: '#fbbf24',
                alpha: 1,
                decay: 4.0,
              });
            }

            if (enemy.telegraphTimer <= 0) {
              // Electrical Nova detonation!
              sound.playEliteZap();
              this.addScreenShake(0.35);

              // Burst particles
              for (let p = 0; p < 28; p++) {
                const a = (p / 28) * Math.PI * 2;
                const spd = Math.random() * 260 + 80;
                this.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  radius: 3,
                  color: '#fbbf24',
                  alpha: 1,
                  decay: 2.2,
                });
              }

              // Area damage to player
              if (distToPlayer <= 135) {
                this.damagePlayer(32);
              }

              // Emit 4 ball lightning projectiles in diagonal directions
              for (let b = 0; b < 4; b++) {
                const a = (b / 4) * Math.PI * 2 + Math.PI / 4;
                this.projectiles.push({
                  id: this.nextEntityId++,
                  x: enemy.x + Math.cos(a) * enemy.radius,
                  y: enemy.y + Math.sin(a) * enemy.radius,
                  vx: Math.cos(a) * 220,
                  vy: Math.sin(a) * 220,
                  radius: 5.5,
                  damage: 18,
                  color: '#fbbf24',
                  isPlayer: false,
                  lifetime: 0,
                  maxLifetime: 3.5,
                  pierce: 1,
                });
              }

              enemy.isTelegraphing = false;
              enemy.eliteAbilityState = 'idle';
              enemy.eliteAbilityTimer = 4.2;
            }
          } else {
            // Maintains medium battle distance (~180px)
            const targetDist = 180;
            const approach = distToPlayer > targetDist ? 1 : -0.7;
            const spd = enemy.speed * enemySpeedMul;
            enemy.vx += (Math.cos(angleToPlayer) * spd * approach - enemy.vx) * Math.min(1, dt * 3);
            enemy.vy += (Math.sin(angleToPlayer) * spd * approach - enemy.vy) * Math.min(1, dt * 3);
          }
          break;
        }

        case 'elite_juggernaut': {
          // Elite: Mastodonte Blindé - Front kinetic shield & kinetic stampede
          enemy.eliteShieldAngle = angleToPlayer;
          enemy.eliteAbilityTimer = (enemy.eliteAbilityTimer ?? 4.8) - dt;

          if (enemy.eliteAbilityTimer <= 0 && enemy.eliteAbilityState === 'idle') {
            enemy.isTelegraphing = true;
            enemy.eliteAbilityState = 'charging';
            enemy.telegraphDuration = 1.0;
            enemy.telegraphTimer = 1.0;
            enemy.aimAngle = angleToPlayer;
            sound.playTelegraphWarning();
          }

          if (enemy.isTelegraphing && enemy.eliteAbilityState === 'charging') {
            enemy.telegraphTimer -= dt;
            // Lock aiming angle during final windup
            if (enemy.telegraphTimer < 0.4) {
              enemy.vx = 0;
              enemy.vy = 0;
            }

            if (enemy.telegraphTimer <= 0) {
              // Stampede launch!
              enemy.isTelegraphing = false;
              enemy.eliteAbilityState = 'active';
              enemy.eliteAbilityTimer = 0.65;
              const chargeSpeed = 680 * enemySpeedMul;
              enemy.vx = Math.cos(enemy.aimAngle!) * chargeSpeed;
              enemy.vy = Math.sin(enemy.aimAngle!) * chargeSpeed;
              this.addScreenShake(0.3);
            }
          } else if (enemy.eliteAbilityState === 'active') {
            enemy.eliteAbilityTimer -= dt;

            // Dust trail
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: -enemy.vx * 0.1,
              vy: -enemy.vy * 0.1,
              radius: 3.5,
              color: '#f43f5e',
              alpha: 0.8,
              decay: 4.0,
            });

            // Impact check with player
            if (distToPlayer <= enemy.radius + this.player.radius) {
              this.damagePlayer(36);
              this.player.vx += Math.cos(enemy.aimAngle!) * 300;
              this.player.vy += Math.sin(enemy.aimAngle!) * 300;
            }

            // Wall collision or timer expiration
            const hitWall = enemy.x <= enemy.radius + 10 || enemy.x >= width - enemy.radius - 10 ||
                            enemy.y <= enemy.radius + 10 || enemy.y >= height - enemy.radius - 10;

            if (hitWall || enemy.eliteAbilityTimer <= 0) {
              this.addScreenShake(0.4);
              enemy.eliteAbilityState = 'idle';
              enemy.eliteAbilityTimer = 4.8;
              enemy.vx = 0;
              enemy.vy = 0;
            }
          } else {
            // Steady advance with front shield forward
            const spd = enemy.speed * enemySpeedMul;
            enemy.vx += (Math.cos(angleToPlayer) * spd - enemy.vx) * Math.min(1, dt * 2.5);
            enemy.vy += (Math.sin(angleToPlayer) * spd - enemy.vy) * Math.min(1, dt * 2.5);
          }
          break;
        }
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Arena boundaries
      enemy.x = Math.max(enemy.radius, Math.min(width - enemy.radius, enemy.x));
      enemy.y = Math.max(enemy.radius, Math.min(height - enemy.radius, enemy.y));
    }
  }

  private explodeBomber(enemy: Enemy) {
    sound.playEnemyExplode(false);
    this.addScreenShake(0.5);

    // Blast particles
    for (let p = 0; p < 35; p++) {
      const a = (p / 35) * Math.PI * 2;
      const spd = Math.random() * 260 + 80;
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: Math.random() * 4 + 2,
        color: '#f59e0b',
        alpha: 1,
        decay: 2.2,
      });
    }

    // Damage player if in radius
    const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
    if (dist <= 110) {
      this.damagePlayer(35);
    }
  }

  private updateOrbs(dt: number) {
    const p = this.player;
    const pickupRadius = this.magnetRadius; // magnetically pulled towards player

    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      orb.pulse += dt * 5;

      const dist = Math.hypot(p.x - orb.x, p.y - orb.y);
      if (dist < pickupRadius) {
        const pullSpeed = 480 * (1 - dist / pickupRadius);
        const angle = Math.atan2(p.y - orb.y, p.x - orb.x);
        orb.vx = Math.cos(angle) * pullSpeed;
        orb.vy = Math.sin(angle) * pullSpeed;
      }

      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;

      // Collection
      if (dist < p.radius + 12) {
        sound.playOrbCollect();
        const gain = orb.value * this.overdriveGainMultiplier;
        p.overdrive = Math.min(100, p.overdrive + gain);
        this.callbacks.onOverdriveChange(p.overdrive);
        this.score += 25;
        this.callbacks.onScoreChange(this.score);

        this.particles.push({
          x: orb.x,
          y: orb.y,
          vx: 0,
          vy: -30,
          radius: 3,
          color: orb.color,
          alpha: 1,
          decay: 3.0,
        });

        this.energyOrbs.splice(i, 1);
      }
    }
  }

  private checkCollisions(width: number, height: number) {
    const p = this.player;

    // 1. Player Projectiles vs Enemies
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx];
      if (!proj.isPlayer) continue;

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = this.enemies[eIdx];
        const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);

        if (dist <= enemy.radius + proj.radius) {
          // Check Juggernaut Kinetic Shield deflection!
          if (enemy.type === 'elite_juggernaut' && enemy.eliteShieldAngle !== undefined) {
            const projAngle = Math.atan2(proj.y - enemy.y, proj.x - enemy.x);
            let diff = Math.abs(projAngle - enemy.eliteShieldAngle);
            while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

            // Deflection within front 65 degrees
            if (diff < 1.15) {
              sound.playHit();
              this.addFloatingText(proj.x, proj.y - 10, 'BLINDÉ', '#94a3b8');
              for (let s = 0; s < 6; s++) {
                this.particles.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * 160,
                  vy: (Math.random() - 0.5) * 160,
                  radius: 2,
                  color: '#38bdf8',
                  alpha: 1,
                  decay: 4.0,
                });
              }
              this.projectiles.splice(pIdx, 1);
              break;
            }
          }

          // Hit!
          this.hitEnemy(enemy, proj.damage);
          proj.pierce -= 1;

          // Particle burst
          for (let k = 0; k < 6; k++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 120 + 40;
            this.particles.push({
              x: proj.x,
              y: proj.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              radius: 2.5,
              color: proj.color,
              alpha: 1,
              decay: 3.5,
            });
          }

          if (proj.pierce <= 0) {
            this.projectiles.splice(pIdx, 1);
            break;
          }
        }
      }
    }

    // 2. Enemy Projectiles vs Player
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx];
      if (proj.isPlayer) continue;

      const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (dist <= p.radius + proj.radius) {
        this.damagePlayer(proj.damage);
        this.projectiles.splice(pIdx, 1);
      }
    }

    // 3. Enemies vs Player (body contact)
    for (const enemy of this.enemies) {
      const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (dist <= p.radius + enemy.radius) {
        this.damagePlayer(enemy.damage);
        // Knockback player slightly
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        p.vx += Math.cos(angle) * 160;
        p.vy += Math.sin(angle) * 160;
      }
    }
  }

  private hitEnemy(enemy: Enemy, damage: number, isCritical: boolean = false) {
    enemy.hp -= damage;
    enemy.hitFlashTimer = 0.08;
    this.damageDealtTotal += damage;

    this.addFloatingText(
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y - 15,
      `${Math.round(damage)}`,
      isCritical ? '#fbbf24' : '#ffffff',
      isCritical
    );

    sound.playHit();

    // Defeated
    if (enemy.hp <= 0) {
      this.eliminateEnemy(enemy);
    }
  }

  private eliminateEnemy(enemy: Enemy) {
    const isBoss = enemy.type === 'boss';
    const isElite = !!enemy.isElite;

    sound.playEnemyExplode(isBoss || isElite);
    this.addScreenShake(isBoss ? 0.7 : isElite ? 0.5 : 0.2);
    this.hitstopTimer = isBoss ? 0.08 : isElite ? 0.06 : 0.03; // Simulation hitstop

    this.kills += 1;
    this.score += enemy.scoreValue;
    this.callbacks.onScoreChange(this.score);

    // Quantum Shards award (persisted in progression profile)
    const shardBonus = isBoss ? 20 : isElite ? 6 : 1;
    this.shardsEarnedInRun += shardBonus;
    this.callbacks.onShardsChange?.(this.shardsEarnedInRun);

    if (isElite) {
      this.addFloatingText(enemy.x, enemy.y - 30, `+${enemy.scoreValue} ÉLITE ! (+${shardBonus} Cristaux)`, '#fbbf24', true);
    } else if (isBoss) {
      this.addFloatingText(enemy.x, enemy.y - 30, `BOSS VAINCU ! (+${shardBonus} Cristaux)`, '#fbbf24', true);
    }

    // Drop energy orbs (Elites drop high-tier orbs)
    const orbCount = isBoss ? 6 : isElite ? 4 : Math.random() < 0.6 ? 2 : 1;
    for (let o = 0; o < orbCount; o++) {
      this.energyOrbs.push({
        id: this.nextEntityId++,
        x: enemy.x + (Math.random() - 0.5) * 15,
        y: enemy.y + (Math.random() - 0.5) * 15,
        value: isBoss ? 15 : isElite ? 10 : 6,
        color: this.runConfig.weapon.color,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        pulse: Math.random() * Math.PI,
      });
    }

    // Death explosion particles
    const particleCount = isBoss ? 45 : isElite ? 32 : 16;
    for (let p = 0; p < particleCount; p++) {
      const a = (p / particleCount) * Math.PI * 2;
      const spd = Math.random() * 220 + 60;
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: Math.random() * 3.5 + 1.5,
        color: enemy.color,
        alpha: 1,
        decay: 2.0,
      });
    }

    // Nanites vampirism upgrade
    if (this.vampirismChance > 0 && Math.random() < this.vampirismChance) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 6);
      this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
      this.addFloatingText(this.player.x, this.player.y - 30, '+6 PV', '#10b981', true);
    }

    // Explosive kills upgrade
    if (this.hasExplosiveKills) {
      for (const other of this.enemies) {
        if (other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 90) {
          this.hitEnemy(other, Math.round(30 * this.playerDamageMultiplier));
        }
      }
    }

    // Remove from array
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }
  }

  public damagePlayer(amount: number) {
    if (this.player.invincibleTimer > 0 || this.player.isDashing) return;

    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.invincibleTimer = 0.5;
    this.player.hitFlashTimer = 0.15;
    this.addScreenShake(0.5);
    this.hitstopTimer = 0.05;

    sound.playPlayerHurt();
    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);

    this.addFloatingText(this.player.x, this.player.y - 25, `-${Math.round(amount)}`, '#ef4444', true);

    if (this.player.hp <= 0) {
      // Quantum Defibrillator Emergency Revive (Evolution Tree)
      if (this.revivesRemaining > 0) {
        this.revivesRemaining--;
        this.player.hp = Math.round(this.player.maxHp * 0.4);
        this.player.invincibleTimer = 2.5;
        this.player.hitFlashTimer = 0.35;
        sound.playOverdrive();
        this.addScreenShake(0.65);
        this.projectiles = this.projectiles.filter((p) => p.isPlayer);
        this.addFloatingText(this.player.x, this.player.y - 40, 'RÉANIMATION QUANTIQUE ACTIVE ! (40% PV)', '#38bdf8', true);
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        return;
      }

      this.handleGameOver();
    }
  }

  private handleGameOver() {
    this.state = 'GAME_OVER';
    this.callbacks.onStateChange(this.state);
    sound.playEnemyExplode(true);

    // Save run outcome into persistent progression profile
    progression.recordRunCompletion({
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      shardsGathered: this.shardsEarnedInRun,
    });

    const stats: GameStats = {
      score: this.score,
      wave: this.wave,
      kills: this.kills,
      damageDealt: Math.round(this.damageDealtTotal),
      timeSurvived: Math.round(this.timeSurvived),
      seed: this.runConfig.seed,
      biomeName: this.runConfig.biome.name,
      weaponName: this.runConfig.weapon.name,
      mutatorName: this.runConfig.mutator.name,
    };

    this.callbacks.onGameOver(stats);
  }

  private updateWaveSpawning(dt: number, width: number, height: number) {
    if (this.waveEnemiesSpawned < this.waveTotalEnemies) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(width, height);
        this.waveEnemiesSpawned++;
        this.spawnTimer = Math.max(0.4, 1.8 - this.wave * 0.12);
      }
    } else if (this.enemies.length === 0) {
      // Wave cleared!
      this.waveCleared();
    }
  }

  private spawnEnemy(width: number, height: number) {
    const isBossWave = this.wave % 5 === 0;

    // Pick spawn coordinate at perimeter outside screen center
    let x = 0;
    let y = 0;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = Math.random() * width; y = -20; }
    else if (edge === 1) { x = width + 20; y = Math.random() * height; }
    else if (edge === 2) { x = Math.random() * width; y = height + 20; }
    else { x = -20; y = Math.random() * height; }

    if (isBossWave) {
      // Spawn Goliath Boss
      this.enemies.push({
        id: this.nextEntityId++,
        type: 'boss',
        x,
        y,
        radius: 36,
        vx: 0,
        vy: 0,
        hp: 450 + this.wave * 120,
        maxHp: 450 + this.wave * 120,
        speed: 90,
        damage: 28,
        scoreValue: 600,
        color: '#f97316',
        telegraphTimer: 0,
        isTelegraphing: false,
        telegraphDuration: 1.0,
        shootCooldown: 2.5,
        pulsePhase: 0,
        hitFlashTimer: 0,
      });
      return;
    }

    // Check if an Elite enemy should spawn alongside the wave
    const activeElites = this.enemies.filter((e) => e.isElite).length;
    const maxElites = this.wave >= 5 ? 2 : 1;
    const eliteChance = this.wave >= 4 ? 0.28 : this.wave >= 2 ? 0.20 : 0;

    if (!isBossWave && this.wave >= 2 && activeElites < maxElites && Math.random() < eliteChance) {
      const eliteTypes: ('elite_phantom' | 'elite_tesla' | 'elite_juggernaut')[] = [
        'elite_phantom',
        'elite_tesla',
        'elite_juggernaut',
      ];
      const chosenType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];

      sound.playEliteSpawn();
      this.addScreenShake(0.25);

      if (chosenType === 'elite_phantom') {
        const hp = 180 + this.wave * 40;
        this.enemies.push({
          id: this.nextEntityId++,
          type: 'elite_phantom',
          x,
          y,
          radius: 18,
          vx: 0,
          vy: 0,
          hp,
          maxHp: hp,
          speed: 130,
          damage: 22,
          scoreValue: 300,
          color: '#c084fc',
          isElite: true,
          eliteTitle: 'SPECTRE PHASIQUE',
          eliteAbilityTimer: 2.2,
          eliteAbilityState: 'idle',
          telegraphTimer: 0,
          isTelegraphing: false,
          telegraphDuration: 0.9,
          shootCooldown: 2.0,
          pulsePhase: Math.random() * Math.PI,
          hitFlashTimer: 0,
        });
        this.addFloatingText(width / 2, 70, 'ALERTE : ÉLITE SPECTRE PHASIQUE !', '#c084fc', true);
        return;
      } else if (chosenType === 'elite_tesla') {
        const hp = 240 + this.wave * 50;
        this.enemies.push({
          id: this.nextEntityId++,
          type: 'elite_tesla',
          x,
          y,
          radius: 20,
          vx: 0,
          vy: 0,
          hp,
          maxHp: hp,
          speed: 110,
          damage: 24,
          scoreValue: 340,
          color: '#fbbf24',
          isElite: true,
          eliteTitle: 'CONDUCTEUR TESLA',
          eliteAbilityTimer: 2.6,
          eliteAbilityState: 'idle',
          telegraphTimer: 0,
          isTelegraphing: false,
          telegraphDuration: 1.2,
          shootCooldown: 2.5,
          pulsePhase: Math.random() * Math.PI,
          hitFlashTimer: 0,
        });
        this.addFloatingText(width / 2, 70, 'ALERTE : ÉLITE CONDUCTEUR TESLA !', '#fbbf24', true);
        return;
      } else {
        const hp = 320 + this.wave * 65;
        this.enemies.push({
          id: this.nextEntityId++,
          type: 'elite_juggernaut',
          x,
          y,
          radius: 22,
          vx: 0,
          vy: 0,
          hp,
          maxHp: hp,
          speed: 95,
          damage: 30,
          scoreValue: 380,
          color: '#f43f5e',
          isElite: true,
          eliteTitle: 'MASTODONTE BLINDÉ',
          eliteAbilityTimer: 3.0,
          eliteAbilityState: 'idle',
          eliteShieldActive: true,
          eliteShieldAngle: 0,
          telegraphTimer: 0,
          isTelegraphing: false,
          telegraphDuration: 1.0,
          shootCooldown: 3.0,
          pulsePhase: Math.random() * Math.PI,
          hitFlashTimer: 0,
        });
        this.addFloatingText(width / 2, 70, 'ALERTE : ÉLITE MASTODONTE BLINDÉ !', '#f43f5e', true);
        return;
      }
    }

    // Regular waves: chaser, sniper, bomber
    const rand = Math.random();
    let type: EnemyType = 'chaser';
    let hp = 30 + this.wave * 8;
    let speed = 150 + this.wave * 4;
    let radius = 13;
    let color = '#ef4444';
    let scoreVal = 50;

    if (this.wave >= 2 && rand > 0.65) {
      type = 'sniper';
      hp = 25 + this.wave * 6;
      speed = 100;
      radius = 12;
      color = '#38bdf8';
      scoreVal = 75;
    } else if (this.wave >= 3 && rand > 0.45 && rand <= 0.65) {
      type = 'bomber';
      hp = 20 + this.wave * 5;
      speed = 190;
      radius = 11;
      color = '#f59e0b';
      scoreVal = 80;
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type,
      x,
      y,
      radius,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      speed,
      damage: 15,
      scoreValue: scoreVal,
      color,
      telegraphTimer: 0,
      isTelegraphing: false,
      telegraphDuration: type === 'chaser' ? 0.35 : type === 'sniper' ? 0.9 : 0.75,
      shootCooldown: 1.5,
      pulsePhase: Math.random() * Math.PI,
      hitFlashTimer: 0,
    });
  }

  private waveCleared() {
    this.score += 200 * this.wave;
    this.callbacks.onScoreChange(this.score);

    // Auto-save active run state to ensure progression is never lost
    progression.saveActiveRun({
      seed: this.runConfig.seed,
      wave: this.wave + 1,
      score: this.score,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      overdrive: this.player.overdrive,
      biomeId: this.runConfig.biome.id,
      weaponId: this.runConfig.weapon.id,
      mutatorId: this.runConfig.mutator.id,
      upgradeIds: this.activeUpgrades.map((u) => u.id),
      timeSurvived: Math.round(this.timeSurvived),
      shardsEarnedInRun: this.shardsEarnedInRun,
      revivesRemaining: this.revivesRemaining,
      timestamp: Date.now(),
    });

    // Upgrade selection prompt every 2 waves
    if (this.wave % 2 === 0) {
      this.state = 'UPGRADE_SELECTION';
      this.callbacks.onStateChange(this.state);
      const cards = getRandomUpgradeChoices(3);
      this.callbacks.onUpgradePrompt(cards);
    } else {
      this.startWave(this.wave + 1);
    }
  }

  private addScreenShake(amount: number) {
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + amount);
  }

  private addFloatingText(x: number, y: number, text: string, color: string, isCritical: boolean = false) {
    this.floatingTexts.push({
      id: this.nextEntityId++,
      x,
      y,
      text,
      color,
      alpha: 1.0,
      vy: -40,
      isCritical,
    });
  }

  private render() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const ctx = this.ctx;
    const biome = this.runConfig.biome;

    // Apply Camera Shake (trauma squared gives natural feel)
    ctx.save();
    if (this.cameraShakeTrauma > 0) {
      const shakeMag = Math.pow(this.cameraShakeTrauma, 2) * 14;
      const offsetX = (Math.random() - 0.5) * shakeMag;
      const offsetY = (Math.random() - 0.5) * shakeMag;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Clear background
    ctx.fillStyle = biome.bgDark;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    // 2. Procedural grid floor
    ctx.strokeStyle = biome.gridColor;
    ctx.lineWidth = 1;
    const gridSize = 48;
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Ambient motes
    for (const m of this.ambientMotes) {
      ctx.fillStyle = m.color;
      ctx.globalAlpha = m.alpha;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. Energy Orbs
    for (const orb of this.energyOrbs) {
      const scale = 1 + Math.sin(orb.pulse) * 0.25;
      ctx.save();
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Enemy Telegraphs (Targeting Laser & Blast Radius Rings)
    for (const enemy of this.enemies) {
      if (enemy.isTelegraphing) {
        if (enemy.type === 'sniper' && enemy.aimAngle !== undefined) {
          // Telegraphed laser beam line
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(
            enemy.x + Math.cos(enemy.aimAngle) * 900,
            enemy.y + Math.sin(enemy.aimAngle) * 900
          );
          ctx.stroke();
          ctx.restore();
        } else if (enemy.type === 'bomber') {
          // Expanding warning perimeter
          const progress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
          ctx.save();
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.4 + progress * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 110 * progress, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (enemy.type === 'chaser') {
          // Lunging warning pulse ring
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (enemy.type === 'elite_phantom' && enemy.eliteTargetX !== undefined && enemy.eliteTargetY !== undefined) {
          // Elite Phantom: Warp portal destination ripple & guide tether
          const progress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
          ctx.save();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.eliteTargetX, enemy.eliteTargetY);
          ctx.stroke();

          // Target portal circle
          ctx.strokeStyle = `rgba(192, 132, 252, ${0.5 + progress * 0.5})`;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.eliteTargetX, enemy.eliteTargetY, 22 * (0.6 + progress * 0.4), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (enemy.type === 'elite_tesla') {
          // Elite Tesla: Expanding electrical shockwave aura
          const progress = 1 - enemy.telegraphTimer / enemy.telegraphDuration;
          const auraRadius = 135 * progress;
          ctx.save();
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 + progress * 0.6})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, auraRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (enemy.type === 'elite_juggernaut' && enemy.aimAngle !== undefined) {
          // Elite Juggernaut: Stampede kinetic runway lane
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(enemy.aimAngle);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
          ctx.lineWidth = 2;
          ctx.fillRect(0, -enemy.radius * 1.2, 450, enemy.radius * 2.4);
          ctx.strokeRect(0, -enemy.radius * 1.2, 450, enemy.radius * 2.4);
          ctx.restore();
        }
      }
    }

    // 6. Enemies
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Rotating runic energy halo for Elites
      if (enemy.isElite) {
        ctx.save();
        ctx.rotate(enemy.pulsePhase * 0.5);
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Hit flash white tint
      if (enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = enemy.type === 'boss' ? 16 : enemy.isElite ? 14 : 8;
      }

      // Draw geometry based on archetype
      ctx.beginPath();
      if (enemy.type === 'chaser') {
        // Razor triangle
        const a = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
        ctx.rotate(a);
        ctx.moveTo(enemy.radius * 1.3, 0);
        ctx.lineTo(-enemy.radius, enemy.radius * 0.9);
        ctx.lineTo(-enemy.radius * 0.6, 0);
        ctx.lineTo(-enemy.radius, -enemy.radius * 0.9);
        ctx.closePath();
      } else if (enemy.type === 'sniper') {
        // Hexagon / Diamond
        const r = enemy.radius;
        ctx.moveTo(0, -r * 1.2);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r * 1.2);
        ctx.lineTo(-r, 0);
        ctx.closePath();
      } else if (enemy.type === 'bomber') {
        // Spiked mine
        const spikes = 6;
        for (let s = 0; s < spikes * 2; s++) {
          const rad = s % 2 === 0 ? enemy.radius * 1.3 : enemy.radius * 0.8;
          const ang = (s / (spikes * 2)) * Math.PI * 2 + enemy.pulsePhase;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (enemy.type === 'elite_phantom') {
        // Elite Phantom: Crystalline quad-prism
        const r = enemy.radius;
        const ang = enemy.pulsePhase * 0.8;
        ctx.moveTo(Math.cos(ang) * r * 1.3, Math.sin(ang) * r * 1.3);
        ctx.lineTo(Math.cos(ang + Math.PI / 2) * r * 0.9, Math.sin(ang + Math.PI / 2) * r * 0.9);
        ctx.lineTo(Math.cos(ang + Math.PI) * r * 1.3, Math.sin(ang + Math.PI) * r * 1.3);
        ctx.lineTo(Math.cos(ang + (Math.PI * 3) / 2) * r * 0.9, Math.sin(ang + (Math.PI * 3) / 2) * r * 0.9);
        ctx.closePath();
      } else if (enemy.type === 'elite_tesla') {
        // Elite Tesla: Dynamo Capacitor with 4 nodes
        const r = enemy.radius;
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.closePath();
      } else if (enemy.type === 'elite_juggernaut') {
        // Elite Juggernaut: Heavy fortified hull
        const r = enemy.radius;
        for (let s = 0; s < 6; s++) {
          const ang = (s / 6) * Math.PI * 2;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        // Boss Goliath: segmented fortified octagon
        const r = enemy.radius;
        for (let s = 0; s < 8; s++) {
          const ang = (s / 8) * Math.PI * 2 + enemy.pulsePhase * 0.5;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      ctx.fill();

      // Elite Juggernaut: Front Kinetic Shield Arc
      if (enemy.type === 'elite_juggernaut' && enemy.eliteShieldAngle !== undefined) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4;
        const relativeAngle = enemy.eliteShieldAngle;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius + 6, relativeAngle - 1.05, relativeAngle + 1.05);
        ctx.stroke();
        ctx.restore();
      }

      // Elite Tesla: Conductive pylons
      if (enemy.type === 'elite_tesla') {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        for (let n = 0; n < 4; n++) {
          const na = (n / 4) * Math.PI * 2 + enemy.pulsePhase;
          ctx.beginPath();
          ctx.arc(Math.cos(na) * (enemy.radius + 4), Math.sin(na) * (enemy.radius + 4), 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Overhead Title & Health Bar
      const isBoss = enemy.type === 'boss';
      const isElite = !!enemy.isElite;

      if (isElite) {
        // Overhead Elite Title Text
        ctx.save();
        ctx.fillStyle = enemy.color;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 4;
        ctx.fillText(`ÉLITE · ${enemy.eliteTitle}`, 0, -enemy.radius - 17);
        ctx.restore();
      }

      // Health Bar
      if (enemy.hp < enemy.maxHp || isBoss || isElite) {
        const barWidth = isElite ? enemy.radius * 2.8 : enemy.radius * 2;
        const barHeight = isElite ? 5 : 4;
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        const yOffset = isElite ? -enemy.radius - 12 : -enemy.radius - 9;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);
        ctx.fillStyle = isBoss ? '#f59e0b' : isElite ? enemy.color : '#ef4444';
        ctx.fillRect(-barWidth / 2, yOffset, barWidth * hpPct, barHeight);
      }

      ctx.restore();
    }

    // 7. Projectiles
    for (const proj of this.projectiles) {
      ctx.save();
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Player Ship
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(p.squashX, p.squashY);

    // Invincibility flashing
    if (p.invincibleTimer > 0 && Math.floor(this.timeSurvived * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (p.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = this.runConfig.weapon.color;
      ctx.shadowColor = this.runConfig.weapon.color;
      ctx.shadowBlur = 10;
    }

    // Sleek Arrowhead Fighter Ship
    ctx.beginPath();
    ctx.moveTo(p.radius * 1.3, 0); // nose
    ctx.lineTo(-p.radius, p.radius * 0.9); // left wing
    ctx.lineTo(-p.radius * 0.4, 0); // engine thruster indent
    ctx.lineTo(-p.radius, -p.radius * 0.9); // right wing
    ctx.closePath();
    ctx.fill();

    // Inner cockpit core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Thruster exhaust flame
    const thrusterLength = 8 + Math.random() * 8;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-p.radius * 0.4, -3);
    ctx.lineTo(-p.radius * 0.4 - thrusterLength, 0);
    ctx.lineTo(-p.radius * 0.4, 3);
    ctx.closePath();
    ctx.fill();

    // Companion Drones
    if (this.droneCount > 0) {
      ctx.restore(); // restore to unrotated world coords
      ctx.save();
      for (let d = 0; d < this.droneCount; d++) {
        const droneAngle = this.timeSurvived * 3 + (d / this.droneCount) * Math.PI * 2;
        const dx = p.x + Math.cos(droneAngle) * 36;
        const dy = p.y + Math.sin(droneAngle) * 36;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // 9. Particles
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha);
      ctx.fillStyle = pt.color;
      if (pt.isGlow) {
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. Floating Damage & Notification Numbers
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = ft.isCritical ? 'bold 15px "JetBrains Mono", monospace' : '13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore(); // Final camera shake restore
  }
}
