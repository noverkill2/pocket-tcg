import { useGameStore } from '../store/gameStore';

export function useGameState() {
  const store = useGameStore();
  return store;
}
