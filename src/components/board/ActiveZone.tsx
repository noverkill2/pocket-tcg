import { useState } from 'react';
import { Zone } from './Zone';
import { DraggableCard } from '../card/DraggableCard';
import { PokemonMenu } from '../ui/PokemonMenu';
import { useGameStore } from '../../store/gameStore';

interface ActiveZoneProps {
  playerId: number;
  isOpponent?: boolean;
}

const statusIcons: Record<string, { short: string; color: string }> = {
  poisoned: { short: 'ENV', color: 'bg-purple-600' },
  burned: { short: 'QUE', color: 'bg-orange-600' },
  asleep: { short: 'DOR', color: 'bg-blue-800' },
  confused: { short: 'CON', color: 'bg-yellow-600' },
  paralyzed: { short: 'PAR', color: 'bg-yellow-400 text-black' },
};

export function ActiveZone({ playerId }: ActiveZoneProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Ler diretamente do store — selecionar o player inteiro pra garantir re-render
  const player = useGameStore(s => s.players[playerId]);
  const pokemon = player.active;

  const baseHp = parseInt(pokemon?.card.data.hp || '0', 10);
  const hp = baseHp + (pokemon?.hpBoost || 0);
  const remaining = hp - (pokemon?.damageCounters || 0);
  const hpPct = hp > 0 ? Math.max(0, (remaining / hp) * 100) : 0;

  return (
    <>
      <Zone
        id={`player-${playerId}-active`}
        zone="active"
        playerId={playerId}
        label="Ativo"
        className="flex min-h-[100px] w-[75px] flex-col items-center justify-center gap-0.5 p-1 sm:min-h-[130px] sm:w-[100px] sm:gap-1 sm:p-1.5 lg:min-h-[180px] lg:w-[140px] lg:gap-1.5 lg:p-2"
      >
        {pokemon ? (
          <div className="relative flex flex-col items-center gap-0.5">
            {/* Carta — toque abre menu */}
            <div onClick={() => setMenuOpen(true)} className="cursor-pointer">
              <DraggableCard
                card={pokemon.card}
                zone="active"
                playerId={playerId}
                size="lg"
              />
            </div>

            {/* HP bar compacta */}
            <div className="w-full">
              <div className="h-1 w-full overflow-hidden rounded-full bg-bg-section sm:h-1.5 lg:h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    hpPct > 50 ? 'bg-accent-green' : hpPct > 25 ? 'bg-accent-gold' : 'bg-accent-red'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="mt-px text-center text-[8px] font-bold tabular-nums sm:text-[10px] lg:text-xs">
                <span className={remaining <= 0 ? 'text-accent-red' : 'text-text-secondary'}>
                  {Math.max(0, remaining)}/{hp}
                </span>
              </div>
            </div>

            {/* Badges compactos: status + dano + energias */}
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              {pokemon.status && (
                <span className={`rounded px-1 py-px text-[7px] font-bold text-white sm:text-[8px] lg:px-1.5 lg:py-0.5 lg:text-[10px] ${statusIcons[pokemon.status]?.color || 'bg-gray-500'}`}>
                  {statusIcons[pokemon.status]?.short}
                </span>
              )}
              {pokemon.damageCounters > 0 && (
                <span className="rounded bg-accent-red/80 px-1 py-px text-[7px] font-bold text-white sm:text-[8px] lg:px-1.5 lg:py-0.5 lg:text-[10px]">
                  {pokemon.damageCounters}
                </span>
              )}
              {pokemon.attachedEnergies.length > 0 && (
                <span className="rounded bg-accent-blue/60 px-1 py-px text-[7px] font-bold text-white sm:text-[8px] lg:px-1.5 lg:py-0.5 lg:text-[10px]">
                  {pokemon.attachedEnergies.length}E
                </span>
              )}
              {pokemon.attachedTools.length > 0 && (
                <span className="rounded bg-accent-gold/60 px-1 py-px text-[7px] font-bold text-bg-primary sm:text-[8px] lg:px-1.5 lg:py-0.5 lg:text-[10px]">
                  {pokemon.attachedTools.length}T
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-text-secondary opacity-50">Vazio</span>
        )}
      </Zone>

      {pokemon && (
        <PokemonMenu
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          playerId={playerId}
          zone="active"
          pokemon={pokemon}
        />
      )}
    </>
  );
}
