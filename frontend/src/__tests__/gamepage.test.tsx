import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';

import GamePage from '../assets/gamepage';

vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

const mockInitialBooksUnshuffled = [
    { id: '1', title: 'Correct Book 1', description: 'Description for Book 1', is_correct: true },
    { id: '2', title: 'Wrong Book 1', description: 'Desc 2', is_correct: false },
    { id: '3', title: 'Wrong Book 2', description: 'Desc 3', is_correct: false },
];

const mockSecondSetOfBooksUnshuffled = [
    { id: '4', title: 'Correct Book 2', description: 'Description for Book 4', is_correct: true },
    { id: '5', title: 'Wrong Book 3', description: 'Desc 5', is_correct: false },
    { id: '6', title: 'Wrong Book 4', description: 'Desc 6', is_correct: false },
];
const mockMinimalBookData = [{ id: '1', title: 'Any Book', description: 'Any Desc', is_correct: true }];


const initialHighScore = 5;
const mockAuthToken = 'game-test-token';
const highScoreUrl = 'http://127.0.0.1:8000/api/high-score/';
const randomBookUrl = 'http://127.0.0.1:8000/random-book?num=5';
const apiHeaders = { headers: { Authorization: `Token ${mockAuthToken}` } };

describe('GamePage Component', () => {
    const originalLocalStorage = { ...window.localStorage };
    let mathRandomSpy: MockInstance;
    let consoleErrorSpy: MockInstance;


    beforeEach(() => {
        vi.clearAllMocks();

        window.localStorage.clear();
        window.localStorage.setItem = vi.fn((key, value) => { originalLocalStorage[key] = value; });
        window.localStorage.getItem = vi.fn((key) => originalLocalStorage[key] || null);
        window.localStorage.removeItem = vi.fn((key) => { delete originalLocalStorage[key]; });
        window.localStorage.setItem('authToken', mockAuthToken);

        mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        let bookFetchCount = 0;
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) {
                return { data: { high_score: initialHighScore } };
            }
            if (url === randomBookUrl) {
                bookFetchCount++;
                if (bookFetchCount === 1) {
                    return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
                } else {
                    return { data: JSON.parse(JSON.stringify(mockSecondSetOfBooksUnshuffled)) };
                }
            }
            throw new Error(`Unhandled GET request: ${url}`);
        });
        mockedAxios.post.mockResolvedValue({ data: { message: 'High score updated' } });
    });

    afterEach(() => {
        mathRandomSpy.mockRestore();
        window.localStorage.clear();
        Object.keys(originalLocalStorage).forEach(key => { window.localStorage.setItem(key, originalLocalStorage[key]); });
    });

    it('logs error if fetching high score fails', async () => {
        const highScoreError = new Error('High score API down');
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) {
                throw highScoreError;
            }
            if (url === randomBookUrl) {
                return { data: JSON.parse(JSON.stringify(mockMinimalBookData)) }; // Books succeed
            }
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);

        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching high score:', highScoreError);
        });

        await waitFor(() => {
           expect(mockedAxios.get).toHaveBeenCalledWith(highScoreUrl, apiHeaders);
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(randomBookUrl);
    });

    it('logs error if updating high score fails', async () => {
        const lowInitialHighScore = 0;
        const updateError = new Error('Update failed');
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: lowInitialHighScore } };
            if (url === randomBookUrl) return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
            throw new Error(`Unhandled GET request: ${url}`);
        });
        mockedAxios.post.mockRejectedValueOnce(updateError);

        render(<GamePage />);
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        await screen.findByText(`High Score: ${lowInitialHighScore}`);

        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled.find(b => b.is_correct)!.title });
        fireEvent.click(correctButton);

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(highScoreUrl, { high_score: 1 }, apiHeaders);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating high score:', updateError);
        });
    });



    it('renders loading state initially and fetches data', async () => {
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: initialHighScore } };
            if (url === randomBookUrl) return new Promise(() => { });
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);

        expect(screen.getByText(/loading new books/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith(highScoreUrl, apiHeaders);
            expect(mockedAxios.get).toHaveBeenCalledWith(randomBookUrl);
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('renders game elements after successful data fetch', async () => {
        render(<GamePage />);

        await waitFor(() => {
            expect(screen.queryByText(/loading new books/i)).not.toBeInTheDocument();
        });

        const correctBook = mockInitialBooksUnshuffled.find(b => b.is_correct);
        expect(screen.getByText(correctBook!.description)).toBeInTheDocument();

        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[0].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[1].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[2].title })).toBeInTheDocument();

        expect(screen.getByText(/current streak: 0/i)).toBeInTheDocument();
        expect(screen.getByText(`High Score: ${initialHighScore}`)).toBeInTheDocument();
    });

    it('handles error during book fetch', async () => {
        const errorMsg = 'Failed to fetch books. Please try again later.';
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: initialHighScore } };
            if (url === randomBookUrl) throw new Error('Network Error');
            throw new Error(`Unhandled GET request: ${url}`);
        });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<GamePage />);

        expect(await screen.findByText(errorMsg)).toBeInTheDocument();
        expect(screen.queryByText(/loading new books/i)).not.toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching random books:', expect.any(Error));
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);

        consoleErrorSpy.mockRestore();
    });

    it('handles correct guess, increments streak, and fetches new books', async () => {

        render(<GamePage />);

        const correctButtonInitial = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        fireEvent.click(correctButtonInitial);

        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, randomBookUrl);
        }, { timeout: 2000 });


        const correctBookSecond = mockSecondSetOfBooksUnshuffled.find(b => b.is_correct);
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
            expect(screen.getByText(correctBookSecond!.description)).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: mockSecondSetOfBooksUnshuffled[0].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSecondSetOfBooksUnshuffled[1].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockSecondSetOfBooksUnshuffled[2].title })).toBeInTheDocument();
    });

    it('handles incorrect guess and shows game over screen', async () => {
        render(<GamePage />);

        const incorrectButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[1].title });
        fireEvent.click(incorrectButton);

        expect(await screen.findByText(/game over!/i)).toBeInTheDocument();
        expect(screen.getByText(/your streak was: 0/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('restarts the game when "Try Again" is clicked', async () => {
        render(<GamePage />);
        const incorrectButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[1].title });
        fireEvent.click(incorrectButton);
        expect(await screen.findByText(/game over!/i)).toBeInTheDocument();

        const restartButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(restartButton);

        await waitFor(() => {
            expect(screen.queryByText(/game over!/i)).not.toBeInTheDocument();
        });

        expect(screen.getByText("Desc 3")).toBeInTheDocument();

        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[0].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[1].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[2].title })).toBeInTheDocument();
        expect(screen.getByText(/current streak: 0/i)).toBeInTheDocument();
    });

    it('updates high score state and calls API when streak exceeds high score', async () => {
        const lowInitialHighScore = 0;
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: lowInitialHighScore } };
            if (url === randomBookUrl) return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        expect(screen.getByText(`High Score: ${lowInitialHighScore}`)).toBeInTheDocument();

        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        fireEvent.click(correctButton);

        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
            expect(screen.getByText(/high score: 1/i)).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                highScoreUrl,
                { high_score: 1 }, 
                apiHeaders
            );
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('does NOT update high score state or call API when streak does not exceed high score', async () => {

        render(<GamePage />);
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        expect(screen.getByText(`High Score: ${initialHighScore}`)).toBeInTheDocument();

        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        fireEvent.click(correctButton);

        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
        });

        expect(screen.getByText(`High Score: ${initialHighScore}`)).toBeInTheDocument();

        expect(mockedAxios.post).not.toHaveBeenCalled();
        expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
});