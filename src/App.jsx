import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import Store from './pages/Store.jsx'
import Notifications from './pages/Notifications.jsx'
import Settings from './pages/Settings.jsx'
import ReactionGame from './games/ReactionGame.jsx'
import Header from './components/common/Header.jsx'
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
      <Header />
      <AuthModal />
      <CoinAwardModal />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/reaction" element={<ReactionGame />} />
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
