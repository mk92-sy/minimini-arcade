import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import ReactionGame from './games/ReactionGame.jsx'
import useDevToolsAccess from './hooks/useDevToolsAccess.js'
import useDevToolsGuard from './hooks/useDevToolsGuard.js'

export default function App() {
  const guardEnabled = useDevToolsAccess()
  useDevToolsGuard(guardEnabled)

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/reaction" element={<ReactionGame />} />
      <Route path="/game/:id" element={<GamePlaceholder />} />
    </Routes>
  )
}
