import { create } from 'zustand';
import type { PokemonTCGCard } from '../types/card';

export interface SavedDeck {
  id: string;
  name: string;
  cards: PokemonTCGCard[];
  createdAt: number;
  updatedAt: number;
}

interface DeckStore {
  decks: SavedDeck[];
  currentDeck: PokemonTCGCard[];
  currentDeckName: string;

  // Ações
  addCard: (card: PokemonTCGCard) => boolean;
  removeCard: (index: number) => void;
  clearDeck: () => void;
  setDeckName: (name: string) => void;
  saveDeck: () => void;
  loadDeck: (id: string) => void;
  deleteDeck: (id: string) => void;
  loadFromStorage: () => void;
  exportDeck: (id: string) => string | null;
  importDeck: (json: string) => boolean;
}

function isBasicEnergy(card: PokemonTCGCard): boolean {
  return card.supertype === 'Energy' && (card.subtypes?.includes('Basic') ?? false);
}

function countCopies(deck: PokemonTCGCard[], card: PokemonTCGCard): number {
  return deck.filter(c => c.name === card.name).length;
}

export function getDeckAddError(deck: PokemonTCGCard[], card: PokemonTCGCard): string | null {
  if (deck.length >= 60) return 'Deck ja tem 60 cartas!';
  if (!isBasicEnergy(card) && countCopies(deck, card) >= 4) return `Ja tem 4 copias de ${card.name}!`;
  return null;
}

function saveToLocalStorage(decks: SavedDeck[]) {
  localStorage.setItem('pocket-tcg-decks', JSON.stringify(decks));
}

function loadFromLocalStorage(): SavedDeck[] {
  const data = localStorage.getItem('pocket-tcg-decks');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  decks: [],
  currentDeck: [],
  currentDeckName: '',

  addCard: (card) => {
    const { currentDeck } = get();
    if (currentDeck.length >= 60) return false;
    if (!isBasicEnergy(card) && countCopies(currentDeck, card) >= 4) return false;

    set({ currentDeck: [...currentDeck, card] });
    return true;
  },

  removeCard: (index) => {
    set((state) => {
      const deck = [...state.currentDeck];
      deck.splice(index, 1);
      return { currentDeck: deck };
    });
  },

  clearDeck: () => {
    set({ currentDeck: [], currentDeckName: '' });
  },

  setDeckName: (name) => {
    set({ currentDeckName: name });
  },

  saveDeck: () => {
    const { currentDeck, currentDeckName, decks } = get();
    if (currentDeck.length === 0 || !currentDeckName) return;

    const newDeck: SavedDeck = {
      id: Date.now().toString(),
      name: currentDeckName,
      cards: currentDeck,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...decks, newDeck];
    set({ decks: updated });
    saveToLocalStorage(updated);
  },

  loadDeck: (id) => {
    const deck = get().decks.find(d => d.id === id);
    if (!deck) return;
    set({ currentDeck: deck.cards, currentDeckName: deck.name });
  },

  deleteDeck: (id) => {
    const updated = get().decks.filter(d => d.id !== id);
    set({ decks: updated });
    saveToLocalStorage(updated);
  },

  loadFromStorage: () => {
    set({ decks: loadFromLocalStorage() });
  },

  exportDeck: (id) => {
    const deck = get().decks.find(d => d.id === id);
    if (!deck) return null;
    return JSON.stringify({ name: deck.name, cards: deck.cards }, null, 2);
  },

  importDeck: (json) => {
    try {
      const data = JSON.parse(json);
      if (!data.name || !Array.isArray(data.cards)) return false;
      const newDeck: SavedDeck = {
        id: Date.now().toString(),
        name: data.name,
        cards: data.cards,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [...get().decks, newDeck];
      set({ decks: updated });
      saveToLocalStorage(updated);
      return true;
    } catch {
      return false;
    }
  },
}));
