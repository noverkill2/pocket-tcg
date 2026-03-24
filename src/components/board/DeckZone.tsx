import { useState, useRef } from 'react';
import { Zone } from './Zone';
import { ZoneOverlay } from '../ui/ZoneOverlay';
import { useGameStore } from '../../store/gameStore';
import { useToast } from '../ui/Toast';

const CARD_BACK = 'https://images.pokemontcg.io/back.png';

interface DeckZoneProps {
  playerId: number;
  cardCount: number;
}

export function DeckZone({ playerId, cardCount }: DeckZoneProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const drawCard = useGameStore(s => s.drawCard);
  const moveCard = useGameStore(s => s.moveCard);
  const peekZone = useGameStore(s => s.peekZone);
  const { toast } = useToast();
  const cards = peekZone(playerId, 'deck');
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = () => {
    pressTimer.current = setTimeout(() => {
      setShowOverlay(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleClick = () => {
    if (cardCount > 0) {
      drawCard(playerId);
    } else {
      toast('Deck vazio!', 'error');
    }
  };

  const handlePickFromDeck = (card: import('../../types/card').Card) => {
    moveCard(card.instanceId, { playerId, zone: 'deck' }, { playerId, zone: 'hand' });
  };

  return (
    <>
      <Zone
        id={`player-${playerId}-deck`}
        zone="deck"
        playerId={playerId}
        label="Deck"
        className="flex min-h-[40px] w-10 flex-col items-center justify-center p-0.5 sm:min-h-[60px] sm:w-14 sm:p-1 lg:min-h-[100px] lg:w-[80px] lg:p-2"
      >
        <div
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="relative cursor-pointer active:scale-90"
        >
          {cardCount > 0 ? (
            <>
              <img src={CARD_BACK} alt="Deck" className="h-[36px] w-[26px] rounded object-cover shadow-md sm:h-[50px] sm:w-[36px] sm:rounded-lg lg:h-[80px] lg:w-[57px]" draggable={false} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tabular-nums drop-shadow-md sm:text-sm lg:text-lg">
                {cardCount}
              </span>
            </>
          ) : (
            <div className="flex h-[36px] w-[26px] items-center justify-center rounded border border-dashed border-bg-section sm:h-[50px] sm:w-[36px] sm:rounded-lg sm:border-2 lg:h-[80px] lg:w-[57px]">
              <span className="text-[8px] text-text-secondary opacity-50 sm:text-[10px]">0</span>
            </div>
          )}
        </div>
        <span className="mt-0.5 text-[7px] text-text-secondary sm:text-[9px]">Segure: buscar</span>
      </Zone>
      <ZoneOverlay
        isOpen={showOverlay}
        title="Deck"
        cards={cards}
        onClose={() => setShowOverlay(false)}
        onCardClick={handlePickFromDeck}
        actionLabel="Pegar"
      />
    </>
  );
}
