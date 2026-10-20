import React, { useState } from 'react';
import { 
  Shield, 
  Zap, 
  Wind, 
  ChevronsRight, 
  Magnet, 
  BatteryCharging, 
  HeartPulse, 
  X, 
  Sparkles, 
  Download, 
  Upload, 
  Check, 
  AlertCircle,
  Trophy
} from 'lucide-react';
import { EVOLUTION_CATALOG, progression } from '../game/progressionManager';
import { PlayerEvolution } from '../types/progression';
import { sound } from '../audio/soundManager';

interface EvolutionHangarModalProps {
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const EvolutionHangarModal: React.FC<EvolutionHangarModalProps> = ({
  onClose,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'stats' | 'backup'>('upgrades');
  const [profile, setProfile] = useState(() => progression.getProfile());
  const [copiedCode, setCopiedCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const getIcon = (id: keyof PlayerEvolution) => {
    switch (id) {
      case 'hullLevel': return <Shield className="w-5 h-5 text-emerald-400" />;
      case 'damageLevel': return <Zap className="w-5 h-5 text-sky-400" />;
      case 'speedLevel': return <Wind className="w-5 h-5 text-indigo-400" />;
      case 'dashLevel': return <ChevronsRight className="w-5 h-5 text-cyan-400" />;
      case 'magnetLevel': return <Magnet className="w-5 h-5 text-purple-400" />;
      case 'overdriveLevel': return <BatteryCharging className="w-5 h-5 text-amber-400" />;
      case 'reviveLevel': return <HeartPulse className="w-5 h-5 text-rose-400" />;
      default: return <Sparkles className="w-5 h-5 text-sky-400" />;
    }
  };

  const handlePurchase = (id: keyof PlayerEvolution) => {
    const success = progression.purchaseUpgrade(id);
    if (success) {
      sound.playUpgradeFanfare();
      setProfile({ ...progression.getProfile() });
      onProfileUpdated();
    } else {
      sound.playHit();
    }
  };

  const handleExport = () => {
    const code = progression.exportSaveCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }).catch(() => {
      // Fallback prompt
      window.prompt('Copiez ce code de sauvegarde sécurisé :', code);
    });
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const ok = progression.importSaveCode(importText);
    if (ok) {
      sound.playUpgradeFanfare();
      setProfile({ ...progression.getProfile() });
      setImportStatus('Sauvegarde restaurée avec succès !');
      setImportText('');
      onProfileUpdated();
      setTimeout(() => setImportStatus(null), 3000);
    } else {
      sound.playHit();
      setImportStatus('Erreur : Code de sauvegarde invalide.');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 select-none animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Hangar d'Évolution Permanente
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>AMÉLIORATIONS PERSISTANTES</span>
                <span aria-hidden="true">·</span>
                <span>SAUVEGARDE LOCALE ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Shards Currency Counter & Close */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-sky-500/30 text-sky-300 font-mono text-sm shadow-[0_0_15px_rgba(56,189,248,0.15)]">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="font-bold tabular-nums">{profile.quantumShards.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">CRISTAUX</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-slate-900">
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'upgrades'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Modules du Vaisseau
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Statistiques Globales
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Sauvegarde & Export
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grow">
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {EVOLUTION_CATALOG.map((item) => {
                const currentLvl = profile.evolutions[item.id];
                const isMax = currentLvl >= item.maxLevel;
                const cost = isMax ? 0 : item.costs[currentLvl];
                const canAfford = !isMax && profile.quantumShards >= cost;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            {getIcon(item.id)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">{item.name}</h3>
                            <div className="text-[11px] font-mono text-slate-500">
                              NIVEAU <span className="text-sky-400 font-bold tabular-nums">{currentLvl}</span> / {item.maxLevel}
                            </div>
                          </div>
                        </div>

                        {/* Level Progress Pip Bars */}
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: item.maxLevel }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2.5 h-1.5 rounded-full ${
                                idx < currentLvl ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                        {item.description}
                      </p>

                      <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60 mb-4">
                        EFFET : <span className="text-sky-300 font-semibold">{item.effectSummary(currentLvl)}</span>
                      </div>
                    </div>

                    {/* Purchase Action Button */}
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={isMax || !canAfford}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                          : canAfford
                          ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 active:scale-95 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                          : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? (
                        <span>NIVEAU MAXIMAL ATTEINT</span>
                      ) : (
                        <>
                          <span>AMÉLIORER POUR</span>
                          <span className="font-extrabold tabular-nums ml-1">{cost} CRISTAUX</span>
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center mb-4">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Archives de Carrière Rogue</h3>
                <p className="text-xs text-slate-400">Progression globale enregistrée sur votre profil</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">MEILLEUR SCORE</div>
                  <div className="text-base font-bold text-white tabular-nums">{profile.highScore.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">VAGUE MAXIMALE</div>
                  <div className="text-base font-bold text-sky-400 tabular-nums">Vague {profile.highestWave}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">PARTIES LANCÉES</div>
                  <div className="text-base font-bold text-slate-200 tabular-nums">{profile.totalRuns}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">ENNEMIS VAINCUS</div>
                  <div className="text-base font-bold text-emerald-400 tabular-nums">{profile.totalKills.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">ÉLITES ANÉANTIS</div>
                  <div className="text-base font-bold text-amber-400 tabular-nums">{profile.totalElitesKilled.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 mb-1">CRISTAUX GAGNÉS</div>
                  <div className="text-base font-bold text-sky-300 tabular-nums">{profile.totalShardsEarned.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Download className="w-4 h-4 text-sky-400" />
                  <span>Exporter votre Sauvegarde</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Copiez votre code de sauvegarde pour le conserver sur un autre appareil ou après avoir vidé votre navigateur.
                </p>
                <button
                  onClick={handleExport}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                  <span>{copiedCode ? 'Code copié dans le presse-papier !' : 'Copier le code de sauvegarde'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Restaurer une Sauvegarde</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Collez un code de sauvegarde exporté précédemment pour restaurer instantanément votre vaisseau et vos cristaux.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Collez votre code de sauvegarde ici..."
                  className="w-full h-20 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                {importStatus && (
                  <div className="text-xs font-mono text-sky-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{importStatus}</span>
                  </div>
                )}
                <button
                  onClick={handleImport}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Restaurer la progression</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Toutes les évolutions achetées sont actives pour toutes vos futures parties</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Fermer le Hangar
          </button>
        </div>
      </div>
    </div>
  );
};
