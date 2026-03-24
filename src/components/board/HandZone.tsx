import { DraggableCard } from '../card/DraggableCard';
import { Zone } from './Zone';
import { useGameStore } from '../../store/gameStore';
import type { Card } from '../../types/card';

interface HandZoneProps {
  playerId: number;
  cards: Card[];
  isOpponent?: boolean;
}

export function HandZone({ playerId, cards, isOpponent = false }: HandZoneProps) {
  const currentTurn = useGameStore(s => s.currentTurn);
  const mode = useGameStore(s => s.mode);
  const handRevealed = useGameStore(s => s.handRevealed);
  const revealedCardIds = useGameStore(s => s.revealedCardIds);
  const toggleRevealHand = useGameStore(s => s.toggleRevealHand);
  const toggleRevealCard = useGameStore(s => s.toggleRevealCard);

  // Local: mostra mão do jogador do turno
  // Online: sua mão sempre visível, oponente face down (exceto se revelou)
  const isMyHand = !isOpponent;
  const opponentRevealed = handRevealed[playerId];
  const opponentRevealedCards = revealedCardIds[playerId];

  const getCardFaceDown = (card: Card) => {
    if (mode === 'local') return currentTurn !== playerId;
    if (isMyHand) return false; // sua mão: sempre visível
    // Mão do oponente: face down, exceto se revelou tudo ou revelou essa carta
    if (opponentRevealed) return false;
    if (opponentRevealedCards.includes(card.instanceId)) return false;
    return true;
  };

  const label = isOpponent ? 'Oponente' : 'Mao';

  // Modo seleção: clicar na carta alterna reveal (só na sua mão, modo online)
  const canSelectToReveal = mode === 'online' && isMyHand;

  // Agrupar cartas: Pokémon, Trainer, Energy
  const grouped = {
    pokemon: cards.filter(c => c.data.supertype === 'Pokémon'),
    trainer: cards.filter(c => c.data.supertype === 'Trainer'),
    energy: cards.filter(c => c.data.supertype === 'Energy'),
  };
  const groups = [
    { key: 'pokemon', cards: grouped.pokemon, color: 'bg-accent-blue' },
    { key: 'trainer', cards: grouped.trainer, color: 'bg-accent-gold' },
    { key: 'energy', cards: grouped.energy, color: 'bg-accent-green' },
  ].filter(g => g.cards.length > 0);

  return (
    <Zone
      id={`player-${playerId}-hand`}
      zone="hand"
      playerId={playerId}
      className="w-full max-w-full overflow-hidden rounded-lg bg-bg-section/30 px-1 py-0.5 sm:px-2 sm:py-1 lg:px-4 lg:py-2"
    >
      <div className="flex w-full min-w-0 items-center gap-1">
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-text-secondary [writing-mode:vertical-lr] rotate-180 sm:text-[10px] lg:text-xs">
            {label} ({cards.length})
          </span>
          {/* Botão mostrar mão — só na sua mão, modo online */}
          {mode === 'online' && isMyHand && (
            <button
              onClick={() => toggleRevealHand(playerId)}
              className={`rounded px-1 py-0.5 text-[7px] font-bold sm:text-[9px] ${
                handRevealed[playerId]
                  ? 'bg-accent-gold/30 text-accent-gold'
                  : 'bg-bg-section text-text-secondary hover:text-text-primary'
              }`}
              title={handRevealed[playerId] ? 'Esconder mão' : 'Mostrar mão'}
            >
              {handRevealed[playerId] ? '👁' : '👁‍🗨'}
            </button>
          )}
        </div>
        <div
          className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto py-0.5 sm:gap-1 lg:gap-2"
          style={{
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x',
          }}
        >
          {cards.length === 0 ? (
            <span className="px-2 py-2 text-[9px] text-text-secondary/40 sm:px-4 sm:py-3 sm:text-xs">Sem cartas</span>
          ) : (
            groups.flatMap(g => g.cards).map((card) => {
              const faceDown = getCardFaceDown(card);
              const isRevealed = canSelectToReveal && (handRevealed[playerId] || revealedCardIds[playerId].includes(card.instanceId));
              return (
                <div key={card.instanceId} className="relative w-11 shrink-0 sm:w-12 lg:w-[72px]">
                  <DraggableCard
                    card={card}
                    zone="hand"
                    playerId={playerId}
                    faceDown={faceDown}
                    size="sm"
                  />
                  {canSelectToReveal && !handRevealed[playerId] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRevealCard(playerId, card.instanceId); }}
                      className={`absolute -top-1 -right-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] sm:h-4 sm:w-4 sm:text-[8px] ${
                        isRevealed
                          ? 'bg-accent-gold text-bg-primary'
                          : 'bg-bg-section/80 text-text-secondary hover:bg-accent-gold/50'
                      }`}
                      title={isRevealed ? 'Esconder carta' : 'Mostrar carta'}
                    >
                      {isRevealed ? '✓' : '○'}
                    </button>
                  )}
                  {isOpponent && !faceDown && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-gold px-1 text-[6px] font-bold text-bg-primary sm:text-[7px]">
                      Revelada
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Zone>
  );
}
