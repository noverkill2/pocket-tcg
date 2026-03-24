import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState, useRef, useCallback } from 'react';
import { CardImage } from './CardImage';
import { CardPreview } from './CardPreview';
import type { Card } from '../../types/card';
import type { DragData } from '../../hooks/useDragAndDrop';

interface DraggableCardProps {
  card: Card;
  zone: string;
  playerId: number;
  index?: number;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-12 sm:w-14 lg:w-[72px]',
  md: 'w-16 sm:w-20 lg:w-[100px]',
  lg: 'w-[68px] sm:w-24 lg:w-[120px]',
};

export function DraggableCard({ card, zone, playerId, index, faceDown = false, size = 'md', disabled = false }: DraggableCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const lastTapRef = useRef(0);

  const dragData: DragData = {
    cardInstanceId: card.instanceId,
    fromZone: zone,
    fromPlayerId: playerId,
    fromIndex: index,
  };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.instanceId,
    data: dragData,
    disabled,
  });

  // Na mão: touch-action pan-x pra permitir scroll horizontal
  // Em qualquer outro lugar: touch-action none pra drag funcionar sem interferência
  const isInHand = zone === 'hand';

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    touchAction: isInHand ? 'pan-x' : 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  };

  // Double-tap/click pra abrir preview (funciona em desktop e mobile)
  const handleDoubleTap = useCallback(() => {
    if (faceDown || isDragging) return;
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setShowPreview(true);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [faceDown, isDragging]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`${sizeClasses[size]} ${disabled ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing'} transition-shadow hover:shadow-lg hover:shadow-accent-blue/30 rounded-lg select-none`}
        onClick={handleDoubleTap}
        onContextMenu={(e) => e.preventDefault()}
      >
        <CardImage
          src={card.data.images.small}
          alt={card.data.name}
          faceDown={faceDown}
        />
      </div>
      {showPreview && createPortal(
        <CardPreview
          card={card.data}
          onClose={() => setShowPreview(false)}
        />,
        document.body,
      )}
    </>
  );
}
