import { useGameStore } from '../../store/gameStore';
import type { PokemonStatus } from '../../types/game';

interface StatusMarkerProps {
  playerId: number;
  zone: 'active' | number;
  currentStatus: PokemonStatus | null;
}

const statuses: { value: PokemonStatus; label: string; short: string; color: string }[] = [
  { value: 'poisoned', label: 'Envenenado', short: 'ENV', color: 'bg-purple-600' },
  { value: 'burned', label: 'Queimado', short: 'QUE', color: 'bg-orange-600' },
  { value: 'asleep', label: 'Dormindo', short: 'DOR', color: 'bg-blue-800' },
  { value: 'confused', label: 'Confuso', short: 'CON', color: 'bg-yellow-600' },
  { value: 'paralyzed', label: 'Paralisado', short: 'PAR', color: 'bg-yellow-400 text-black' },
];

export function StatusMarker({ playerId, zone, currentStatus }: StatusMarkerProps) {
  const setStatus = useGameStore(s => s.setStatus);

  return (
    <div className="grid grid-cols-2 gap-0.5 sm:gap-0.5">
      {statuses.map((s, i) => (
        <button
          key={s.value}
          onClick={() => setStatus(playerId, zone, currentStatus === s.value ? null : s.value)}
          className={`rounded px-1 py-0.5 text-[7px] font-bold transition-all active:scale-90 sm:px-1.5 sm:py-0.5 sm:text-[9px] ${
            // 5o item (PAR) centralizado — ocupa 2 colunas
            i === 4 ? 'col-span-2 mx-auto w-fit' : ''
          } ${
            currentStatus === s.value
              ? `${s.color} ring-1 ring-white shadow-lg text-white`
              : 'bg-bg-section text-text-secondary opacity-50 hover:opacity-100'
          }`}
          title={s.label}
          aria-label={s.label}
          aria-pressed={currentStatus === s.value}
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}
