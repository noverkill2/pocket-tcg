export type CoinResult = 'heads' | 'tails';

export function flipCoin(): CoinResult {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}
