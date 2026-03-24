import type { PokemonTCGCard } from '../../types/card';

interface DeckStatsProps {
  cards: PokemonTCGCard[];
}

export function DeckStats({ cards }: DeckStatsProps) {
  const types = cards
    .filter(c => c.types)
    .flatMap(c => c.types!);

  const typeCounts = types.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const pokemonCount = cards.filter(c => c.supertype === 'Pokémon').length;
  const trainerCount = cards.filter(c => c.supertype === 'Trainer').length;
  const energyCount = cards.filter(c => c.supertype === 'Energy').length;

  return (
    <div className="rounded-lg bg-bg-section p-4">
      <h4 className="mb-3 font-bold text-text-primary">Estatísticas</h4>

      <div className="mb-3 flex gap-4 text-sm">
        <div className="text-center">
          <div className="text-lg font-bold text-accent-blue">{pokemonCount}</div>
          <div className="text-text-secondary">Pokemon</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent-gold">{trainerCount}</div>
          <div className="text-text-secondary">Trainer</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent-green">{energyCount}</div>
          <div className="text-text-secondary">Energy</div>
        </div>
      </div>

      {Object.keys(typeCounts).length > 0 && (
        <div>
          <h5 className="mb-1 text-xs font-semibold text-text-secondary">Tipos</h5>
          <div className="flex flex-wrap gap-1">
            {Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span
                  key={type}
                  className="rounded bg-bg-card px-2 py-0.5 text-xs text-text-secondary"
                >
                  {type}: {count}
                </span>
              ))}
          </div>
        </div>
      )}

      {cards.length === 60 && (
        <div className="mt-3 rounded bg-accent-green/20 p-2 text-center text-sm font-bold text-accent-green">
          Deck completo!
        </div>
      )}
      {cards.length > 60 && (
        <div className="mt-3 rounded bg-accent-red/20 p-2 text-center text-sm font-bold text-accent-red">
          Deck com {cards.length - 60} carta(s) a mais!
        </div>
      )}
    </div>
  );
}
