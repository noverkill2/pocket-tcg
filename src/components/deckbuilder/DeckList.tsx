import type { PokemonTCGCard } from '../../types/card';

interface DeckListProps {
  cards: PokemonTCGCard[];
  onRemoveCard: (index: number) => void;
}

interface GroupedCard {
  card: PokemonTCGCard;
  count: number;
  indices: number[];
}

function groupCards(cards: PokemonTCGCard[]): GroupedCard[] {
  const groups = new Map<string, GroupedCard>();
  cards.forEach((card, index) => {
    const existing = groups.get(card.id);
    if (existing) {
      existing.count++;
      existing.indices.push(index);
    } else {
      groups.set(card.id, { card, count: 1, indices: [index] });
    }
  });
  return Array.from(groups.values()).sort((a, b) => {
    const order = { 'Pokémon': 0, 'Trainer': 1, 'Energy': 2 };
    const aOrder = order[a.card.supertype as keyof typeof order] ?? 3;
    const bOrder = order[b.card.supertype as keyof typeof order] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.card.name.localeCompare(b.card.name);
  });
}

export function DeckList({ cards, onRemoveCard }: DeckListProps) {
  const grouped = groupCards(cards);

  const supertypeCounts = {
    pokemon: cards.filter(c => c.supertype === 'Pokémon').length,
    trainer: cards.filter(c => c.supertype === 'Trainer').length,
    energy: cards.filter(c => c.supertype === 'Energy').length,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary">Deck ({cards.length}/60)</h3>
        <div className="flex gap-2 text-xs text-text-secondary">
          <span>P: {supertypeCounts.pokemon}</span>
          <span>T: {supertypeCounts.trainer}</span>
          <span>E: {supertypeCounts.energy}</span>
        </div>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-bg-section">
        <div
          className="h-full rounded-full bg-accent-green transition-all"
          style={{ width: `${(cards.length / 60) * 100}%` }}
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {grouped.map((group) => (
          <div
            key={group.card.id}
            className="flex items-center justify-between border-b border-bg-section px-2 py-1.5 hover:bg-bg-section/50"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 text-xs font-bold text-accent-gold">
                {group.count}x
              </span>
              <span className="truncate text-sm text-text-primary">
                {group.card.name}
              </span>
            </div>
            <button
              onClick={() => onRemoveCard(group.indices[group.indices.length - 1])}
              className="shrink-0 rounded px-2 py-0.5 text-xs text-accent-red hover:bg-accent-red/10"
            >
              -
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
