import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { hasEnoughEnergy, canAttack } from '../../engine/rules';
import { useToast } from '../ui/Toast';
import type { Attack } from '../../types/card';

interface AttackPanelProps {
  playerId: number;
}

const energyColors: Record<string, string> = {
  Fire: 'bg-red-500',
  Water: 'bg-blue-500',
  Grass: 'bg-green-500',
  Lightning: 'bg-yellow-400',
  Psychic: 'bg-purple-500',
  Fighting: 'bg-orange-700',
  Darkness: 'bg-gray-800',
  Metal: 'bg-gray-400',
  Fairy: 'bg-pink-400',
  Dragon: 'bg-amber-600',
  Colorless: 'bg-gray-300',
};

function EnergyCost({ cost }: { cost: string[] }) {
  return (
    <div className="flex gap-0.5">
      {cost.map((type, i) => (
        <div
          key={i}
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white ${energyColors[type] || 'bg-gray-500'}`}
          title={type}
        >
          {type[0]}
        </div>
      ))}
    </div>
  );
}

export function AttackPanel({ playerId }: AttackPanelProps) {
  const [open, setOpen] = useState(false);
  const player = useGameStore(s => s.players[playerId]);
  const currentTurn = useGameStore(s => s.currentTurn);
  const turnPhase = useGameStore(s => s.turnPhase);
  const performAttack = useGameStore(s => s.performAttack);
  const { toast } = useToast();

  const pokemon = player.active;
  const isMyTurn = currentTurn === playerId;
  const canAct = isMyTurn && (turnPhase === 'main' || turnPhase === 'attack') && pokemon;

  if (!pokemon || !pokemon.card.data.attacks || pokemon.card.data.attacks.length === 0) return null;

  const handleAttack = (index: number, attack: Attack) => {
    if (!canAct) return;

    if (!canAttack(pokemon, pokemon.status)) {
      toast(`${pokemon.card.data.name} nao pode atacar (${pokemon.status})!`, 'error');
      return;
    }

    if (!hasEnoughEnergy(pokemon, attack)) {
      toast(`Energia insuficiente para ${attack.name}!`, 'error');
      return;
    }

    const result = performAttack(index);
    if (result) {
      toast(
        `${attack.name}: ${result.finalDamage} de dano!${result.knockedOut ? ' KNOCKOUT!' : ''}`,
        result.knockedOut ? 'success' : 'info'
      );
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Botão pra abrir */}
      <button
        onClick={() => canAct && setOpen(!open)}
        disabled={!canAct}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
          canAct
            ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30 active:scale-95'
            : 'bg-bg-section/50 text-text-secondary opacity-40'
        }`}
      >
        Atacar
      </button>

      {/* Popover com ataques */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop pra fechar */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl bg-bg-card border border-bg-section shadow-xl shadow-black/40 p-2 flex flex-col gap-1.5"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-1">Ataques</span>
              {pokemon.card.data.attacks.map((attack, i) => {
                const enough = hasEnoughEnergy(pokemon, attack);
                return (
                  <button
                    key={i}
                    onClick={() => handleAttack(i, attack)}
                    disabled={!enough}
                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-all ${
                      !enough
                        ? 'opacity-30'
                        : 'hover:bg-accent-red/10 active:scale-[0.98]'
                    }`}
                  >
                    <EnergyCost cost={attack.cost} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-text-primary truncate">{attack.name}</span>
                        {attack.damage && (
                          <span className="shrink-0 text-xs font-bold text-accent-red">{attack.damage}</span>
                        )}
                      </div>
                      {attack.text && (
                        <p className="text-[9px] leading-tight text-text-secondary line-clamp-2 mt-0.5">{attack.text}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
