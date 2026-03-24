import { v4 as uuidv4 } from 'uuid';
import type { PokemonTCGCard, Card } from '../types/card';

export function formatCardToInstance(data: PokemonTCGCard): Card {
  return {
    instanceId: uuidv4(),
    data,
  };
}

export function createDeckFromCards(cards: PokemonTCGCard[]): Card[] {
  return cards.map(formatCardToInstance);
}
