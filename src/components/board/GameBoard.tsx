import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerField, HandZone } from './PlayerField';
import { PlayerActions } from './PlayerActions';
import { StadiumZone } from './StadiumZone';
import { CardImage } from '../card/CardImage';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useGameStore } from '../../store/gameStore';

interface GameBoardProps {
  perspective?: number; // qual jogador fica embaixo (0 ou 1)
}

export function GameBoard({ perspective = 0 }: GameBoardProps) {
  const players = useGameStore(s => s.players);
  const stadium = useGameStore(s => s.stadium);
  const currentTurn = useGameStore(s => s.currentTurn);
  const turnCount = useGameStore(s => s.turnCount);
  const gamePhase = useGameStore(s => s.gamePhase);
  const winner = useGameStore(s => s.winner);
  const { activeCardId, handleDragStart, handleDragEnd } = useDragAndDrop();

  // Encontrar a carta sendo arrastada pra renderizar no DragOverlay
  const findCard = (id: string | null) => {
    if (!id) return null;
    for (const p of players) {
      const inHand = p.hand.find(c => c.instanceId === id);
      if (inHand) return inHand;
      const inDeck = p.deck.find(c => c.instanceId === id);
      if (inDeck) return inDeck;
      const inDiscard = p.discard.find(c => c.instanceId === id);
      if (inDiscard) return inDiscard;
      const inPrizes = p.prizes.find(c => c.instanceId === id);
      if (inPrizes) return inPrizes;
      if (p.active?.card.instanceId === id) return p.active.card;
      for (const b of p.bench) {
        if (b?.card.instanceId === id) return b.card;
      }
    }
    return null;
  };
  const activeCard = findCard(activeCardId);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Perspectiva: bottom = eu, top = oponente
  const bottom = perspective;
  const top = perspective === 0 ? 1 : 0;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden lg:gap-1 lg:px-2">
        {/* Topo: Info do turno */}
        <div className="mb-1 flex items-center justify-center gap-2 rounded-lg bg-bg-card/50 px-2 py-1 text-[10px] sm:mb-2 sm:gap-4 sm:px-3 sm:py-1.5 sm:text-sm lg:text-base">
          <div className="flex items-center gap-1">
            <span className="text-text-secondary">Turno</span>
            <span className="rounded bg-accent-gold/20 px-1 py-0.5 font-bold tabular-nums text-accent-gold sm:px-1.5">{turnCount}</span>
          </div>
          <div className="h-3 w-px bg-bg-section lg:h-4" />
          <div className="flex items-center gap-1">
            <span className="text-text-secondary">Vez:</span>
            <span className="font-bold text-accent-green">{players[currentTurn].name}</span>
          </div>
        </div>

        {/* === OPONENTE (topo) === */}

        {/* Mão do oponente */}
        <div className="mb-0.5 flex w-full justify-center lg:mb-1">
          <HandZone playerId={top} cards={players[top].hand} isOpponent={true} />
        </div>

        {/* Menu do oponente */}
        <div className="mb-0.5 sm:mb-1">
          <PlayerActions playerId={top} />
        </div>

        {/* Campo do oponente */}
        <PlayerField playerId={top} isOpponent={true} hideHand={true} />

        {/* Estádio central */}
        <div className="flex w-full items-center gap-2 py-0.5 sm:gap-3 sm:py-1 lg:py-2">
          <div className="h-px flex-1 bg-bg-section" />
          <StadiumZone stadium={stadium} />
          <div className="h-px flex-1 bg-bg-section" />
        </div>

        {/* === JOGADOR (baixo) === */}

        {/* Campo do jogador */}
        <PlayerField playerId={bottom} isOpponent={false} hideHand={true} />

        {/* Menu do jogador */}
        <div className="mt-0.5 sm:mt-1">
          <PlayerActions playerId={bottom} />
        </div>

        {/* Mão do jogador */}
        <div className="mt-0.5 flex w-full justify-center lg:mt-1">
          <HandZone playerId={bottom} cards={players[bottom].hand} />
        </div>

        {/* Overlay de vitória */}
        <AnimatePresence>
          {gamePhase === 'ended' && winner !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="rounded-2xl bg-bg-card p-6 text-center shadow-2xl sm:p-8"
              >
                <h2 className="mb-2 text-2xl font-bold text-accent-gold sm:text-3xl">Vitoria!</h2>
                <p className="text-lg text-text-primary sm:text-xl">{players[winner].name} venceu!</p>
                <button
                  onClick={() => useGameStore.getState().resetGame()}
                  className="mt-4 rounded-xl bg-accent-green px-6 py-2.5 font-bold text-bg-primary sm:mt-6 sm:px-8 sm:py-3"
                >
                  Nova Partida
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-16 sm:w-20 lg:w-[100px] opacity-90 pointer-events-none">
            <CardImage
              src={activeCard.data.images.small}
              alt={activeCard.data.name}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
