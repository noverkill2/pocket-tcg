import { useState } from 'react';
import type { CardSet } from '../../types/card';

interface CardSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedSupertype: string;
  onSupertypeChange: (value: string) => void;
  selectedSet: string;
  onSetChange: (value: string) => void;
  sets: CardSet[];
}

const pokemonTypes = [
  'Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting',
  'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water',
];

export function CardSearch({
  searchTerm, onSearchChange,
  selectedType, onTypeChange,
  selectedSupertype, onSupertypeChange,
  selectedSet, onSetChange,
  sets,
}: CardSearchProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = selectedType || selectedSupertype || selectedSet;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar carta..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg bg-bg-section py-3 pl-10 pr-4 text-text-primary placeholder-text-secondary/50 outline-none ring-1 ring-bg-section focus:ring-accent-blue"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            hasFilters || filtersOpen
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'bg-bg-section text-text-secondary hover:text-text-primary'
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">Filtros</span>
          {hasFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue text-[10px] font-bold text-white">
              {[selectedType, selectedSupertype, selectedSet].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="grid grid-cols-1 gap-2 rounded-lg bg-bg-section/50 p-3 sm:grid-cols-3">
          <select
            value={selectedSupertype}
            onChange={(e) => onSupertypeChange(e.target.value)}
            className="rounded-lg bg-bg-section px-3 py-3 text-sm text-text-primary outline-none sm:py-2"
          >
            <option value="">Todos os tipos</option>
            <option value="Pokemon">Pokemon</option>
            <option value="Trainer">Trainer</option>
            <option value="Energy">Energy</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="rounded-lg bg-bg-section px-3 py-3 text-sm text-text-primary outline-none sm:py-2"
          >
            <option value="">Todos elementos</option>
            {pokemonTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={selectedSet}
            onChange={(e) => onSetChange(e.target.value)}
            className="rounded-lg bg-bg-section px-3 py-3 text-sm text-text-primary outline-none sm:py-2"
          >
            <option value="">Todas expansoes</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                onTypeChange('');
                onSupertypeChange('');
                onSetChange('');
              }}
              className="rounded-lg bg-accent-red/20 px-3 py-2 text-sm text-accent-red sm:col-span-3"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
