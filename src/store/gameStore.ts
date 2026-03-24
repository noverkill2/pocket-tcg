import { create } from 'zustand';
import type { Card } from '../types/card';
import type { GameState, PlayerState, ActivePokemon, ZoneRef, PokemonStatus, TurnPhase, AttackResult } from '../types/game';
import { shuffle } from '../utils/shuffle';
import { flipCoin } from '../utils/coinFlip';
import {
  calculateAttack, hasEnoughEnergy,
  canRetreat, payRetreatCost, canAttack, confusionCheck,
  canEvolve, isBasicPokemon, isEnergy, isStadium, isTool,
} from '../engine/rules';

function createEmptyPlayer(id: string, name: string): PlayerState {
  return {
    id, name,
    deck: [], hand: [], active: null,
    bench: [null, null, null, null, null],
    prizes: [], discard: [],
    energyPlayedThisTurn: false,
    supporterPlayedThisTurn: false,
  };
}

function getPokemonAt(player: PlayerState, zone: 'active' | number): ActivePokemon | null {
  return zone === 'active' ? player.active : player.bench[zone];
}

function setPokemonAt(player: PlayerState, zone: 'active' | number, pokemon: ActivePokemon | null): PlayerState {
  if (zone === 'active') return { ...player, active: pokemon };
  const bench = [...player.bench];
  bench[zone] = pokemon;
  return { ...player, bench };
}

interface GameStore extends GameState {
  // Setup
  startGame: (deck1: Card[], deck2: Card[], mode?: 'local' | 'online') => void;
  shuffleDeck: (playerId: number) => void;
  drawCard: (playerId: number, count?: number) => void;
  setupPrizes: (playerId: number) => void;

  // Turno estruturado
  startTurn: () => void;
  endTurn: () => void;

  // Jogar cartas da mão
  playBasicToActive: (cardInstanceId: string) => void;
  playBasicToBench: (cardInstanceId: string, slot: number) => void;
  attachEnergy: (cardInstanceId: string, targetZone: 'active' | number) => void;
  evolve: (cardInstanceId: string, targetZone: 'active' | number) => void;
  forceEvolve: (cardInstanceId: string, targetZone: 'active' | number) => void;
  playStadium: (cardInstanceId: string) => void;

  // Combate
  performAttack: (attackIndex: number) => AttackResult | null;
  retreat: (benchSlot: number) => boolean;

  // Manual (pra efeitos de trainers/abilities)
  moveCard: (cardInstanceId: string, from: ZoneRef, to: ZoneRef) => void;
  attachToZone: (cardInstanceId: string, from: ZoneRef, targetPlayerId: number, targetZone: 'active' | number) => void;
  universalMove: (cardId: string, fromPlayerId: number, fromZone: string, fromIndex: number | undefined, toPlayerId: number, toZone: string, toIndex: number | undefined) => void;

  // Condições especiais (manual)
  setStatus: (playerId: number, zone: 'active' | number, status: PokemonStatus | null) => void;

  // Desanexar energia (destino: 'hand' volta pra mão, 'discard' vai pro descarte)
  detachEnergy: (playerId: number, zone: 'active' | number, energyInstanceId: string, destination?: 'hand' | 'discard') => void;

  // HP boost (efeitos de cartas)
  addHpBoost: (playerId: number, zone: 'active' | number, amount: number) => void;

  // Utilitários
  flipCoin: () => 'heads' | 'tails';
  rollDice: () => number;
  addDamageCounter: (playerId: number, zone: 'active' | number, amount: number) => void;
  removeDamageCounter: (playerId: number, zone: 'active' | number, amount: number) => void;

  // Knockout
  checkKnockout: (playerId: number, zone: 'active' | number) => boolean;
  handleKnockout: (playerId: number, zone: 'active' | number) => void;
  takePrize: (playerId: number) => void;

  // Visualização
  peekZone: (playerId: number, zone: string) => Card[];

  // Controle
  addLog: (playerId: string, action: string, details?: string) => void;
  resetGame: () => void;
  setTurnPhase: (phase: TurnPhase) => void;

  // Revelar mão
  toggleRevealHand: (playerId: number) => void;
  toggleRevealCard: (playerId: number, cardInstanceId: string) => void;

  // Histórico
  history: GameState[];
  undo: () => void;
  saveSnapshot: () => void;
}

const initialState: GameState = {
  players: [
    createEmptyPlayer('player1', 'Jogador 1'),
    createEmptyPlayer('player2', 'Jogador 2'),
  ],
  currentTurn: 0,
  stadium: null,
  gamePhase: 'setup',
  turnPhase: 'main',
  turnCount: 0,
  log: [],
  winner: null,
  mode: 'local',
  handRevealed: [false, false],
  revealedCardIds: [[], []],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  history: [],

  saveSnapshot: () => {
    const { history, ...state } = get();
    set({ history: [...history, state as GameState].slice(-30) });
  },

  // === SETUP ===

  startGame: (deck1, deck2, mode = 'local') => {
    const players: [PlayerState, PlayerState] = [
      { ...createEmptyPlayer('player1', 'Jogador 1'), deck: shuffle(deck1) },
      { ...createEmptyPlayer('player2', 'Jogador 2'), deck: shuffle(deck2) },
    ];
    set({
      players, currentTurn: 0, stadium: null,
      gamePhase: 'playing', turnPhase: 'main',
      turnCount: 1, log: [], winner: null, history: [], mode,
      handRevealed: [false, false], revealedCardIds: [[], []],
    });
  },

  shuffleDeck: (playerId) => {
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      players[playerId] = { ...players[playerId], deck: shuffle(players[playerId].deck) };
      return { players };
    });
  },

  drawCard: (playerId, count = 1) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };

      if (player.deck.length === 0) {
        // Deck vazio = derrota
        return { winner: playerId === 0 ? 1 : 0, gamePhase: 'ended' as const };
      }

      const drawn = player.deck.slice(0, count);
      player.deck = player.deck.slice(count);
      player.hand = [...player.hand, ...drawn];
      players[playerId] = player;
      return { players };
    });
  },

  setupPrizes: (playerId) => {
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      player.prizes = player.deck.slice(0, 6);
      player.deck = player.deck.slice(6);
      players[playerId] = player;
      return { players };
    });
  },

  // === TURNO ===

  startTurn: () => {
    // Limpar histórico no início do turno (undo só volta até aqui)
    set({ history: [] });
  },

  endTurn: () => {
    const state = get();
    const nextPlayer = state.currentTurn === 0 ? 1 : 0;

    // Passar vez limpa o histórico — undo só funciona dentro do próprio turno
    set({
      currentTurn: nextPlayer as 0 | 1,
      turnCount: state.turnCount + 1,
      history: [],
    });

    // Limpar histórico pro novo turno
    get().startTurn();
  },

  // === JOGAR CARTAS ===

  playBasicToActive: (cardInstanceId) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      if (player.active) return {};

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];
      if (!isBasicPokemon(card)) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);

      player.hand = hand;
      player.active = {
        card, attachedEnergies: [], attachedTools: [],
        damageCounters: 0, status: null, previousStage: null,
        turnPlayed: state.turnCount, hpBoost: 0,
      };
      players[pid] = player;
      get().addLog(player.id, 'play', `Jogou ${card.data.name} como ativo`);
      return { players };
    });
  },

  playBasicToBench: (cardInstanceId, slot) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      if (player.bench[slot] !== null) return {};

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];
      if (!isBasicPokemon(card)) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);
      const bench = [...player.bench];
      bench[slot] = {
        card, attachedEnergies: [], attachedTools: [],
        damageCounters: 0, status: null, previousStage: null,
        turnPlayed: state.turnCount, hpBoost: 0,
      };

      player.hand = hand;
      player.bench = bench;
      players[pid] = player;
      get().addLog(player.id, 'play', `Jogou ${card.data.name} no banco`);
      return { players };
    });
  },

  attachEnergy: (cardInstanceId, targetZone) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      if (player.energyPlayedThisTurn) return {};

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];
      if (!isEnergy(card)) return {};

      const pokemon = getPokemonAt(player, targetZone);
      if (!pokemon) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);
      const updated = { ...pokemon, attachedEnergies: [...pokemon.attachedEnergies, card] };
      player.hand = hand;
      player.energyPlayedThisTurn = true;
      players[pid] = setPokemonAt(player, targetZone, updated);
      get().addLog(player.id, 'energy', `Anexou ${card.data.name} em ${pokemon.card.data.name}`);
      return { players };
    });
  },

  evolve: (cardInstanceId, targetZone) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];

      const pokemon = getPokemonAt(player, targetZone);
      if (!pokemon || !canEvolve(pokemon, card, state.turnCount)) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);
      const evolved: ActivePokemon = {
        ...pokemon,
        card,
        previousStage: pokemon.card,
        status: null, // Evolução remove condições especiais
        turnPlayed: state.turnCount, hpBoost: 0,
      };

      player.hand = hand;
      players[pid] = setPokemonAt(player, targetZone, evolved);
      get().addLog(player.id, 'evolve', `Evoluiu ${pokemon.card.data.name} para ${card.data.name}`);
      return { players };
    });
  },

  // Evolução forçada (Rare Candy, efeitos manuais) — sem validação de evolvesFrom/turno
  forceEvolve: (cardInstanceId, targetZone) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];

      const pokemon = getPokemonAt(player, targetZone);
      if (!pokemon) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);
      const evolved: ActivePokemon = {
        ...pokemon,
        card,
        previousStage: pokemon.card,
        status: null,
        turnPlayed: state.turnCount, hpBoost: 0,
      };

      player.hand = hand;
      players[pid] = setPokemonAt(player, targetZone, evolved);
      get().addLog(player.id, 'evolve', `Evoluiu ${pokemon.card.data.name} para ${card.data.name} (manual)`);
      return { players };
    });
  },

  playStadium: (cardInstanceId) => {
    get().saveSnapshot();
    set((state) => {
      const pid = state.currentTurn;
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[pid] };

      const idx = player.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = player.hand[idx];
      if (!isStadium(card)) return {};

      const hand = [...player.hand];
      hand.splice(idx, 1);

      // Descarta estádio antigo
      if (state.stadium) {
        player.discard = [...player.discard, state.stadium];
      }

      player.hand = hand;
      players[pid] = player;
      return { players, stadium: card };
    });
  },

  // === COMBATE ===

  performAttack: (attackIndex) => {
    const state = get();
    const pid = state.currentTurn;
    const opponent = pid === 0 ? 1 : 0;
    const attacker = state.players[pid].active;
    const defender = state.players[opponent].active;

    if (!attacker || !defender) return null;
    if (!canAttack(attacker, attacker.status)) return null;

    const attacks = attacker.card.data.attacks;
    if (!attacks || !attacks[attackIndex]) return null;
    const attack = attacks[attackIndex];

    if (!hasEnoughEnergy(attacker, attack)) return null;

    // Confusão check
    if (attacker.status === 'confused') {
      const check = confusionCheck();
      if (!check.canAttack) {
        get().saveSnapshot();
        set((s) => {
          const players = [...s.players] as [PlayerState, PlayerState];
          const player = { ...players[pid] };
          if (player.active) {
            player.active = { ...player.active, damageCounters: player.active.damageCounters + check.selfDamage };
          }
          players[pid] = player;
          return { players, turnPhase: 'main' as const };
        });
        get().addLog(state.players[pid].id, 'confused', `${attacker.card.data.name} se machucou na confusao! (-${check.selfDamage})`);
        return null;
      }
    }

    get().saveSnapshot();
    const result = calculateAttack(attacker, defender, attack);

    set((s) => {
      const players = [...s.players] as [PlayerState, PlayerState];
      const defPlayer = { ...players[opponent] };
      if (defPlayer.active) {
        defPlayer.active = {
          ...defPlayer.active,
          damageCounters: defPlayer.active.damageCounters + result.finalDamage,
        };
      }
      players[opponent] = defPlayer;
      return { players, turnPhase: 'main' as const };
    });

    get().addLog(
      state.players[pid].id,
      'attack',
      `${attacker.card.data.name} usou ${attack.name}! ${result.finalDamage} de dano${result.weaknessMultiplier > 1 ? ' (fraqueza!)' : ''}${result.resistanceReduction > 0 ? ' (resistencia)' : ''}${result.knockedOut ? ' — KNOCKOUT!' : ''}`
    );

    // Checar knockout
    if (result.knockedOut) {
      get().handleKnockout(opponent, 'active');
    }

    return result;
  },

  retreat: (benchSlot) => {
    const state = get();
    const pid = state.currentTurn;
    const player = state.players[pid];

    if (!player.active || !canRetreat(player.active)) return false;
    const benchPokemon = player.bench[benchSlot];
    if (!benchPokemon) return false;

    const { paid, remaining } = payRetreatCost(player.active);
    if (!paid) return false;

    get().saveSnapshot();
    set((s) => {
      const players = [...s.players] as [PlayerState, PlayerState];
      const p = { ...players[pid] };
      const oldActive = { ...p.active!, attachedEnergies: remaining, status: null };
      const bench = [...p.bench];
      bench[benchSlot] = oldActive;
      p.active = benchPokemon;
      p.bench = bench;
      players[pid] = p;
      return { players };
    });

    get().addLog(player.id, 'retreat', `${player.active.card.data.name} recuou, ${benchPokemon.card.data.name} entrou`);
    return true;
  },

  // === KNOCKOUT ===

  checkKnockout: (playerId, zone) => {
    const player = get().players[playerId];
    const pokemon = getPokemonAt(player, zone);
    if (!pokemon) return false;
    const hp = parseInt(pokemon.card.data.hp || '0', 10);
    return pokemon.damageCounters >= hp;
  },

  handleKnockout: (playerId, zone) => {
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};

      // Tudo pro descarte
      const toDiscard = [pokemon.card, ...pokemon.attachedEnergies, ...pokemon.attachedTools];
      if (pokemon.previousStage) toDiscard.push(pokemon.previousStage);

      player.discard = [...player.discard, ...toDiscard];
      players[playerId] = setPokemonAt(player, zone, null);

      // Oponente pega 1 prêmio
      const opponent = playerId === 0 ? 1 : 0;
      const opponentPlayer = { ...players[opponent] };
      if (opponentPlayer.prizes.length > 0) {
        const prize = opponentPlayer.prizes[0];
        opponentPlayer.prizes = opponentPlayer.prizes.slice(1);
        opponentPlayer.hand = [...opponentPlayer.hand, prize];
        players[opponent] = opponentPlayer;

        // Checar vitória: 0 prêmios
        if (opponentPlayer.prizes.length === 0) {
          return { players, winner: opponent as 0 | 1, gamePhase: 'ended' as const };
        }
      }

      // Checar se jogador sem pokémon em campo
      const hasAnother = players[playerId].bench.some(b => b !== null);
      if (!hasAnother && zone === 'active') {
        return { players, winner: opponent as 0 | 1, gamePhase: 'ended' as const };
      }

      return { players };
    });
  },

  takePrize: (playerId) => {
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      if (player.prizes.length === 0) return {};
      const prize = player.prizes[0];
      player.prizes = player.prizes.slice(1);
      player.hand = [...player.hand, prize];
      players[playerId] = player;
      if (player.prizes.length === 0) {
        return { players, winner: playerId as 0 | 1, gamePhase: 'ended' as const };
      }
      return { players };
    });
  },

  // === MANUAL (pra trainers/abilities) ===

  moveCard: (cardInstanceId, from, to) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const fromPlayer = { ...players[from.playerId] };
      const toPlayer = from.playerId === to.playerId ? fromPlayer : { ...players[to.playerId] };

      // Remover da origem
      let card: Card | null = null;
      const fromZoneKey = from.zone;
      if (fromZoneKey === 'hand') {
        const idx = fromPlayer.hand.findIndex(c => c.instanceId === cardInstanceId);
        if (idx === -1) return {};
        card = fromPlayer.hand[idx];
        fromPlayer.hand = [...fromPlayer.hand];
        fromPlayer.hand.splice(idx, 1);
      } else if (fromZoneKey === 'deck') {
        const idx = fromPlayer.deck.findIndex(c => c.instanceId === cardInstanceId);
        if (idx === -1) return {};
        card = fromPlayer.deck[idx];
        fromPlayer.deck = [...fromPlayer.deck];
        fromPlayer.deck.splice(idx, 1);
      } else if (fromZoneKey === 'discard') {
        const idx = fromPlayer.discard.findIndex(c => c.instanceId === cardInstanceId);
        if (idx === -1) return {};
        card = fromPlayer.discard[idx];
        fromPlayer.discard = [...fromPlayer.discard];
        fromPlayer.discard.splice(idx, 1);
      } else if (fromZoneKey === 'prizes') {
        const idx = fromPlayer.prizes.findIndex(c => c.instanceId === cardInstanceId);
        if (idx === -1) return {};
        card = fromPlayer.prizes[idx];
        fromPlayer.prizes = [...fromPlayer.prizes];
        fromPlayer.prizes.splice(idx, 1);
      }

      if (!card) return {};

      // Adicionar ao destino
      const target = from.playerId === to.playerId ? fromPlayer : toPlayer;
      if (to.zone === 'hand') target.hand = [...target.hand, card];
      else if (to.zone === 'deck') target.deck = [...target.deck, card];
      else if (to.zone === 'discard') target.discard = [...target.discard, card];

      players[from.playerId] = fromPlayer;
      if (from.playerId !== to.playerId) players[to.playerId] = toPlayer;
      return { players };
    });
  },

  attachToZone: (cardInstanceId, from, targetPlayerId, targetZone) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const fromPlayer = { ...players[from.playerId] };

      const idx = fromPlayer.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return {};
      const card = fromPlayer.hand[idx];
      fromPlayer.hand = [...fromPlayer.hand];
      fromPlayer.hand.splice(idx, 1);

      const targetPlayer = from.playerId === targetPlayerId ? fromPlayer : { ...players[targetPlayerId] };
      const pokemon = getPokemonAt(targetPlayer, targetZone);
      if (!pokemon) return {};

      const updated = { ...pokemon };
      if (isEnergy(card)) {
        updated.attachedEnergies = [...updated.attachedEnergies, card];
      } else if (isTool(card)) {
        updated.attachedTools = [...updated.attachedTools, card];
      }

      players[from.playerId] = fromPlayer;
      const tp = from.playerId === targetPlayerId ? fromPlayer : targetPlayer;
      players[targetPlayerId] = setPokemonAt(tp, targetZone, updated);
      return { players };
    });
  },

  universalMove: (cardId, fromPlayerId, fromZone, _fromIndex, toPlayerId, toZone, toIndex) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const fp = { ...players[fromPlayerId] };
      const tp = fromPlayerId === toPlayerId ? fp : { ...players[toPlayerId] };

      // === EXTRAIR carta da origem ===
      let card: Card | null = null;
      let activePokemon: ActivePokemon | null = null;

      if (fromZone === 'hand') {
        const idx = fp.hand.findIndex(c => c.instanceId === cardId);
        if (idx === -1) return {};
        card = fp.hand[idx];
        fp.hand = fp.hand.filter(c => c.instanceId !== cardId);
      } else if (fromZone === 'deck') {
        const idx = fp.deck.findIndex(c => c.instanceId === cardId);
        if (idx === -1) return {};
        card = fp.deck[idx];
        fp.deck = fp.deck.filter(c => c.instanceId !== cardId);
      } else if (fromZone === 'discard') {
        const idx = fp.discard.findIndex(c => c.instanceId === cardId);
        if (idx === -1) return {};
        card = fp.discard[idx];
        fp.discard = fp.discard.filter(c => c.instanceId !== cardId);
      } else if (fromZone === 'prizes') {
        const idx = fp.prizes.findIndex(c => c.instanceId === cardId);
        if (idx === -1) return {};
        card = fp.prizes[idx];
        fp.prizes = fp.prizes.filter(c => c.instanceId !== cardId);
      } else if (fromZone === 'active') {
        if (!fp.active) return {};
        card = fp.active.card;
        activePokemon = fp.active;
        fp.active = null;
      } else if (fromZone.startsWith('bench-')) {
        const bi = parseInt(fromZone.split('-')[1], 10);
        const bp = fp.bench[bi];
        if (!bp) return {};
        card = bp.card;
        activePokemon = bp;
        const bench = [...fp.bench];
        bench[bi] = null;
        fp.bench = bench;
      }

      if (!card) return {};

      // === COLOCAR no destino ===
      const dest = fromPlayerId === toPlayerId ? fp : tp;

      if (toZone === 'hand') {
        dest.hand = [...dest.hand, card];
      } else if (toZone === 'deck') {
        dest.deck = [...dest.deck, card];
      } else if (toZone === 'discard') {
        // Se veio de active/bench, manda energias e tools junto pro descarte
        if (activePokemon) {
          const extras = [...activePokemon.attachedEnergies, ...activePokemon.attachedTools];
          if (activePokemon.previousStage) extras.push(activePokemon.previousStage);
          dest.discard = [...dest.discard, card, ...extras];
        } else {
          dest.discard = [...dest.discard, card];
        }
      } else if (toZone === 'active') {
        if (dest.active && activePokemon) {
          // SWAP: troca pokemon do campo (active<->bench ou active<->active)
          const oldActive = dest.active;
          dest.active = activePokemon;
          // Colocar o antigo ativo de volta na origem
          if (fromZone === 'active') {
            // active -> active (entre jogadores diferentes): origem fica com o antigo destino
            fp.active = oldActive;
          } else if (fromZone.startsWith('bench-')) {
            const bi = parseInt(fromZone.split('-')[1], 10);
            const bench = [...fp.bench];
            bench[bi] = oldActive;
            fp.bench = bench;
          }
        } else if (dest.active) {
          // Já tem ativo, carta vem da mão/deck: energia, evolução ou tool
          if (card.data.supertype === 'Energy') {
            dest.active = { ...dest.active, attachedEnergies: [...dest.active.attachedEnergies, card] };
          } else if (card.data.supertype === 'Pokémon') {
            dest.active = {
              ...dest.active,
              card,
              previousStage: dest.active.card,
              status: null,
              turnPlayed: state.turnCount, hpBoost: 0,
            };
          } else {
            dest.active = { ...dest.active, attachedTools: [...dest.active.attachedTools, card] };
          }
        } else {
          // Ativo vazio: colocar como novo ativo
          if (activePokemon) {
            dest.active = activePokemon;
          } else {
            dest.active = {
              card, attachedEnergies: [], attachedTools: [],
              damageCounters: 0, status: null, previousStage: null,
              turnPlayed: state.turnCount, hpBoost: 0,
            };
          }
        }
      } else if (toZone === 'bench' && toIndex !== undefined) {
        const bench = [...dest.bench];
        if (bench[toIndex] && activePokemon) {
          // SWAP: troca pokemon do campo (bench<->active ou bench<->bench)
          const oldBench = bench[toIndex]!;
          bench[toIndex] = activePokemon;
          dest.bench = bench;
          // Colocar o antigo do bench de volta na origem
          if (fromZone === 'active') {
            fp.active = oldBench;
          } else if (fromZone.startsWith('bench-')) {
            const bi = parseInt(fromZone.split('-')[1], 10);
            const srcBench = [...fp.bench];
            srcBench[bi] = oldBench;
            fp.bench = srcBench;
          }
        } else if (bench[toIndex]) {
          // Já tem pokémon, carta vem da mão/deck: energia, evolução ou tool
          const existing = bench[toIndex]!;
          if (card.data.supertype === 'Energy') {
            bench[toIndex] = { ...existing, attachedEnergies: [...existing.attachedEnergies, card] };
          } else if (card.data.supertype === 'Pokémon') {
            bench[toIndex] = {
              ...existing,
              card,
              previousStage: existing.card,
              status: null,
              turnPlayed: state.turnCount, hpBoost: 0,
            };
          } else {
            bench[toIndex] = { ...existing, attachedTools: [...existing.attachedTools, card] };
          }
          dest.bench = bench;
        } else {
          // Slot vazio: colocar pokémon
          if (activePokemon) {
            bench[toIndex] = activePokemon;
          } else {
            bench[toIndex] = {
              card, attachedEnergies: [], attachedTools: [],
              damageCounters: 0, status: null, previousStage: null,
              turnPlayed: state.turnCount, hpBoost: 0,
            };
          }
        }
        dest.bench = bench;
      } else if (toZone === 'stadium') {
        // Descarta estádio antigo se existir
        if (state.stadium) {
          dest.discard = [...dest.discard, state.stadium];
        }
        players[fromPlayerId] = fp;
        if (fromPlayerId !== toPlayerId) players[toPlayerId] = tp;
        return { players, stadium: card };
      }

      players[fromPlayerId] = fp;
      if (fromPlayerId !== toPlayerId) players[toPlayerId] = tp;
      return { players };
    });
  },

  setStatus: (playerId, zone, status) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};
      players[playerId] = setPokemonAt(player, zone, { ...pokemon, status });
      return { players };
    });
  },

  detachEnergy: (playerId, zone, energyInstanceId, destination = 'hand') => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};
      const idx = pokemon.attachedEnergies.findIndex(e => e.instanceId === energyInstanceId);
      if (idx === -1) return {};
      const energy = pokemon.attachedEnergies[idx];
      const newEnergies = [...pokemon.attachedEnergies];
      newEnergies.splice(idx, 1);
      const updated = { ...pokemon, attachedEnergies: newEnergies };
      if (destination === 'discard') {
        player.discard = [...player.discard, energy];
      } else {
        player.hand = [...player.hand, energy];
      }
      players[playerId] = setPokemonAt(player, zone, updated);
      return { players };
    });
  },

  // === UTILITÁRIOS ===

  flipCoin: () => {
    const result = flipCoin();
    get().addLog('system', 'coin_flip', result === 'heads' ? 'Cara' : 'Coroa');
    return result;
  },

  rollDice: () => {
    const result = Math.floor(Math.random() * 6) + 1;
    get().addLog('system', 'dice_roll', String(result));
    return result;
  },

  addDamageCounter: (playerId, zone, amount) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};
      players[playerId] = setPokemonAt(player, zone, { ...pokemon, damageCounters: pokemon.damageCounters + amount });
      return { players };
    });
  },

  removeDamageCounter: (playerId, zone, amount) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};
      players[playerId] = setPokemonAt(player, zone, { ...pokemon, damageCounters: Math.max(0, pokemon.damageCounters - amount) });
      return { players };
    });
  },

  peekZone: (playerId, zone) => {
    const player = get().players[playerId];
    switch (zone) {
      case 'deck': return player.deck;
      case 'hand': return player.hand;
      case 'discard': return player.discard;
      case 'prizes': return player.prizes;
      default: return [];
    }
  },

  addLog: (playerId, action, details) => {
    set((state) => ({
      log: [...state.log, { timestamp: Date.now(), playerId, action, details }],
    }));
  },

  resetGame: () => set({ ...initialState, history: [] }),
  setTurnPhase: (phase) => set({ turnPhase: phase }),

  addHpBoost: (playerId, zone, amount) => {
    get().saveSnapshot();
    set((state) => {
      const players = [...state.players] as [PlayerState, PlayerState];
      const player = { ...players[playerId] };
      const pokemon = getPokemonAt(player, zone);
      if (!pokemon) return {};
      const updated = { ...pokemon, hpBoost: Math.max(0, pokemon.hpBoost + amount) };
      players[playerId] = setPokemonAt(player, zone, updated);
      return { players };
    });
  },

  toggleRevealHand: (playerId) => {
    set((state) => {
      const handRevealed = [...state.handRevealed] as [boolean, boolean];
      handRevealed[playerId] = !handRevealed[playerId];
      // Se revelou tudo, limpa seleção individual
      const revealedCardIds = [...state.revealedCardIds] as [string[], string[]];
      if (handRevealed[playerId]) revealedCardIds[playerId] = [];
      return { handRevealed, revealedCardIds };
    });
  },

  toggleRevealCard: (playerId, cardInstanceId) => {
    set((state) => {
      const revealedCardIds = [...state.revealedCardIds] as [string[], string[]];
      const current = [...revealedCardIds[playerId]];
      const idx = current.indexOf(cardInstanceId);
      if (idx === -1) current.push(cardInstanceId);
      else current.splice(idx, 1);
      revealedCardIds[playerId] = current;
      return { revealedCardIds };
    });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ ...previous, history: history.slice(0, -1) });
  },
}));
