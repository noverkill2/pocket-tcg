import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { GamePage } from './pages/GamePage';
import { MultiplayerPage } from './pages/MultiplayerPage';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg-primary">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deck-builder" element={<DeckBuilderPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/multiplayer" element={<MultiplayerPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
