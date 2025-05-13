import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameListPage from '../assets/gamepagelist';

const expectedGames = [
    { id: "game1", name: "Guess the Cover" },
    { id: "game2", name: "Guess the Description" }
];

describe('GameListPage Component', () => {
    const renderComponent = () => {
        render(
            <MemoryRouter>
                <GameListPage />
            </MemoryRouter>
        );
    };

    test('renders the main title', () => {
        renderComponent();
        const titleElement = screen.getByRole('heading', { name: /Available Games/i, level: 1 });
        expect(titleElement).toBeInTheDocument();
    });

    test('renders the correct number of game cards', () => {
        renderComponent();
        const gameLinks = screen.getAllByRole('link');
        expect(gameLinks).toHaveLength(expectedGames.length);
    });

    test('renders each game with its correct name and link', () => {
        renderComponent();

        expectedGames.forEach((game) => {
            const gameNameElement = screen.getByRole('heading', { name: game.name, level: 2 });
            expect(gameNameElement).toBeInTheDocument();

            const linkElement = screen.getByRole('link', { name: game.name });
            expect(linkElement).toBeInTheDocument();
            expect(linkElement).toHaveAttribute('href', `/games/${game.id}`);
        });
    });

    test('renders a paragraph for game description (even if empty)', () => {
        renderComponent();

        expectedGames.forEach((game) => {
            const linkElement = screen.getByRole('link', { name: game.name });
            const descriptionElement = linkElement.querySelector('p');
            expect(descriptionElement).toBeInTheDocument();
        });
    });

    test('each game card has the correct structure (name and description placeholder)', () => {
        renderComponent();
        const gameCards = screen.getAllByRole('link');

        gameCards.forEach((card, index) => {
            const expectedGame = expectedGames[index];

            const nameElement = card.querySelector('h2');
            expect(nameElement).toHaveTextContent(expectedGame.name);

            const descriptionParagraph = card.querySelector('p');
            expect(descriptionParagraph).toBeInTheDocument();
        });
    });
});