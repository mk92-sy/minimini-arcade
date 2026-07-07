import { games } from "../data/games.js";
import GameCard from "../components/GameCard.jsx";

export default function Home() {
  return (
    <div className="hub">
      <header className="hub__header">
        <div className="hub__logo">
          <span className="hub__bulbs" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ "--i": i }} />
            ))}
          </span>
          <span className="hub__logo-text">MINIMINI</span>
        </div>
        <p className="hub__eyebrow">8GAMES</p>
      </header>

      <section className="hub__grid" aria-label="게임 목록">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </section>

      <footer className="hub__footer">
        <span>Copyright ⓒ 2026 mk92-sy All Rights Reserved</span>
      </footer>
    </div>
  );
}
