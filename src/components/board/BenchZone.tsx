import { useState } from 'react';
import { Zone } from './Zone';
import { DraggableCard } from '../card/DraggableCard';
import { PokemonMenu } from '../ui/PokemonMenu';
import { useGameStore } from '../../store/gameStore';

const statusIcons: Record<string, { short: string; color: string }> = {
  poisoned: { short: 'ENV', color: 'bg-purple-600' },
  burned: { short: 'QUE', color: 'bg-orange-600' },
  asleep: { short: 'DOR', color: 'bg-blue-800' },
  confused: { short: 'CON', color: 'bg-yellow-600' },
  paralyzed: { short: 'PAR', color: 'bg-yellow-400 text-black' },
};

interface BenchZoneProps {
  playerId: number;
}

export function BenchZone({ playerId }: BenchZoneProps) {
  // Ler diretamente do store — selecionar o player inteiro pra garantir re-render
  const player = useGameStore(s => s.players[playerId]);
  const bench = player.bench;
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const menuPokemon = menuIndex !== null ? bench[menuIndex] : null;

  return (
    <>
      <div
        className="flex max-w-full gap-0.5 overflow-x-auto overflow-y-hidden sm:gap-1 lg:gap-2"
        style={{
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'none',
          scrollbarWidth: 'thin',
          touchAction: 'pan-x',
        }}
      >
        {bench.map((pokemon, i) => {
          const baseHp = parseInt(pokemon?.card.data.hp || '0', 10);
          const hp = baseHp + (pokemon?.hpBoost || 0);
          const remaining = hp - (pokemon?.damageCounters || 0);
          const hpPct = hp > 0 ? Math.max(0, (remaining / hp) * 100) : 0;

          return (
            <Zone
              key={i}
              id={`player-${playerId}-bench-${i}`}
              zone="bench"
              playerId={playerId}
              index={i}
              className="flex w-[54px] shrink-0 flex-col items-center justify-start gap-0.5 p-0.5 sm:w-[72px] sm:gap-0.5 sm:p-1 lg:w-[100px] lg:gap-1 lg:p-1.5"
            >
              {pokemon ? (
                <div className="flex flex-col items-center gap-0.5" onClick={() => setMenuIndex(i)}>
                  <DraggableCard
                    card={pokemon.card}
                    zone={`bench-${i}`}
                    playerId={playerId}
                    index={i}
                    size="sm"
                  />
                  {/* HP bar mini */}
                  <div className="w-full">
                    <div className="h-0.5 w-full overflow-hidden rounded-full bg-bg-section sm:h-1 lg:h-1.5">
                      <div
                        className={`h-full rounded-full ${
                          hpPct > 50 ? 'bg-accent-green' : hpPct > 25 ? 'bg-accent-gold' : 'bg-accent-red'
                        }`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <div className="text-center text-[6px] tabular-nums text-text-secondary sm:text-[8px] lg:text-[10px]">
                      {Math.max(0, remaining)}/{hp}
                    </div>
                  </div>
                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-px">
                    {pokemon.status && (
                      <span className={`rounded px-0.5 text-[6px] font-bold text-white sm:text-[7px] ${statusIcons[pokemon.status]?.color || 'bg-gray-500'}`}>
                        {statusIcons[pokemon.status]?.short}
                      </span>
                    )}
                    {pokemon.attachedEnergies.length > 0 && (
                      <span className="rounded bg-accent-blue/60 px-0.5 text-[6px] font-bold text-white sm:text-[7px]">
                        {pokemon.attachedEnergies.length}E
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-[7px] text-text-secondary opacity-30 sm:text-[9px] lg:text-xs">B{i + 1}</span>
              )}
            </Zone>
          );
        })}
      </div>

      {menuIndex !== null && menuPokemon && (
        <PokemonMenu
          isOpen={true}
          onClose={() => setMenuIndex(null)}
          playerId={playerId}
          zone={menuIndex}
          pokemon={menuPokemon}
        />
      )}
    </>
  );
}
