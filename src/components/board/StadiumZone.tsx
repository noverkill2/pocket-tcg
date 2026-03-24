import { Zone } from './Zone';
import { DraggableCard } from '../card/DraggableCard';
import type { Card } from '../../types/card';

interface StadiumZoneProps {
  stadium: Card | null;
}

export function StadiumZone({ stadium }: StadiumZoneProps) {
  return (
    <Zone
      id="stadium"
      zone="stadium"
      playerId={0}
      label="Stadium"
      className="flex min-h-[40px] w-14 flex-col items-center justify-center p-1 sm:min-h-[70px] sm:w-24 sm:p-2 lg:min-h-[100px] lg:w-[120px] lg:p-3"
    >
      {stadium ? (
        <DraggableCard
          card={stadium}
          zone="stadium"
          playerId={0}
          size="sm"
        />
      ) : (
        <span className="text-[8px] text-text-secondary opacity-50 sm:text-xs">Vazio</span>
      )}
    </Zone>
  );
}
