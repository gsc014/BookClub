import { useParams } from 'react-router-dom';
import Game from './game';
import GamePage from './gamepage';

const GameRouter = () => {
    const { gameId } = useParams();
    console.log("got", gameId);
    if (gameId === "game1") {
        return <Game />;
    } else if (gameId === "game2") {
        return <GamePage />;
    } else {
        return <div>Game not found</div>;
    }
};

export default GameRouter;