import type { PokemonTCGCard, CardSet } from '../types/card';
import rawCards from '../data/cards.json';
import rawSets from '../data/sets.json';

interface CompactCard {
  id: string;
  n: string;
  st: 'P' | 'T' | 'E';
  sub?: string[];
  hp?: string;
  t?: string[];
  ef?: string;
  atk?: { n: string; c: string[]; d: string; t: string }[];
  ab?: { n: string; t: string; tp: string }[];
  wk?: { type: string; value: string }[];
  rs?: { type: string; value: string }[];
  rc?: string[];
  ru?: string[];
  si: string;
  sn: string;
  is: string;
  il: string;
  r?: string;
}

const supertypeMap = { P: 'Pokémon', T: 'Trainer', E: 'Energy' } as const;

function expandCard(c: CompactCard): PokemonTCGCard {
  return {
    id: c.id,
    name: c.n,
    supertype: supertypeMap[c.st],
    subtypes: c.sub,
    hp: c.hp,
    types: c.t,
    evolvesFrom: c.ef,
    attacks: c.atk?.map(a => ({ name: a.n, cost: a.c, damage: a.d, text: a.t })),
    abilities: c.ab?.map(a => ({ name: a.n, text: a.t, type: a.tp })),
    weaknesses: c.wk,
    resistances: c.rs,
    retreatCost: c.rc,
    rules: c.ru,
    set: {
      id: c.si,
      name: c.sn,
      series: '',
      printedTotal: 0,
      total: 0,
      releaseDate: '',
      images: { symbol: '', logo: '' },
    },
    rarity: c.r,
    images: { small: c.is, large: c.il },
    number: '',
  };
}

let cardsCache: PokemonTCGCard[] | null = null;

function getCards(): PokemonTCGCard[] {
  if (!cardsCache) {
    cardsCache = (rawCards as CompactCard[]).map(expandCard);
  }
  return cardsCache;
}

export function getAllSets(): CardSet[] {
  return rawSets as CardSet[];
}

export interface LocalSearchParams {
  name?: string;
  supertype?: string;
  type?: string;
  setId?: string;
  page: number;
  pageSize: number;
}

export interface LocalSearchResult {
  cards: PokemonTCGCard[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export function searchCardsLocal(params: LocalSearchParams): LocalSearchResult {
  let cards = getCards();

  if (params.name) {
    const term = params.name.toLowerCase();
    cards = cards.filter(c => c.name.toLowerCase().includes(term));
  }
  if (params.supertype) {
    const st = params.supertype.toLowerCase();
    cards = cards.filter(c => c.supertype.toLowerCase().includes(st));
  }
  if (params.type) {
    cards = cards.filter(c => c.types?.includes(params.type!));
  }
  if (params.setId) {
    cards = cards.filter(c => c.set.id === params.setId);
  }

  const totalCount = cards.length;
  const totalPages = Math.ceil(totalCount / params.pageSize) || 1;
  const start = (params.page - 1) * params.pageSize;
  const paged = cards.slice(start, start + params.pageSize);

  return { cards: paged, totalCount, page: params.page, totalPages };
}

export function getTotalCardCount(): number {
  return getCards().length;
}
