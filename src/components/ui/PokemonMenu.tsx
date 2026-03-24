import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getEnergyType } from '../../engine/rules';
import { CardPreview } from '../card/CardPreview';
import type { ActivePokemon, PokemonStatus } from '../../types/game';

interface PokemonMenuProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: number;
  zone: 'active' | number;
  pokemon: ActivePokemon;
}

const statuses: { value: PokemonStatus; label: string; color: string }[] = [
  { value: 'poisoned', label: 'Envenenado', color: 'bg-purple-600' },
  { value: 'burned', label: 'Queimado', color: 'bg-orange-600' },
  { value: 'asleep', label: 'Dormindo', color: 'bg-blue-800' },
  { value: 'confused', label: 'Confuso', color: 'bg-yellow-600' },
  { value: 'paralyzed', label: 'Paralisado', color: 'bg-yellow-400 text-black' },
];

const energyColorMap: Record<string, string> = {
  Fire: 'bg-red-500', Water: 'bg-blue-500', Grass: 'bg-green-500',
  Lightning: 'bg-yellow-400', Psychic: 'bg-purple-500', Fighting: 'bg-orange-700',
  Darkness: 'bg-gray-700', Metal: 'bg-gray-400', Fairy: 'bg-pink-400',
  Colorless: 'bg-gray-300',
};

export function PokemonMenu({ isOpen, onClose, playerId, zone, pokemon }: PokemonMenuProps) {
  const setStatus = useGameStore(s => s.setStatus);
  const addDamage = useGameStore(s => s.addDamageCounter);
  const removeDamage = useGameStore(s => s.removeDamageCounter);
  const detachEnergy = useGameStore(s => s.detachEnergy);
  const addHpBoost = useGameStore(s => s.addHpBoost);
  const [customDamage, setCustomDamage] = useState('');
  const [showZoom, setShowZoom] = useState(false);

  const baseHp = parseInt(pokemon.card.data.hp || '0', 10);
  const totalHp = baseHp + (pokemon.hpBoost || 0);
  const remaining = totalHp - pokemon.damageCounters;
  const hpPct = totalHp > 0 ? Math.max(0, (remaining / totalHp) * 100) : 0;

  const handleCustomDamage = (add: boolean) => {
    const val = parseInt(customDamage, 10);
    if (isNaN(val) || val <= 0) return;
    if (add) addDamage(playerId, zone, val);
    else removeDamage(playerId, zone, val);
    setCustomDamage('');
  };

  // Contar energias vinculadas por tipo
  const attachedCounts: Record<string, number> = {};
  let totalAttached = 0;
  for (const e of pokemon.attachedEnergies) {
    const type = getEnergyType(e);
    attachedCounts[type] = (attachedCounts[type] || 0) + 1;
    totalAttached++;
  }

  // Verificar se tem energia suficiente pro ataque
  const canUseAttack = (cost: string[]): boolean => {
    if (!cost || cost.length === 0) return true;
    const needed: Record<string, number> = {};
    for (const c of cost) {
      needed[c] = (needed[c] || 0) + 1;
    }
    let colorlessNeeded = needed['Colorless'] || 0;
    delete needed['Colorless'];
    let usedSpecific = 0;
    for (const [type, count] of Object.entries(needed)) {
      if ((attachedCounts[type] || 0) < count) return false;
      usedSpecific += count;
    }
    // Colorless pode ser qualquer tipo
    return (totalAttached - usedSpecific) >= colorlessNeeded;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[90vh] w-full max-w-xs overflow-y-auto rounded-2xl bg-bg-card p-4 shadow-2xl sm:max-w-sm sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: imagem pequena + nome + HP + zoom */}
              <div className="mb-3 flex items-start gap-3">
                <button onClick={() => setShowZoom(true)} className="shrink-0 active:scale-95">
                  <img
                    src={pokemon.card.data.images.small}
                    alt={pokemon.card.data.name}
                    className="h-[60px] w-[43px] rounded-md object-cover shadow-md sm:h-[75px] sm:w-[54px]"
                    draggable={false}
                  />
                  <span className="mt-0.5 block text-center text-[7px] text-text-secondary sm:text-[8px]">Zoom</span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-primary sm:text-base">{pokemon.card.data.name}</h3>
                    <button onClick={onClose} className="rounded-lg bg-bg-section px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                      X
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    HP: <span className={remaining <= 0 ? 'font-bold text-accent-red' : 'font-bold text-text-primary'}>
                      {Math.max(0, remaining)}
                    </span>
                    <span className="text-text-secondary">/{totalHp}</span>
                    {pokemon.hpBoost > 0 && (
                      <span className="ml-1 text-accent-green">({baseHp}+{pokemon.hpBoost})</span>
                    )}
                  </div>
                  {/* Barra de HP */}
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-section">
                    <div
                      className={`h-full rounded-full transition-all ${
                        hpPct > 50 ? 'bg-accent-green' : hpPct > 25 ? 'bg-accent-gold' : 'bg-accent-red'
                      }`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Habilidades */}
              {pokemon.card.data.abilities && pokemon.card.data.abilities.length > 0 && (
                <div className="mb-3">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                    Abilities
                  </span>
                  <div className="flex flex-col gap-2">
                    {pokemon.card.data.abilities.map((ability, i) => (
                      <div key={i} className="rounded-lg bg-bg-section/60 p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-purple-600/30 px-1.5 py-0.5 text-[8px] font-bold uppercase text-purple-400 sm:text-[9px]">
                            {ability.type}
                          </span>
                          <span className="text-xs font-bold text-text-primary sm:text-sm">{ability.name}</span>
                        </div>
                        {ability.text && (
                          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary sm:text-xs">{ability.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ataques */}
              {pokemon.card.data.attacks && pokemon.card.data.attacks.length > 0 && (
                <div className="mb-3">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                    Attacks
                  </span>
                  <div className="flex flex-col gap-2">
                    {pokemon.card.data.attacks.map((attack, i) => {
                      const usable = canUseAttack(attack.cost);
                      return (
                        <div key={i} className={`rounded-lg p-2.5 ${usable ? 'bg-accent-green/10 ring-1 ring-accent-green/30' : 'bg-bg-section/60 opacity-60'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {/* Custo de energia */}
                              {attack.cost && attack.cost.map((type, j) => (
                                <span
                                  key={j}
                                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white shadow sm:h-5 sm:w-5 sm:text-[8px] ${energyColorMap[type] || 'bg-gray-500'}`}
                                >
                                  {type[0]}
                                </span>
                              ))}
                              <span className="ml-1 text-xs font-bold text-text-primary sm:text-sm">{attack.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {usable && (
                                <span className="rounded bg-accent-green/20 px-1 py-0.5 text-[7px] font-bold text-accent-green sm:text-[8px]">
                                  PODE USAR
                                </span>
                              )}
                              {attack.damage && (
                                <span className="text-sm font-bold text-accent-red sm:text-base">{attack.damage}</span>
                              )}
                            </div>
                          </div>
                          {attack.text && (
                            <p className="mt-1 text-[10px] leading-relaxed text-text-secondary sm:text-xs">{attack.text}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fraquezas e Resistências */}
              {((pokemon.card.data.weaknesses && pokemon.card.data.weaknesses.length > 0) || (pokemon.card.data.resistances && pokemon.card.data.resistances.length > 0)) && (
                <div className="mb-3 flex items-center gap-4">
                  {pokemon.card.data.weaknesses && pokemon.card.data.weaknesses.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">Weakness:</span>
                      {pokemon.card.data.weaknesses.map((w, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColorMap[w.type] || 'bg-gray-500'}`}>
                            {w.type[0]}
                          </span>
                          <span className="text-[9px] font-bold text-accent-red sm:text-[10px]">{w.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {pokemon.card.data.resistances && pokemon.card.data.resistances.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">Resistance:</span>
                      {pokemon.card.data.resistances.map((r, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColorMap[r.type] || 'bg-gray-500'}`}>
                            {r.type[0]}
                          </span>
                          <span className="text-[9px] font-bold text-accent-green sm:text-[10px]">{r.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custo de Recuo */}
              {pokemon.card.data.retreatCost && pokemon.card.data.retreatCost.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Recuo:</span>
                  <div className="flex items-center gap-1">
                    {pokemon.card.data.retreatCost.map((type, i) => (
                      <span
                        key={i}
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white shadow sm:h-6 sm:w-6 sm:text-[9px] ${energyColorMap[type] || 'bg-gray-500'}`}
                        title={type}
                      >
                        {type[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Editar HP (boost) */}
              <div className="mb-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                  Editar HP {pokemon.hpBoost > 0 && <span className="normal-case text-accent-green">(+{pokemon.hpBoost})</span>}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => addHpBoost(playerId, zone, -10)}
                    className="rounded-lg bg-accent-red/60 px-2.5 py-1.5 text-xs font-bold text-white active:scale-95 sm:text-sm"
                    disabled={pokemon.hpBoost <= 0}>-10</button>
                  <button onClick={() => addHpBoost(playerId, zone, 10)}
                    className="rounded-lg bg-accent-green px-2.5 py-1.5 text-xs font-bold text-bg-primary active:scale-95 sm:text-sm">+10</button>
                  <button onClick={() => addHpBoost(playerId, zone, 20)}
                    className="rounded-lg bg-accent-green/80 px-2.5 py-1.5 text-xs font-bold text-bg-primary active:scale-95 sm:text-sm">+20</button>
                  <button onClick={() => addHpBoost(playerId, zone, 30)}
                    className="rounded-lg bg-accent-green/60 px-2.5 py-1.5 text-xs font-bold text-bg-primary active:scale-95 sm:text-sm">+30</button>
                  <button onClick={() => addHpBoost(playerId, zone, 50)}
                    className="rounded-lg bg-accent-green/50 px-2.5 py-1.5 text-xs font-bold text-bg-primary active:scale-95 sm:text-sm">+50</button>
                  {pokemon.hpBoost > 0 && (
                    <button onClick={() => addHpBoost(playerId, zone, -pokemon.hpBoost)}
                      className="rounded-lg bg-bg-section px-2 py-1.5 text-[10px] font-bold text-text-secondary active:scale-95 sm:text-xs">
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Dano */}
              <div className="mb-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Dano ({pokemon.damageCounters})</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => removeDamage(playerId, zone, 10)}
                    className="rounded-lg bg-accent-green px-2.5 py-1.5 text-xs font-bold text-bg-primary active:scale-95 sm:text-sm" disabled={pokemon.damageCounters <= 0}>-10</button>
                  <button onClick={() => addDamage(playerId, zone, 10)}
                    className="rounded-lg bg-accent-red px-2.5 py-1.5 text-xs font-bold text-white active:scale-95 sm:text-sm">+10</button>
                  <button onClick={() => addDamage(playerId, zone, 50)}
                    className="rounded-lg bg-accent-red/70 px-2.5 py-1.5 text-xs font-bold text-white active:scale-95 sm:text-sm">+50</button>
                  <button onClick={() => addDamage(playerId, zone, 100)}
                    className="rounded-lg bg-accent-red/50 px-2.5 py-1.5 text-xs font-bold text-white active:scale-95 sm:text-sm">+100</button>
                  <div className="flex items-center gap-1">
                    <input type="number" value={customDamage} onChange={(e) => setCustomDamage(e.target.value)}
                      placeholder="..." className="w-12 rounded-lg bg-bg-section px-1.5 py-1.5 text-center text-xs text-text-primary outline-none sm:w-14" />
                    <button onClick={() => handleCustomDamage(true)} className="rounded bg-accent-red/60 px-1.5 py-1 text-[10px] font-bold text-white active:scale-95">+</button>
                    <button onClick={() => handleCustomDamage(false)} className="rounded bg-accent-green/60 px-1.5 py-1 text-[10px] font-bold text-bg-primary active:scale-95">-</button>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(playerId, zone, pokemon.status === s.value ? null : s.value)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 sm:text-sm ${
                        pokemon.status === s.value
                          ? `${s.color} ring-2 ring-white text-white shadow-lg`
                          : 'bg-bg-section text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energias */}
              {pokemon.attachedEnergies.length > 0 && (
                <div className="mb-3">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                    Energias ({pokemon.attachedEnergies.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {pokemon.attachedEnergies.map((e) => {
                      const type = getEnergyType(e);
                      return (
                        <div key={e.instanceId} className="flex items-center gap-1.5">
                          {/* Nome da energia */}
                          <div className={`flex flex-1 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white sm:text-sm ${energyColorMap[type] || 'bg-gray-500'}`}>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[9px]">{type[0]}</span>
                            {e.data.name}
                          </div>
                          {/* Pra mão */}
                          <button
                            onClick={() => detachEnergy(playerId, zone, e.instanceId, 'hand')}
                            className="flex h-7 items-center rounded-md bg-accent-blue/20 px-2 text-[9px] font-bold text-accent-blue active:scale-95 sm:text-xs"
                            title="Devolver pra mão"
                          >
                            Mão
                          </button>
                          {/* Pro descarte */}
                          <button
                            onClick={() => detachEnergy(playerId, zone, e.instanceId, 'discard')}
                            className="flex h-7 items-center rounded-md bg-accent-red/20 px-2 text-[9px] font-bold text-accent-red active:scale-95 sm:text-xs"
                            title="Enviar pro descarte"
                          >
                            Descarte
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tools */}
              {pokemon.attachedTools.length > 0 && (
                <div>
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                    Ferramentas ({pokemon.attachedTools.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pokemon.attachedTools.map((t) => (
                      <span key={t.instanceId} className="rounded-lg bg-accent-blue/20 px-2 py-1 text-xs font-bold text-accent-blue sm:text-sm">
                        {t.data.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom da carta (tela cheia) */}
      <CardPreview
        card={showZoom ? pokemon.card.data : null}
        onClose={() => setShowZoom(false)}
      />
    </>
  );
}
