import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zone } from './Zone';
import { useGameStore } from '../../store/gameStore';
import type { Card } from '../../types/card';

const CARD_BACK = 'https://images.pokemontcg.io/back.png';

interface PrizeZoneProps {
  playerId: number;
  prizes: Card[];
}

export function PrizeZone({ playerId, prizes }: PrizeZoneProps) {
  const [showModal, setShowModal] = useState(false);
  const moveCard = useGameStore(s => s.moveCard);

  const handleTakePrize = (card: Card) => {
    moveCard(card.instanceId, { playerId, zone: 'prizes' }, { playerId, zone: 'hand' });
    if (prizes.length <= 1) setShowModal(false);
  };

  return (
    <>
      <Zone
        id={`player-${playerId}-prizes`}
        zone="prizes"
        playerId={playerId}
        label="Premios"
        className="flex min-h-[40px] w-10 cursor-pointer flex-col items-center justify-center p-0.5 sm:min-h-[60px] sm:w-14 sm:p-1 lg:min-h-[100px] lg:w-[80px] lg:p-2"
      >
        <div onClick={() => prizes.length > 0 && setShowModal(true)} className="active:scale-90">
          {prizes.length > 0 ? (
            <>
              <img src={CARD_BACK} alt="Premio" className="h-[36px] w-[26px] rounded object-cover shadow-md sm:h-[50px] sm:w-[36px] sm:rounded-lg lg:h-[80px] lg:w-[57px]" draggable={false} />
              <span className="mt-0.5 block text-center text-[9px] font-bold tabular-nums text-accent-gold sm:text-xs lg:text-sm">
                {prizes.length}/6
              </span>
            </>
          ) : (
            <div className="flex h-[36px] w-[26px] items-center justify-center rounded border border-dashed border-bg-section sm:h-[50px] sm:w-[36px] sm:rounded-lg sm:border-2 lg:h-[80px] lg:w-[57px]">
              <span className="text-[8px] text-text-secondary opacity-50 sm:text-[10px]">0</span>
            </div>
          )}
        </div>
      </Zone>

      {/* Modal de prêmios */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs rounded-2xl bg-bg-card p-4 shadow-2xl sm:max-w-sm sm:p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary sm:text-base">Cartas Premio ({prizes.length}/6)</h3>
                <button onClick={() => setShowModal(false)} className="rounded-lg bg-bg-section px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
                  X
                </button>
              </div>
              <p className="mb-3 text-[10px] text-text-secondary sm:text-xs">Toque em uma carta para pegar</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {prizes.map((card, i) => (
                  <button
                    key={card.instanceId}
                    onClick={() => handleTakePrize(card)}
                    className="flex flex-col items-center gap-1 rounded-lg bg-bg-section p-2 transition-all hover:bg-accent-gold/20 active:scale-95"
                  >
                    <img src={CARD_BACK} alt={`Premio #${i + 1}`} className="h-[60px] w-[43px] rounded-md object-cover shadow sm:h-[80px] sm:w-[57px] sm:rounded-lg" draggable={false} />
                    <span className="text-[9px] font-bold text-text-secondary sm:text-[10px]">#{i + 1}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
