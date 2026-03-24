import type { Card } from './card';

export type PokemonStatus = 'poisoned' | 'burned' | 'asleep' | 'confused' | 'paralyzed';
export type ZoneType = 'deck' | 'hand' | 'active' | 'bench' | 'prizes' | 'discard' | 'stadium';
export type GamePhase = 'setup' | 'playing' | 'ended';
export type TurnPhase = 'draw' | 'main' | 'attack' | 'between_turns';

export interface ActivePokemon {
  card: Card;
  attachedEnergies: Card[];
  attachedTools: Card[];
  damageCounters: number;
  status: PokemonStatus | null;
  previousStage: Card | null;
  turnPlayed: number;
  hpBoost: number; // HP extra de efeitos (ex: +30 HP de uma carta)
}

export interface PlayerState {
  id: string;
  name: string;
  deck: Card[];
  hand: Card[];
  active: ActivePokemon | null;
  bench: (ActivePokemon | null)[];
  prizes: Card[];
  discard: Card[];
  energyPlayedThisTurn: boolean;
  supporterPlayedThisTurn: boolean;
}

export interface GameLogEntry {
  timestamp: number;
  playerId: string;
  action: string;
  details?: string;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  currentTurn: 0 | 1;
  stadium: Card | null;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  turnCount: number;
  log: GameLogEntry[];
  winner: 0 | 1 | null;
  mode: 'local' | 'online';
  // Mão revelada: cada jogador pode mostrar sua mão pro oponente
  handRevealed: [boolean, boolean];
  // Cartas específicas reveladas da mão (instanceIds)
  revealedCardIds: [string[], string[]];
}

export interface ZoneRef {
  playerId: number;
  zone: ZoneType;
  index?: number;
}

// Resultado de um ataque calculado pela engine
export interface AttackResult {
  baseDamage: number;
  weaknessMultiplier: number;
  resistanceReduction: number;
  finalDamage: number;
  knockedOut: boolean;
  effectText: string;
}
