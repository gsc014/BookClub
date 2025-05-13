
vi.mock('../assets/game', () => ({
    default: () => <div data-testid="mock-game">Mocked Game Component</div>
}));
vi.mock('../assets/gamepage', () => ({
    default: () => <div data-testid="mock-gamepage">Mocked GamePage Component</div>
}));

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GameRouter from '../assets/gamerouter'; 

describe('GameRouter Component', () => {
    const renderWithGameId = (gameId: string) => {
        render(
            <MemoryRouter initialEntries={[`/games/${gameId}`]}>
                <Routes>
                    <Route path="/games/:gameId" element={<GameRouter />} />
                </Routes>
            </MemoryRouter>
        );
    };

    test('renders Game component when gameId is "game1"', () => {
        renderWithGameId('game1');
        expect(screen.getByTestId('mock-game')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-gamepage')).not.toBeInTheDocument();
        expect(screen.queryByText('Game not found')).not.toBeInTheDocument();
    });

    test('renders GamePage component when gameId is "game2"', () => {
        renderWithGameId('game2');
        expect(screen.getByTestId('mock-gamepage')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-game')).not.toBeInTheDocument();
        expect(screen.queryByText('Game not found')).not.toBeInTheDocument();
    });

    test('renders "Game not found" for an unknown gameId', () => {
        renderWithGameId('unknown-game');
        expect(screen.getByText('Game not found')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-game')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-gamepage')).not.toBeInTheDocument();
    });

    test('renders "Game not found" for a different unknown gameId', () => {
        renderWithGameId('game3');
        expect(screen.getByText('Game not found')).toBeInTheDocument();
        expect(screen.queryByTestId('mock-game')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-gamepage')).not.toBeInTheDocument();
    });

    test('logs the gameId to the console', () => {
        const consoleSpy = vi.spyOn(console, 'log');
        renderWithGameId('game1');
        expect(consoleSpy).toHaveBeenCalledWith("got", "game1");
        consoleSpy.mockRestore();
    });
});