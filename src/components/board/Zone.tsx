import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { DropData } from '../../hooks/useDragAndDrop';

interface ZoneProps {
  id: string;
  zone: string;
  playerId: number;
  index?: number;
  label?: string;
  children?: ReactNode;
  className?: string;
}

export function Zone({ id, zone, playerId, index, label, children, className = '' }: ZoneProps) {
  const dropData: DropData = { zone, playerId, index };

  const { isOver, setNodeRef } = useDroppable({
    id,
    data: dropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-lg border-2 border-dashed transition-all ${
        isOver
          ? 'border-accent-gold bg-accent-gold/10 shadow-lg shadow-accent-gold/20'
          : 'border-bg-section'
      } ${className}`}
    >
      {label && (
        <span className="absolute -top-2.5 left-2 bg-bg-primary px-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
