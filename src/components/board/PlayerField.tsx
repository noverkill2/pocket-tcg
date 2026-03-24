import { useState, useEffect } from 'react';
import { ActiveZone } from './ActiveZone';
import { BenchZone } from './BenchZone';
import { DeckZone } from './DeckZone';
import { PrizeZone } from './PrizeZone';
import { DiscardZone } from './DiscardZone';
import { HandZone } from './HandZone';
import { useGameStore } from '../../store/gameStore';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

interface PlayerFieldProps {
  playerId: number;
  isOpponent?: boolean;
  hideHand?: boolean;
}

export function PlayerField({ playerId, isOpponent = false, hideHand = false }: PlayerFieldProps) {
  const player = useGameStore(s => s.players[playerId]);
  const isDesktop = useIsDesktop();

  return (
    <div className="flex w-full flex-col items-center gap-0.5 sm:gap-1">
      {!hideHand && isOpponent && (
        <HandZone playerId={playerId} cards={player.hand} isOpponent={true} />
      )}

      {isDesktop ? (
        /* Desktop (lg+): horizontal row */
        <div className="flex w-full items-center justify-center gap-4 px-4">
          <PrizeZone playerId={playerId} prizes={player.prizes} />
          <DeckZone playerId={playerId} cardCount={player.deck.length} />
          {isOpponent ? (
            <>
              <BenchZone playerId={playerId} />
              <ActiveZone playerId={playerId} isOpponent={isOpponent} />
            </>
          ) : (
            <>
              <ActiveZone playerId={playerId} isOpponent={isOpponent} />
              <BenchZone playerId={playerId} />
            </>
          )}
          <DiscardZone playerId={playerId} cards={player.discard} />
        </div>
      ) : (
        /* Mobile: side cards na lateral, ativo + bench no centro */
        <div className="flex w-full items-center justify-center gap-1.5 px-1 sm:gap-2 sm:px-2">
          {isOpponent ? (
            <>
              <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                <PrizeZone playerId={playerId} prizes={player.prizes} />
                <DeckZone playerId={playerId} cardCount={player.deck.length} />
                <DiscardZone playerId={playerId} cards={player.discard} />
              </div>
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <BenchZone playerId={playerId} />
                <ActiveZone playerId={playerId} isOpponent={isOpponent} />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <ActiveZone playerId={playerId} isOpponent={isOpponent} />
                <BenchZone playerId={playerId} />
              </div>
              <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                <PrizeZone playerId={playerId} prizes={player.prizes} />
                <DeckZone playerId={playerId} cardCount={player.deck.length} />
                <DiscardZone playerId={playerId} cards={player.discard} />
              </div>
            </>
          )}
        </div>
      )}

      {!hideHand && !isOpponent && (
        <HandZone playerId={playerId} cards={player.hand} isOpponent={false} />
      )}
    </div>
  );
}

export { HandZone };
