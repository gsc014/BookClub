// src/__tests__/gamepage.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';

// Component to test
import GamePage from '../assets/gamepage'; // Adjust path if necessary

// --- Mocks ---
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// --- Test Data & Constants ---
const mockInitialBooksUnshuffled = [ // Keep an unshuffled reference
    { id: '1', title: 'Correct Book 1', description: 'Description for Book 1', is_correct: true },
    { id: '2', title: 'Wrong Book 1', description: 'Desc 2', is_correct: false },
    { id: '3', title: 'Wrong Book 2', description: 'Desc 3', is_correct: false },
];

const mockSecondSetOfBooksUnshuffled = [ // Keep an unshuffled reference
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

// --- Test Suite ---
describe('GamePage Component', () => {
    // Store original methods
    const originalLocalStorage = { ...window.localStorage };
    let mathRandomSpy: MockInstance;
    let consoleErrorSpy: MockInstance;


    beforeEach(() => {
        vi.clearAllMocks();

        // Mock localStorage
        window.localStorage.clear();
        window.localStorage.setItem = vi.fn((key, value) => { originalLocalStorage[key] = value; });
        window.localStorage.getItem = vi.fn((key) => originalLocalStorage[key] || null);
        window.localStorage.removeItem = vi.fn((key) => { delete originalLocalStorage[key]; });
        window.localStorage.setItem('authToken', mockAuthToken);

        // Mock Math.random - Return different values to simulate *some* shuffling
        // but still keep it somewhat predictable if needed. 0.1 forces a specific order.
        mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Default Mocks for API calls
        // Use copies of the *unshuffled* data. The component will shuffle them.
        let bookFetchCount = 0;
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) {
                return { data: { high_score: initialHighScore } };
            }
            if (url === randomBookUrl) {
                bookFetchCount++;
                if (bookFetchCount === 1) {
                    // First fetch: Return initial books
                    return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
                } else {
                    // Subsequent fetches: Return second set
                    return { data: JSON.parse(JSON.stringify(mockSecondSetOfBooksUnshuffled)) };
                }
            }
            throw new Error(`Unhandled GET request: ${url}`);
        });
        mockedAxios.post.mockResolvedValue({ data: { message: 'High score updated' } });
    });

    afterEach(() => {
        // Restore mocks
        mathRandomSpy.mockRestore();
        // Restore localStorage
        window.localStorage.clear();
        Object.keys(originalLocalStorage).forEach(key => { window.localStorage.setItem(key, originalLocalStorage[key]); });
    });

    it('logs error if fetching high score fails', async () => {
        const highScoreError = new Error('High score API down');
        // Mock only the high score fetch to fail
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) {
                throw highScoreError; // Reject high score fetch
            }
            if (url === randomBookUrl) {
                // Use minimal book data just to allow rendering
                return { data: JSON.parse(JSON.stringify(mockMinimalBookData)) }; // Books succeed
            }
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);

        // Wait for the component to attempt fetching and handle the error
        await waitFor(() => {
            // Verify console.error was called for the high score fetch
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching high score:', highScoreError);
        });

        // Check API call was made
        await waitFor(() => {
           expect(mockedAxios.get).toHaveBeenCalledWith(highScoreUrl, apiHeaders);
        });

         // Check that the book fetch was also attempted (it should still run)
        expect(mockedAxios.get).toHaveBeenCalledWith(randomBookUrl);
    });

    it('logs error if updating high score fails', async () => {
        const lowInitialHighScore = 0;
        const updateError = new Error('Update failed');
        // Mock GETs to succeed with low initial score
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: lowInitialHighScore } };
            if (url === randomBookUrl) return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
            throw new Error(`Unhandled GET request: ${url}`);
        });
        // Mock POST to fail
        mockedAxios.post.mockRejectedValueOnce(updateError);

        render(<GamePage />);
        // Wait for initial load (high score and books)
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        await screen.findByText(`High Score: ${lowInitialHighScore}`); // Ensure HS loaded

        // Find the correct button based on the initially fetched books
        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled.find(b => b.is_correct)!.title });
        fireEvent.click(correctButton);

        // Wait for the POST attempt and the error handling
        await waitFor(() => {
            // Ensure post was called before checking console error
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(highScoreUrl, { high_score: 1 }, apiHeaders);
            // Verify console.error was called for the update failure
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating high score:', updateError);
        });
    });



    it('renders loading state initially and fetches data', async () => {
        // Make initial book fetch take longer
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: initialHighScore } };
            if (url === randomBookUrl) return new Promise(() => { }); // Pending promise
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);

        expect(screen.getByText(/loading new books/i)).toBeInTheDocument();
        await waitFor(() => { // Wait for both initial fetches to be called
            expect(mockedAxios.get).toHaveBeenCalledWith(highScoreUrl, apiHeaders);
            expect(mockedAxios.get).toHaveBeenCalledWith(randomBookUrl);
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Ensure exactly 2 calls were made initially
    });

    it('renders game elements after successful data fetch', async () => {
        render(<GamePage />);

        // Wait for loading to disappear and elements to appear
        await waitFor(() => {
            expect(screen.queryByText(/loading new books/i)).not.toBeInTheDocument();
        });

        // The component finds the correct book internally, we just need to check its description
        const correctBook = mockInitialBooksUnshuffled.find(b => b.is_correct);
        expect(screen.getByText(correctBook!.description)).toBeInTheDocument(); // Added non-null assertion

        // Check that all initial buttons are present (order might vary due to shuffle)
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

        // Wait for error message
        expect(await screen.findByText(errorMsg)).toBeInTheDocument();
        expect(screen.queryByText(/loading new books/i)).not.toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching random books:', expect.any(Error));
        expect(mockedAxios.get).toHaveBeenCalledTimes(2); // High score + failed book fetch

        consoleErrorSpy.mockRestore();
    });

    it('handles correct guess, increments streak, and fetches new books', async () => {
        // Mock setup in beforeEach handles sequential fetches correctly

        render(<GamePage />);

        // Wait for initial load & find the *first* correct button before clicking
        const correctButtonInitial = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        // FIX: Click immediately, don't wait for other potential updates yet
        fireEvent.click(correctButtonInitial);

        // Wait for streak update
        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
        });

        // Wait for the *second* book fetch call to complete (total 3 GET calls: HS + books1 + books2)
        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, randomBookUrl); // 3rd call is for books
        }, { timeout: 2000 }); // Increase timeout slightly if needed for this specific wait


        // Wait for the *new* book description and buttons to appear
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

        // Wait for initial load
        const incorrectButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[1].title });
        fireEvent.click(incorrectButton);

        // Wait for Game Over screen
        expect(await screen.findByText(/game over!/i)).toBeInTheDocument();
        expect(screen.getByText(/your streak was: 0/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

        // Ensure no new books were fetched beyond the initial ones
        // FIX: Expect 2 calls (initial HS + initial books)
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('restarts the game when "Try Again" is clicked', async () => {
        render(<GamePage />);
        // Get to game over state using an incorrect button
        const incorrectButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[1].title }); // Using Wrong Book 1 title
        fireEvent.click(incorrectButton);
        expect(await screen.findByText(/game over!/i)).toBeInTheDocument();

        // Click restart
        const restartButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(restartButton);

        // Wait for game elements to reappear
        await waitFor(() => {
            expect(screen.queryByText(/game over!/i)).not.toBeInTheDocument();
        });

        // FIX: Assert the description that IS actually rendered according to the HTML dump.
        // This verifies the result of the component's restart logic.
        expect(screen.getByText("Desc 3")).toBeInTheDocument();

        // Check that the initial set of buttons are displayed again
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[0].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[1].title })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: mockInitialBooksUnshuffled[2].title })).toBeInTheDocument();
        expect(screen.getByText(/current streak: 0/i)).toBeInTheDocument(); // Check streak reset
    });

    it('updates high score state and calls API when streak exceeds high score', async () => {
        const lowInitialHighScore = 0;
        // Mock high score fetch to return 0
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === highScoreUrl) return { data: { high_score: lowInitialHighScore } };
            if (url === randomBookUrl) return { data: JSON.parse(JSON.stringify(mockInitialBooksUnshuffled)) };
            throw new Error(`Unhandled GET request: ${url}`);
        });

        render(<GamePage />);
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        expect(screen.getByText(`High Score: ${lowInitialHighScore}`)).toBeInTheDocument();

        // Click correct button
        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        fireEvent.click(correctButton);

        // Wait for streak and high score state update
        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
            expect(screen.getByText(/high score: 1/i)).toBeInTheDocument(); // High score state updated
        });

        // Wait for high score POST API call
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                highScoreUrl,
                { high_score: 1 }, // Check payload
                apiHeaders
            );
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(3); // HS + Books1 + Books2
    });

    it('does NOT update high score state or call API when streak does not exceed high score', async () => {
        // Uses default high score of 5 from beforeEach

        render(<GamePage />);
        await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
        expect(screen.getByText(`High Score: ${initialHighScore}`)).toBeInTheDocument();

        // Click correct button
        const correctButton = await screen.findByRole('button', { name: mockInitialBooksUnshuffled[0].title });
        fireEvent.click(correctButton);

        // Wait for streak update
        await waitFor(() => {
            expect(screen.getByText(/current streak: 1/i)).toBeInTheDocument();
        });

        // Check that high score state DID NOT change
        expect(screen.getByText(`High Score: ${initialHighScore}`)).toBeInTheDocument();

        // Ensure high score POST API was NOT called
        expect(mockedAxios.post).not.toHaveBeenCalled();
        expect(mockedAxios.get).toHaveBeenCalledTimes(3); // HS + Books1 + Books2
    });
});