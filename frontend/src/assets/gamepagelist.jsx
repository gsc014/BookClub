import { Link } from "react-router-dom";
import './style/gamepagelist.css';

const games = [
    { id: "game1", name: "Guess the Cover" },
    { id: "game2", name: "Guess the Description" }
];


const GameListPage = () => {
    return (
        <div className="game-list-container">
            <h1 className="game-list-title">Available Games</h1>
            <div className="game-card-grid">
                {games.map((game) => (
                    <Link to={`/games/${game.id}`} key={game.id} className="game-card-link">
                        <div className="game-card">
                            <h2>{game.name}</h2>
                            <p>{game.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
export default GameListPage;