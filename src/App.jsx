import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import ReactionGame from './games/ReactionGame.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/reaction" element={<ReactionGame />} />
      <Route path="/game/:id" element={<GamePlaceholder />} />
    </Routes>
  )
}
