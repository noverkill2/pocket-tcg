import { useState } from 'react';
import { CardImage } from '../card/CardImage';
import { CardPreview } from '../card/CardPreview';
import type { PokemonTCGCard } from '../../types/card';

interface CardGridProps {
  cards: PokemonTCGCard[];
  isLoading: boolean;
  isFetching?: boolean;
  onAddCard: (card: PokemonTCGCard) => void;
}

export function CardGrid({ cards, isLoading, isFetching = false, onAddCard }: CardGridProps) {
  const [previewCard, setPreviewCard] = useState<PokemonTCGCard | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-blue border-t-transparent" />
        <span className="text-sm text-text-secondary">Buscando cartas...</span>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-text-secondary">Nenhuma carta encontrada</p>
        <p className="mt-1 text-sm text-text-secondary/60">Tente alterar os filtros de busca</p>
      </div>
    );
  }

  return (
    <>
      {isFetching && !isLoading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          <span className="text-xs text-text-secondary">Carregando...</span>
        </div>
      )}
      <div className={`grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 ${isFetching && !isLoading ? 'opacity-50' : ''} transition-opacity`}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="group relative cursor-pointer overflow-hidden rounded-lg transition-transform active:scale-95 hover:scale-105"
          >
            <div onClick={() => onAddCard(card)}>
              <CardImage src={card.images.small} alt={card.name} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:h-7 sm:w-7"
              title="Ver detalhes"
              aria-label={`Ver detalhes de ${card.name}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <p className="mt-1 truncate text-center text-xs text-text-secondary">
              {card.name}
            </p>
          </div>
        ))}
      </div>
      <CardPreview card={previewCard} onClose={() => setPreviewCard(null)} />
    </>
  );
}
