import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import ReactionGame from './games/ReactionGame.jsx'
import AuthButton from './components/common/AuthButton.jsx'
import AuthModal from './components/common/AuthModal.jsx'
import useDevToolsAccess from './hooks/useDevToolsAccess.js'
import useDevToolsGuard from './hooks/useDevToolsGuard.js'

export default function App() {
  const guardEnabled = useDevToolsAccess()
  useDevToolsGuard(guardEnabled)

  return (
    <>
      <AuthButton />
      <AuthModal />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/reaction" element={<ReactionGame />} />
        <Route path="/game/:id" element={<GamePlaceholder />} />
      </Routes>
    </>
  )
}
