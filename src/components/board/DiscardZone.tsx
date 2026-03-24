import { useState } from 'react';
import { Zone } from './Zone';
import { ZoneOverlay } from '../ui/ZoneOverlay';
import { useGameStore } from '../../store/gameStore';
import type { Card } from '../../types/card';

interface DiscardZoneProps {
  playerId: number;
  cards: Card[];
}

export function DiscardZone({ playerId, cards }: DiscardZoneProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const moveCard = useGameStore(s => s.moveCard);

  const handleRecoverCard = (card: Card) => {
    moveCard(card.instanceId, { playerId, zone: 'discard' }, { playerId, zone: 'hand' });
  };

  return (
    <>
      <Zone
        id={`player-${playerId}-discard`}
        zone="discard"
        playerId={playerId}
        label="Descarte"
        className="flex min-h-[40px] w-10 cursor-pointer flex-col items-center justify-center p-0.5 sm:min-h-[60px] sm:w-14 sm:p-1 lg:min-h-[100px] lg:w-[80px] lg:p-2"
      >
        <div
          onClick={() => cards.length > 0 && setShowOverlay(true)}
          className="active:scale-90"
        >
          {cards.length > 0 ? (
            <>
              <img
                src={cards[cards.length - 1].data.images.small}
                alt="Descarte"
                className="h-[36px] w-[26px] rounded object-cover shadow-md sm:h-[50px] sm:w-[36px] sm:rounded-lg lg:h-[80px] lg:w-[57px]"
                draggable={false}
              />
              <span className="mt-0.5 block text-center text-[9px] font-bold tabular-nums text-accent-red sm:text-xs lg:text-sm">
                {cards.length}
              </span>
            </>
          ) : (
            <div className="flex h-[36px] w-[26px] items-center justify-center rounded border border-dashed border-bg-section sm:h-[50px] sm:w-[36px] sm:rounded-lg sm:border-2 lg:h-[80px] lg:w-[57px]">
              <span className="text-[8px] text-text-secondary opacity-50 sm:text-[10px]">0</span>
            </div>
          )}
        </div>
      </Zone>
      <ZoneOverlay
        isOpen={showOverlay}
        title="Pilha de Descarte"
        cards={cards}
        onClose={() => setShowOverlay(false)}
        onCardClick={handleRecoverCard}
        actionLabel="Pegar"
      />
    </>
  );
}
