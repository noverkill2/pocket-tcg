import type { Card } from '../types/card';
import type { ActivePokemon, PokemonStatus, AttackResult } from '../types/game';
import type { Attack } from '../types/card';

// === ENERGIA ===

/** Verifica se o pokémon tem energia suficiente pra um ataque */
export function hasEnoughEnergy(pokemon: ActivePokemon, attack: Attack): boolean {
  const available = countEnergies(pokemon);
  const required = countRequiredEnergies(attack);

  // Primeiro verifica energias tipadas
  for (const [type, count] of Object.entries(required)) {
    if (type === 'Colorless') continue;
    if ((available[type] || 0) < count) return false;
  }

  // Depois verifica colorless (qualquer tipo serve)
  const typedUsed = Object.entries(required)
    .filter(([t]) => t !== 'Colorless')
    .reduce((sum, [, c]) => sum + c, 0);
  const totalAvailable = Object.values(available).reduce((sum, c) => sum + c, 0);
  const colorlessNeeded = required['Colorless'] || 0;

  return (totalAvailable - typedUsed) >= colorlessNeeded;
}

function countEnergies(pokemon: ActivePokemon): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const energy of pokemon.attachedEnergies) {
    // Extrair tipo da energia pelo nome (ex: "Basic Fire Energy" → "Fire")
    const type = getEnergyType(energy);
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

function countRequiredEnergies(attack: Attack): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cost of attack.cost) {
    counts[cost] = (counts[cost] || 0) + 1;
  }
  return counts;
}

export function getEnergyType(energy: Card): string {
  // Energias básicas: tipos no array types
  if (energy.data.types && energy.data.types.length > 0) {
    return energy.data.types[0];
  }
  // Pelo nome: "Basic Fire Energy" → Fire
  const name = energy.data.name.toLowerCase();
  const types = ['fire', 'water', 'grass', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'fairy', 'dragon'];
  for (const t of types) {
    if (name.includes(t)) return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return 'Colorless';
}

// Pagar custo de recuo (remove energias)
export function payRetreatCost(pokemon: ActivePokemon): { paid: boolean; remaining: Card[] } {
  if (!pokemon.card.data.retreatCost) return { paid: true, remaining: pokemon.attachedEnergies };
  const cost = pokemon.card.data.retreatCost.length;
  if (pokemon.attachedEnergies.length < cost) return { paid: false, remaining: pokemon.attachedEnergies };
  // Remove do final (energias mais recentes primeiro)
  const remaining = pokemon.attachedEnergies.slice(0, pokemon.attachedEnergies.length - cost);
  return { paid: true, remaining };
}

// === DANO ===

/** Extrair dano numérico base de um ataque (ex: "90", "10+", "30×") */
export function parseBaseDamage(damage: string): number {
  const num = parseInt(damage.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

/** Calcula o resultado completo de um ataque */
export function calculateAttack(
  attacker: ActivePokemon,
  defender: ActivePokemon,
  attack: Attack
): AttackResult {
  const baseDamage = parseBaseDamage(attack.damage);

  // Fraqueza
  let weaknessMultiplier = 1;
  if (defender.card.data.weaknesses) {
    const attackerType = attacker.card.data.types?.[0];
    const weakness = defender.card.data.weaknesses.find(w => w.type === attackerType);
    if (weakness) {
      weaknessMultiplier = weakness.value === '×2' ? 2 : 1;
    }
  }

  // Resistência
  let resistanceReduction = 0;
  if (defender.card.data.resistances) {
    const attackerType = attacker.card.data.types?.[0];
    const resistance = defender.card.data.resistances.find(r => r.type === attackerType);
    if (resistance) {
      resistanceReduction = parseInt(resistance.value.replace(/[^0-9]/g, ''), 10) || 30;
    }
  }

  const finalDamage = Math.max(0, (baseDamage * weaknessMultiplier) - resistanceReduction);
  const totalDamage = defender.damageCounters + finalDamage;
  const defenderHP = parseInt(defender.card.data.hp || '0', 10);
  const knockedOut = totalDamage >= defenderHP;

  return {
    baseDamage,
    weaknessMultiplier,
    resistanceReduction,
    finalDamage,
    knockedOut,
    effectText: attack.text || '',
  };
}

// === CONDIÇÕES ESPECIAIS (entre turnos) ===

export interface BetweenTurnResult {
  poisonDamage: number;
  burnDamage: number;
  burnFlipHeads: boolean;
  wokeUp: boolean;
  paralysisRemoved: boolean;
  knockedOut: boolean;
}

export function processBetweenTurns(pokemon: ActivePokemon): BetweenTurnResult {
  const result: BetweenTurnResult = {
    poisonDamage: 0,
    burnDamage: 0,
    burnFlipHeads: false,
    wokeUp: false,
    paralysisRemoved: false,
    knockedOut: false,
  };

  const hp = parseInt(pokemon.card.data.hp || '0', 10);

  if (pokemon.status === 'poisoned') {
    result.poisonDamage = 10;
  }

  if (pokemon.status === 'burned') {
    result.burnFlipHeads = Math.random() < 0.5;
    if (!result.burnFlipHeads) {
      result.burnDamage = 20;
    }
  }

  if (pokemon.status === 'asleep') {
    result.wokeUp = Math.random() < 0.5;
  }

  if (pokemon.status === 'paralyzed') {
    result.paralysisRemoved = true;
  }

  const totalDamage = pokemon.damageCounters + result.poisonDamage + result.burnDamage;
  result.knockedOut = totalDamage >= hp;

  return result;
}

// === VALIDAÇÕES ===

export function canEvolve(pokemon: ActivePokemon, evolutionCard: Card, turnCount: number): boolean {
  // Não pode evoluir no turno que foi jogado
  if (pokemon.turnPlayed === turnCount) return false;
  // Verificar se a evolução evolve do pokémon atual
  if (!evolutionCard.data.evolvesFrom) return false;
  return evolutionCard.data.evolvesFrom === pokemon.card.data.name;
}

export function canRetreat(pokemon: ActivePokemon): boolean {
  // Não pode recuar se paralisado ou dormindo
  if (pokemon.status === 'paralyzed' || pokemon.status === 'asleep') return false;
  // Precisa ter energia suficiente
  const cost = pokemon.card.data.retreatCost?.length || 0;
  return pokemon.attachedEnergies.length >= cost;
}

export function canAttack(_pokemon: ActivePokemon, status: PokemonStatus | null): boolean {
  // Paralisado não pode atacar
  if (status === 'paralyzed') return false;
  // Dormindo não pode atacar
  if (status === 'asleep') return false;
  return true;
}

/** Confuso: flip moeda antes de atacar. Coroa = ataque falha + 30 dano em si */
export function confusionCheck(): { canAttack: boolean; selfDamage: number } {
  const heads = Math.random() < 0.5;
  return { canAttack: heads, selfDamage: heads ? 0 : 30 };
}

export function isPokemon(card: Card): boolean {
  return card.data.supertype === 'Pokémon';
}

export function isBasicPokemon(card: Card): boolean {
  return isPokemon(card) && (card.data.subtypes?.includes('Basic') ?? false);
}

export function isEnergy(card: Card): boolean {
  return card.data.supertype === 'Energy';
}

export function isTrainer(card: Card): boolean {
  return card.data.supertype === 'Trainer';
}

export function isSupporter(card: Card): boolean {
  return isTrainer(card) && (card.data.subtypes?.includes('Supporter') ?? false);
}

export function isItem(card: Card): boolean {
  return isTrainer(card) && (card.data.subtypes?.includes('Item') ?? false);
}

export function isTool(card: Card): boolean {
  return isTrainer(card) && (card.data.subtypes?.includes('Pokémon Tool') ?? false);
}

export function isStadium(card: Card): boolean {
  return isTrainer(card) && (card.data.subtypes?.includes('Stadium') ?? false);
}
