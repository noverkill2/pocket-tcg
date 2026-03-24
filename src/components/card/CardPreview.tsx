import { motion, AnimatePresence } from 'framer-motion';
import type { PokemonTCGCard } from '../../types/card';

const energyColorMap: Record<string, string> = {
  Fire: 'bg-red-500', Water: 'bg-blue-500', Grass: 'bg-green-500',
  Lightning: 'bg-yellow-400', Psychic: 'bg-purple-500', Fighting: 'bg-orange-700',
  Darkness: 'bg-gray-700', Metal: 'bg-gray-400', Fairy: 'bg-pink-400',
  Colorless: 'bg-gray-300', Dragon: 'bg-amber-600',
};

interface CardPreviewProps {
  card: PokemonTCGCard | null;
  onClose: () => void;
}

export function CardPreview({ card, onClose }: CardPreviewProps) {
  if (!card) return null;

  const isPokemon = card.supertype === 'Pokémon';
  const isTrainer = card.supertype === 'Trainer';
  const hasDetails = isPokemon || isTrainer || (card.rules && card.rules.length > 0);

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`flex max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-bg-card shadow-2xl ${hasDetails ? 'lg:flex-row lg:max-w-3xl' : ''} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Imagem da carta */}
            <div className="flex shrink-0 items-center justify-center bg-black/30 p-3 sm:p-4">
              <img
                src={card.images.large}
                alt={card.name}
                className="max-h-[35vh] rounded-lg shadow-xl sm:max-h-[40vh] lg:max-h-[75vh] lg:w-[280px]"
                draggable={false}
              />
            </div>

            {/* Painel de informações */}
            {hasDetails && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-text-primary sm:text-lg">{card.name}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
                      <span>{card.supertype}</span>
                      {card.subtypes && <span>• {card.subtypes.join(', ')}</span>}
                      {card.hp && <span>• HP {card.hp}</span>}
                    </div>
                    {card.evolvesFrom && (
                      <span className="mt-1 inline-block rounded bg-bg-section px-2 py-0.5 text-[10px] text-text-secondary sm:text-xs">
                        Evolves from {card.evolvesFrom}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 rounded-lg bg-bg-section px-2.5 py-1 text-xs font-bold text-text-secondary hover:text-text-primary"
                  >
                    X
                  </button>
                </div>

                {/* Tipos */}
                {card.types && card.types.length > 0 && (
                  <div className="mb-3 flex items-center gap-1.5">
                    {card.types.map((type, i) => (
                      <span
                        key={i}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs ${energyColorMap[type] || 'bg-gray-500'}`}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/20 text-[7px]">{type[0]}</span>
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Abilities */}
                {card.abilities && card.abilities.length > 0 && (
                  <div className="mb-3">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Abilities</span>
                    {card.abilities.map((ability, i) => (
                      <div key={i} className="mb-1.5 rounded-lg bg-purple-600/10 p-2.5">
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
                )}

                {/* Attacks */}
                {card.attacks && card.attacks.length > 0 && (
                  <div className="mb-3">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Attacks</span>
                    {card.attacks.map((attack, i) => (
                      <div key={i} className="mb-1.5 rounded-lg bg-bg-section/60 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
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
                          {attack.damage && (
                            <span className="text-sm font-bold text-accent-red sm:text-base">{attack.damage}</span>
                          )}
                        </div>
                        {attack.text && (
                          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary sm:text-xs">{attack.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Rules (Trainers, Special Energy, etc) */}
                {card.rules && card.rules.length > 0 && (
                  <div className="mb-3">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">Rules</span>
                    {card.rules.map((rule, i) => (
                      <p key={i} className="mb-1 rounded-lg bg-bg-section/60 p-2 text-[10px] leading-relaxed text-text-secondary sm:text-xs">
                        {rule}
                      </p>
                    ))}
                  </div>
                )}

                {/* Weaknesses / Resistances / Retreat */}
                {isPokemon && (
                  <div className="flex flex-wrap items-center gap-4 rounded-lg bg-bg-section/40 p-2">
                    {card.weaknesses && card.weaknesses.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">Weakness:</span>
                        {card.weaknesses.map((w, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColorMap[w.type] || 'bg-gray-500'}`}>
                              {w.type[0]}
                            </span>
                            <span className="text-[9px] font-bold text-accent-red sm:text-[10px]">{w.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {card.resistances && card.resistances.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">Resistance:</span>
                        {card.resistances.map((r, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColorMap[r.type] || 'bg-gray-500'}`}>
                              {r.type[0]}
                            </span>
                            <span className="text-[9px] font-bold text-accent-green sm:text-[10px]">{r.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {card.retreatCost && card.retreatCost.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-semibold text-text-secondary sm:text-[10px]">Retreat:</span>
                        {card.retreatCost.map((type, i) => (
                          <span
                            key={i}
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColorMap[type] || 'bg-gray-500'}`}
                          >
                            {type[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Set info */}
                <div className="mt-3 flex items-center gap-2 text-[9px] text-text-secondary/60 sm:text-[10px]">
                  {card.set?.images?.symbol && (
                    <img src={card.set.images.symbol} alt={card.set.name} className="h-4 w-4" />
                  )}
                  <span>{card.set?.name}</span>
                  {card.rarity && <span>• {card.rarity}</span>}
                </div>
              </div>
            )}

            {/* Cartas sem detalhes (Energy básica etc) - só imagem + nome */}
            {!hasDetails && (
              <div className="p-3 text-center">
                <h3 className="text-base font-bold text-text-primary">{card.name}</h3>
                {card.types && <span className="text-xs text-text-secondary">{card.types.join(', ')}</span>}
                <button
                  onClick={onClose}
                  className="mt-2 block w-full rounded-lg bg-bg-section px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
