import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardSearch } from './CardSearch';
import { CardGrid } from './CardGrid';
import { DeckList } from './DeckList';
import { DeckStats } from './DeckStats';
import { useCardSearch } from '../../hooks/useCardSearch';
import { useDeckStore, getDeckAddError } from '../../store/deckStore';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function DeckBuilder() {
  const search = useCardSearch();
  const { toast } = useToast();
  const {
    currentDeck, currentDeckName,
    addCard, removeCard, clearDeck, setDeckName, saveDeck,
    decks, loadDeck, deleteDeck, loadFromStorage,
    exportDeck, importDeck,
  } = useDeckStore();

  const [deckDrawerOpen, setDeckDrawerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleAddCard = (card: Parameters<typeof addCard>[0]) => {
    const error = getDeckAddError(currentDeck, card);
    if (error) {
      toast(error, 'error');
      return;
    }
    addCard(card);
    toast(`${card.name} adicionado`, 'success');
  };

  const handleSave = () => {
    if (!currentDeckName) {
      toast('De um nome ao deck primeiro!', 'error');
      return;
    }
    if (currentDeck.length === 0) {
      toast('Deck esta vazio!', 'error');
      return;
    }
    saveDeck();
    toast(`Deck "${currentDeckName}" salvo!`, 'success');
  };

  const handleExport = (id: string) => {
    const json = exportDeck(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Deck exportado!', 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (importDeck(text)) {
        toast('Deck importado com sucesso!', 'success');
      } else {
        toast('Arquivo invalido!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deckPanel = (
    <div className="space-y-4">
      {/* Nome e ações */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Nome do deck..."
          value={currentDeckName}
          onChange={(e) => setDeckName(e.target.value)}
          className="w-full rounded-lg bg-bg-section px-3 py-3 text-text-primary placeholder-text-secondary/50 outline-none ring-1 ring-bg-section focus:ring-accent-blue sm:py-2"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-accent-green px-3 py-3 text-sm font-bold text-bg-primary active:scale-95 sm:py-2"
          >
            Salvar
          </button>
          <button
            onClick={() => {
              if (currentDeck.length > 0) {
                clearDeck();
                toast('Deck limpo', 'info');
              }
            }}
            className="rounded-lg bg-accent-red/20 px-4 py-3 text-sm text-accent-red hover:bg-accent-red/30 active:scale-95 sm:py-2"
          >
            Limpar
          </button>
        </div>
      </div>

      <DeckList cards={currentDeck} onRemoveCard={removeCard} />
      <DeckStats cards={currentDeck} />

      {/* Import/Export */}
      <div className="flex gap-2">
        <button
          onClick={() => importRef.current?.click()}
          className="flex-1 rounded-lg bg-bg-section px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary"
        >
          Importar
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {/* Decks salvos */}
      {decks.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-text-primary">Decks Salvos</h4>
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center gap-2 rounded-lg bg-bg-section p-2.5"
            >
              <button
                onClick={() => {
                  loadDeck(deck.id);
                  toast(`Deck "${deck.name}" carregado`, 'info');
                }}
                className="flex-1 truncate text-left text-sm text-text-primary hover:text-accent-blue"
              >
                {deck.name} ({deck.cards.length})
              </button>
              <button
                onClick={() => handleExport(deck.id)}
                className="shrink-0 rounded px-2 py-1 text-xs text-accent-blue hover:bg-accent-blue/10"
                title="Exportar"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteConfirm(deck.id)}
                className="shrink-0 rounded px-2 py-1 text-xs text-accent-red hover:bg-accent-red/10"
                title="Deletar"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Painel esquerdo - Busca */}
        <div className="flex-1 space-y-4">
          <CardSearch
            searchTerm={search.searchTerm}
            onSearchChange={search.setSearchTerm}
            selectedType={search.selectedType}
            onTypeChange={search.setSelectedType}
            selectedSupertype={search.selectedSupertype}
            onSupertypeChange={search.setSelectedSupertype}
            selectedSet={search.selectedSet}
            onSetChange={search.setSelectedSet}
            sets={search.sets}
          />

          <CardGrid
            cards={search.cards}
            isLoading={search.isLoading}
            isFetching={search.isFetching}
            onAddCard={handleAddCard}
          />

          {/* Paginação */}
          {search.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => search.setPage(Math.max(1, search.page - 1))}
                disabled={search.page === 1 || search.isFetching}
                className="rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary disabled:opacity-30 sm:py-2"
              >
                Anterior
              </button>
              <span className="text-sm tabular-nums text-text-secondary">
                {search.page} / {search.totalPages}
              </span>
              <button
                onClick={() => search.setPage(search.page + 1)}
                disabled={search.page >= search.totalPages || search.isFetching}
                className="rounded-lg bg-bg-section px-4 py-3 text-sm text-text-primary disabled:opacity-30 sm:py-2"
              >
                Proxima
              </button>
            </div>
          )}
        </div>

        {/* Painel direito - Deck (desktop) */}
        <div className="hidden w-80 shrink-0 lg:block">
          {deckPanel}
        </div>
      </div>

      {/* FAB mobile - Abrir deck drawer */}
      <button
        onClick={() => setDeckDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent-gold text-bg-primary shadow-xl active:scale-90 lg:hidden"
        aria-label="Ver deck"
      >
        <span className="text-lg font-bold">{currentDeck.length}</span>
      </button>

      {/* Deck drawer mobile */}
      <AnimatePresence>
        {deckDrawerOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeckDrawerOpen(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-bg-card p-4"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-bg-section" />
              {deckPanel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Deletar Deck"
        message="Tem certeza que quer deletar este deck? Essa acao nao pode ser desfeita."
        confirmLabel="Deletar"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            deleteDeck(deleteConfirm);
            toast('Deck deletado', 'info');
          }
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
