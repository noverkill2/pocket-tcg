import { useState, useRef, useEffect } from 'react';

interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
  faceDown?: boolean;
}

const CARD_BACK = 'https://images.pokemontcg.io/back.png';

export function CardImage({ src, alt, className = '', faceDown = false }: CardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = faceDown ? CARD_BACK : src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [src, faceDown]);

  return (
    <div className={`relative aspect-[245/342] overflow-hidden rounded-lg ${className}`}>
      {/* Skeleton placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-bg-section" />
      )}
      {error ? (
        <div className="flex h-full items-center justify-center rounded-lg bg-bg-section p-2 text-center text-xs text-text-secondary">
          {alt}
        </div>
      ) : (
        <img
          ref={imgRef}
          alt={alt}
          className={`h-full w-full rounded-lg object-cover transition-opacity duration-300 select-none ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ WebkitTouchCallout: 'none', pointerEvents: 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      )}
    </div>
  );
}
