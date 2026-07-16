import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import Store from './pages/Store.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'
import ReactionGame from './games/ReactionGame.jsx'
import GuessGame from './games/GuessGame.jsx'
import SpotGame from './games/SpotGame.jsx'
import Game2048 from './games/Game2048.jsx'
import MoleGame from './games/MoleGame.jsx'
import MemoryGame from './games/MemoryGame.jsx'
import RunnerGame from './games/RunnerGame.jsx'
import TypingGame from './games/TypingGame.jsx'
import Header from './components/common/Header.jsx'
import AnnouncementBar from './components/common/AnnouncementBar.jsx'
import BottomNav from './components/common/BottomNav.jsx'
import AuthModal from './components/common/AuthModal.jsx'
import CoinAwardModal from './components/common/CoinAwardModal.jsx'
import useDevToolsAccess from './hooks/useDevToolsAccess.js'
import useDevToolsGuard from './hooks/useDevToolsGuard.js'

export default function App() {
  const guardEnabled = useDevToolsAccess()
  useDevToolsGuard(guardEnabled)

  return (
    <>
      <div className="app-header-group">
        <Header />
        <AnnouncementBar />
      </div>
      <AuthModal />
      <CoinAwardModal />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/reaction" element={<ReactionGame />} />
          <Route path="/game/guess" element={<GuessGame />} />
          <Route path="/game/spot" element={<SpotGame />} />
          <Route path="/game/2048" element={<Game2048 />} />
          <Route path="/game/mole" element={<MoleGame />} />
          <Route path="/game/memory" element={<MemoryGame />} />
          <Route path="/game/runner" element={<RunnerGame />} />
          <Route path="/game/typing" element={<TypingGame />} />
          <Route path="/game/:id" element={<GamePlaceholder />} />
          <Route path="/store" element={<Store />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  )
}
