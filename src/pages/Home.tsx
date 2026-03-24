import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Home() {
  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center gap-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="mb-3 text-4xl font-bold sm:text-5xl lg:text-6xl">
          <span className="text-accent-gold">Pocket</span>{' '}
          <span className="text-text-primary">TCG</span>
        </h1>
        <p className="mx-auto max-w-md text-base text-text-secondary sm:text-lg">
          Jogue Pokemon TCG com seus amigos. Todas as cartas, sem coleta.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:gap-4"
      >
        <Link
          to="/deck-builder"
          className="group flex items-center gap-3 rounded-xl bg-accent-blue px-8 py-4 text-lg font-bold text-white transition-transform active:scale-95 hover:scale-105"
        >
          <svg className="h-6 w-6 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Montar Deck
        </Link>
        <Link
          to="/game"
          className="group flex items-center gap-3 rounded-xl bg-accent-green px-8 py-4 text-lg font-bold text-bg-primary transition-transform active:scale-95 hover:scale-105"
        >
          <svg className="h-6 w-6 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Jogar Local
        </Link>
        <Link
          to="/multiplayer"
          className="group flex items-center gap-3 rounded-xl bg-accent-gold px-8 py-4 text-lg font-bold text-bg-primary transition-transform active:scale-95 hover:scale-105"
        >
          <svg className="h-6 w-6 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Jogar Online
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 grid max-w-2xl gap-4 px-4 sm:grid-cols-3"
      >
        {[
          { title: 'Monte seu Deck', desc: 'Busque entre milhares de cartas e monte decks de 60 cartas' },
          { title: 'Jogue Manual', desc: 'Arraste cartas, jogue moeda, role dado — voce controla tudo' },
          { title: 'Com Amigos', desc: 'Jogue online com amigos — crie uma sala e compartilhe o codigo' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-bg-card p-4 text-center">
            <h3 className="mb-1 text-sm font-bold text-text-primary">{item.title}</h3>
            <p className="text-xs text-text-secondary">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
