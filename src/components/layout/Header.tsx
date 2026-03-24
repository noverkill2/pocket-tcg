import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/deck-builder', label: 'Deck Builder' },
    { to: '/game', label: 'Jogar' },
    { to: '/multiplayer', label: 'Online' },
  ];

  return (
    <header className="border-b border-bg-section bg-bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-text-primary">
          <span className="text-accent-gold">Pocket</span> TCG
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                location.pathname === link.to
                  ? 'bg-bg-section font-bold text-accent-gold'
                  : 'text-text-secondary hover:bg-bg-section/50 hover:text-text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-section sm:hidden"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="border-t border-bg-section px-4 pb-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-4 py-3 text-sm transition-colors ${
                location.pathname === link.to
                  ? 'bg-bg-section font-bold text-accent-gold'
                  : 'text-text-secondary hover:bg-bg-section/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
