import { useGameStore } from '../../store/gameStore';

interface DamageCounterProps {
  playerId: number;
  zone: 'active' | number;
  currentDamage: number;
}

export function DamageCounter({ playerId, zone, currentDamage }: DamageCounterProps) {
  const addDamage = useGameStore(s => s.addDamageCounter);
  const removeDamage = useGameStore(s => s.removeDamageCounter);

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button
        onClick={() => removeDamage(playerId, zone, 10)}
        className="flex h-5 w-5 items-center justify-center rounded bg-accent-green text-[10px] font-bold text-bg-primary active:scale-90 sm:h-7 sm:w-7 sm:rounded-lg sm:text-sm"
        disabled={currentDamage <= 0}
        aria-label="Remover 10 de dano"
      >
        -
      </button>
      <span className={`min-w-[1.5rem] text-center text-[10px] font-bold tabular-nums sm:min-w-[2rem] sm:text-sm ${currentDamage > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
        {currentDamage}
      </span>
      <button
        onClick={() => addDamage(playerId, zone, 10)}
        className="flex h-5 w-5 items-center justify-center rounded bg-accent-red text-[10px] font-bold text-white active:scale-90 sm:h-7 sm:w-7 sm:rounded-lg sm:text-sm"
        aria-label="Adicionar 10 de dano"
      >
        +
      </button>
    </div>
  );
}
