import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card } from '../../types/card';
import { CardImage } from '../card/CardImage';

interface ZoneOverlayProps {
  isOpen: boolean;
  title: string;
  cards: Card[];
  onClose: () => void;
  onCardClick?: (card: Card) => void;
  actionLabel?: string;
}

export function ZoneOverlay({ isOpen, title, cards, onClose, onCardClick, actionLabel }: ZoneOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState<{ id: string; time: number } | null>(null);

  const handleCardInteraction = (card: Card) => {
    if (!onCardClick || !actionLabel) return;

    const now = Date.now();
    if (lastTap && lastTap.id === card.instanceId && now - lastTap.time < 400) {
      // Double click/tap — mostra botão "Pegar"
      setSelectedId(prev => prev === card.instanceId ? null : card.instanceId);
      setLastTap(null);
    } else {
      setLastTap({ id: card.instanceId, time: now });
    }
  };

  const handlePick = (card: Card) => {
    if (!onCardClick) return;
    onCardClick(card);
    setSelectedId(null);
  };

  const handleClose = () => {
    setSelectedId(null);
    setLastTap(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="mx-4 max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-bg-card p-4 sm:p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <h3 className="text-base font-bold text-text-primary sm:text-lg">
                {title} ({cards.length})
              </h3>
              <button
                onClick={handleClose}
                className="rounded-lg bg-bg-section px-3 py-1 text-sm text-text-secondary hover:text-text-primary"
              >
                Fechar
              </button>
            </div>
            {onCardClick && actionLabel && (
              <p className="mb-2 text-[10px] text-text-secondary sm:text-xs">
                Toque duas vezes na carta para pegar
              </p>
            )}
            {cards.length === 0 ? (
              <p className="text-center text-text-secondary">Nenhuma carta</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6">
                {cards.map((card) => {
                  const isSelected = selectedId === card.instanceId;
                  return (
                    <div
                      key={card.instanceId}
                      className={`relative transition-transform ${onCardClick ? 'cursor-pointer' : ''} ${isSelected ? 'scale-105 ring-2 ring-accent-gold rounded-lg' : 'hover:scale-105'}`}
                      onClick={() => handleCardInteraction(card)}
                    >
                      <CardImage
                        src={card.data.images.small}
                        alt={card.data.name}
                      />
                      <p className="mt-0.5 truncate text-center text-[9px] text-text-secondary sm:mt-1 sm:text-xs">
                        {card.data.name}
                      </p>
                      {/* Botão "Pegar" aparece após double-click */}
                      <AnimatePresence>
                        {isSelected && onCardClick && actionLabel && (
                          <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            onClick={(e) => { e.stopPropagation(); handlePick(card); }}
                            className="absolute inset-x-0 bottom-5 mx-auto w-fit rounded-lg bg-accent-green px-3 py-1.5 text-xs font-bold text-bg-primary shadow-lg active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
                          >
                            {actionLabel}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
