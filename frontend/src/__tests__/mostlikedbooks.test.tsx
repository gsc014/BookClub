// src/__tests__/mostlikedbooks.test.tsx (Example filename)

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter for Bookcard's Link

// Component to test
import MostLikedBooks from '../assets/mostLikedBooks'; // Adjust path if needed

// --- Mocks ---
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true); // Typed mock for axios

// Mock the Bookcard component - Assuming it needs Router context because it contains Links
vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book, isSmall }) => (
        <div data-testid={`bookcard-${book.id}`} data-issmall={isSmall}>
            {/* Minimal render for testing props */}
            <span>Mock Card: {book.title}</span>
        </div>
    ))
}));
// Import the mocked Bookcard to access the mock function
import MockBookcard from '../assets/bookcard'; // Adjust path
const MockBookcardFn = vi.mocked(MockBookcard); // Get the typed mock function

// --- Test Data ---
const mockLikedBooks = [
    { id: 'l1', title: 'Liked Book 1', key: 'OLL1M', author: 'Author Liked A', likes_count: 150 },
    { id: 'l2', title: 'Liked Book 2', key: 'OLL2M', author: 'Author Liked B', likes_count: 125 },
    { id: 'l3', title: 'Liked Book 3', key: 'OLL3M', author: { name: 'Author Liked C' }, likes_count: 99 },
];
const apiUrl = 'http://127.0.0.1:8000/api/most-liked/';

// Helper function to render with Router context needed if Bookcard uses <Link>
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

// --- Test Suite ---
describe('MostLikedBooks Component', () => {
    // Spy for console.error
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        MockBookcardFn.mockClear(); // Clear bookcard mock specifically

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Default successful response
        mockedAxios.get.mockResolvedValue({ data: [...mockLikedBooks] });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        // Prevent immediate resolution
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<MostLikedBooks />);

        expect(screen.getByText(/Loading popular books.../i)).toBeInTheDocument();
        // Check API was called with default limit
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } }) // Default limit is 5
        );
    });

    it('renders the list of most liked books successfully after fetch', async () => {
        // beforeEach provides the successful mock
        renderWithRouter(<MostLikedBooks />);

        // Wait for loading to disappear
        await waitFor(() => {
            expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();
        });

        // Verify API call
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } }) // Default limit
        );

        // Check if Bookcard was called for each book and with correct props
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockLikedBooks.length);
        expect(MockBookcardFn).toHaveBeenCalledWith(
             expect.objectContaining({ book: mockLikedBooks[0], isSmall: true }), {}
        );
         expect(MockBookcardFn).toHaveBeenCalledWith(
             expect.objectContaining({ book: mockLikedBooks[1], isSmall: true }), {}
         );

        // Check if like counts are rendered correctly next to the card
        for (const book of mockLikedBooks) {
            // Find the specific liked-book-card container
            const bookcardElement = screen.getByTestId(`bookcard-${book.id}`);
            // Use closest on the found element to get the parent .liked-book-card
            const likedBookCardElement = bookcardElement.closest('.liked-book-card');
            expect(likedBookCardElement).toBeInTheDocument(); // Ensure the container was found

            // FIX: Use type assertion 'as HTMLElement'
            const utils = within(likedBookCardElement as HTMLElement);

            expect(utils.getByText('❤️')).toBeInTheDocument(); // Check heart icon
            expect(utils.getByText(book.likes_count.toString())).toBeInTheDocument(); // Check like count
        }
    });

    it('uses the custom limit prop when provided', async () => {
        const customLimit = 2;
        // Mock response data to match the limit
        mockedAxios.get.mockResolvedValueOnce({ data: mockLikedBooks.slice(0, customLimit) });

        renderWithRouter(<MostLikedBooks limit={customLimit} />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();
        });

        // Verify API was called with the custom limit
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: customLimit } }) // Custom limit used
        );

        // Check correct number of cards rendered
        expect(MockBookcardFn).toHaveBeenCalledTimes(customLimit);
        expect(screen.getByTestId(`bookcard-${mockLikedBooks[0].id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bookcard-${mockLikedBooks[1].id}`)).toBeInTheDocument();
        expect(screen.queryByTestId(`bookcard-${mockLikedBooks[2].id}`)).not.toBeInTheDocument(); // 3rd book shouldn't be there

        // Check like counts for the rendered books
        const card1 = screen.getByTestId(`bookcard-${mockLikedBooks[0].id}`).closest('.liked-book-card');
        expect(within(card1 as HTMLElement).getByText(mockLikedBooks[0].likes_count.toString())).toBeInTheDocument();
        const card2 = screen.getByTestId(`bookcard-${mockLikedBooks[1].id}`).closest('.liked-book-card');
        expect(within(card2 as HTMLElement).getByText(mockLikedBooks[1].likes_count.toString())).toBeInTheDocument();
    });

    it('renders "No popular books found" message when API returns empty array', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [] }); // Mock empty response

        renderWithRouter(<MostLikedBooks />);

        // Wait for loading to disappear and message to appear
        expect(await screen.findByText(/No popular books found/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();

        // Ensure no book cards were rendered
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });

    it('renders error message and logs error when fetch fails', async () => {
        const mockError = new Error('Database connection failed');
        mockedAxios.get.mockRejectedValueOnce(mockError); // Mock API failure

        renderWithRouter(<MostLikedBooks />);

        // Wait for error message to appear
        expect(await screen.findByText(/Failed to load popular books/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();

        // Check that console.error was called
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching most liked books:", mockError);

        // Ensure no book cards were rendered
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });
});