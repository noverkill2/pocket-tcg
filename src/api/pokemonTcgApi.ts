import type { PokemonTCGCard, CardSet } from '../types/card';

const BASE_URL = 'https://api.pokemontcg.io/v2';

const headers: Record<string, string> = {};

const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY;
if (API_KEY) {
  headers['X-Api-Key'] = API_KEY;
}

export const PAGE_SIZE = 12;

interface ApiResponse<T> {
  data: T;
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export async function searchCards(
  query: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE
): Promise<ApiResponse<PokemonTCGCard[]>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: String(pageSize),
    select: 'id,name,supertype,subtypes,hp,types,attacks,abilities,weaknesses,resistances,retreatCost,rules,evolvesFrom,images,set,rarity',
    orderBy: 'name',
  });

  const response = await fetch(`${BASE_URL}/cards?${params}`, { headers });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function getCardById(id: string): Promise<PokemonTCGCard> {
  const response = await fetch(`${BASE_URL}/cards/${id}`, { headers });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const result = await response.json();
  return result.data;
}

export async function getSets(): Promise<CardSet[]> {
  const params = new URLSearchParams({
    select: 'id,name,series,releaseDate,images',
    orderBy: '-releaseDate',
  });

  const response = await fetch(`${BASE_URL}/sets?${params}`, { headers });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const result = await response.json();
  return result.data;
}
