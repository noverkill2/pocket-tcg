export interface PokemonTCGCard {
  id: string;
  name: string;
  supertype: 'Pokémon' | 'Trainer' | 'Energy';
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  attacks?: Attack[];
  abilities?: Ability[];
  weaknesses?: TypeValue[];
  resistances?: TypeValue[];
  retreatCost?: string[];
  rules?: string[];
  set: CardSet;
  number: string;
  rarity?: string;
  images: CardImages;
}

export interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text: string;
}

export interface Ability {
  name: string;
  text: string;
  type: string;
}

export interface TypeValue {
  type: string;
  value: string;
}

export interface CardSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface CardImages {
  small: string;
  large: string;
}

export interface Card {
  instanceId: string;
  data: PokemonTCGCard;
}
