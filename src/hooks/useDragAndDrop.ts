import { useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useGameStore } from '../store/gameStore';

export interface DragData {
  cardInstanceId: string;
  fromZone: string;
  fromPlayerId: number;
  fromIndex?: number;
}

export interface DropData {
  zone: string;
  playerId: number;
  index?: number;
}

export function useDragAndDrop() {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragData;
    setActiveCardId(data.cardInstanceId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCardId(null);

    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as DropData;
    if (!dragData || !dropData) return;

    // Normalizar zonas pra comparar
    const fromKey = dragData.fromZone.startsWith('bench-')
      ? `bench-${dragData.fromZone.split('-')[1]}`
      : dragData.fromZone;
    const toKey = dropData.zone === 'bench' && dropData.index !== undefined
      ? `bench-${dropData.index}`
      : dropData.zone;

    // Mesma zona, mesmo jogador = nada
    if (fromKey === toKey && dragData.fromPlayerId === dropData.playerId) return;

    // Delegar tudo pro store universal
    useGameStore.getState().universalMove(
      dragData.cardInstanceId,
      dragData.fromPlayerId,
      dragData.fromZone,
      dragData.fromIndex,
      dropData.playerId,
      dropData.zone,
      dropData.index,
    );
  }

  return {
    activeCardId,
    handleDragStart,
    handleDragEnd,
  };
}
