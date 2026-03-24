import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { searchCardsLocal, getAllSets } from '../api/cardDatabase';

const PAGE_SIZE = 24;

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useCardSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSupertype, setSelectedSupertype] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 150);

  // Reset page quando filtros mudam
  const prevFilters = useRef({ debouncedSearch, selectedType, selectedSupertype, selectedSet });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.selectedType !== selectedType ||
      prev.selectedSupertype !== selectedSupertype ||
      prev.selectedSet !== selectedSet
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, selectedType, selectedSupertype, selectedSet };
    }
  }, [debouncedSearch, selectedType, selectedSupertype, selectedSet]);

  // Busca local — síncrona e instantânea
  const result = useMemo(() => {
    return searchCardsLocal({
      name: debouncedSearch || undefined,
      supertype: selectedSupertype || undefined,
      type: selectedType || undefined,
      setId: selectedSet || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
  }, [debouncedSearch, selectedType, selectedSupertype, selectedSet, page]);

  const sets = useMemo(() => getAllSets(), []);

  const wrappedSetSearchTerm = useCallback((val: string) => setSearchTerm(val), []);
  const wrappedSetType = useCallback((val: string) => setSelectedType(val), []);
  const wrappedSetSupertype = useCallback((val: string) => setSelectedSupertype(val), []);
  const wrappedSetSet = useCallback((val: string) => setSelectedSet(val), []);
  const wrappedSetPage = useCallback((val: number) => setPage(val), []);

  return {
    searchTerm,
    setSearchTerm: wrappedSetSearchTerm,
    selectedType,
    setSelectedType: wrappedSetType,
    selectedSupertype,
    setSelectedSupertype: wrappedSetSupertype,
    selectedSet,
    setSelectedSet: wrappedSetSet,
    page,
    setPage: wrappedSetPage,
    cards: result.cards,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    isLoading: false,
    isFetching: false,
    error: null,
    sets,
  };
}
