// src/__tests__/toprated.test.tsx (Example filename)

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';

// Component to test
import TopRatedBooks from '../assets/toprated'; // Adjust path if needed

// --- Mocks ---
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true); // Typed mock for axios

// Mock the Bookcard component
vi.mock('../assets/bookcard', () => ({
    // Default export mock - check props passed to it
    default: vi.fn(({ book, isSmall }) => (
        <div data-testid={`bookcard-${book.id}`} data-issmall={isSmall}>
            Mock Bookcard: {book.title} (Small: {String(isSmall)})
        </div>
    ))
}));
// Import the mocked Bookcard to access the mock function
import MockBookcard from '../assets/bookcard'; // Adjust path
const MockBookcardFn = vi.mocked(MockBookcard); // Get the typed mock function

// --- Test Data ---
const mockTopBooks = [
    { id: 't1', title: 'Top Book One', key: 'OLT1M', author: 'Author A' },
    { id: 't2', title: 'Top Book Two', key: 'OLT2M', author: 'Author B' },
    { id: 't3', title: 'Top Book Three', key: 'OLT3M', author: { name: 'Author C' } }, // Mixed author types
];
const apiUrl = 'http://127.0.0.1:8000/api/highest-rated/';

// --- Test Suite ---
describe('TopRatedBooks Component', () => {
    // Spy for console.error
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks(); // Reset all mocks (axios, Bookcard)
        MockBookcardFn.mockClear(); // Clear calls specifically for Bookcard mock

        // Spy on console.error and silence it
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Default successful response (can be overridden)
        mockedAxios.get.mockResolvedValue({ data: [...mockTopBooks] });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore(); // Restore console spy
        vi.restoreAllMocks(); // Restore any other spies if added
    });

    it('renders loading state initially', () => {
        // Prevent immediate resolution to see loading state
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        render(<TopRatedBooks />);

        expect(screen.getByText(/Loading top books.../i)).toBeInTheDocument();
        // Check API was called with default limit
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } }) // Default limit is 5
        );
    });

    it('renders top rated books successfully after fetch', async () => {
        // beforeEach provides the successful mock by default
        render(<TopRatedBooks />);

        // Wait for loading to disappear
        await waitFor(() => {
            expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        });

        // Verify API call was made correctly
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } }) // Default limit
        );

        // Check if Bookcard was called for each book
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockTopBooks.length);

        // Check if specific book titles are rendered via the mock
        expect(screen.getByText(/Mock Bookcard: Top Book One/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Two/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Three/i)).toBeInTheDocument();

        // Check if Bookcard received the correct props (book object and isSmall=true)
        expect(MockBookcardFn).toHaveBeenCalledWith(
            expect.objectContaining({ book: mockTopBooks[0], isSmall: true }), {}
        );
        expect(MockBookcardFn).toHaveBeenCalledWith(
            expect.objectContaining({ book: mockTopBooks[1], isSmall: true }), {}
        );
         // Example check on the rendered mock element's attribute
         expect(screen.getByTestId(`bookcard-${mockTopBooks[0].id}`)).toHaveAttribute('data-issmall', 'true');
    });

    it('uses the custom limit prop when provided', async () => {
        const customLimit = 3;
        // Mock response data to match the limit for clarity, though not strictly required
        mockedAxios.get.mockResolvedValueOnce({ data: mockTopBooks.slice(0, customLimit) });

        render(<TopRatedBooks limit={customLimit} />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        });

        // Verify API was called with the custom limit
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: customLimit } }) // Custom limit used
        );

        // Check correct number of cards rendered
        expect(MockBookcardFn).toHaveBeenCalledTimes(customLimit);
        expect(screen.getByText(/Mock Bookcard: Top Book One/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Two/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Three/i)).toBeInTheDocument();
    });

    it('renders "No rated books found" message when API returns empty array', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [] }); // Mock empty response

        render(<TopRatedBooks />);

        // Wait for loading to disappear and message to appear
        expect(await screen.findByText(/No rated books found/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();

        // Ensure no book cards were rendered
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });

    it('renders error message and logs error when fetch fails', async () => {
        const mockError = new Error('API is down');
        mockedAxios.get.mockRejectedValueOnce(mockError); // Mock API failure

        render(<TopRatedBooks />);

        // Wait for error message to appear
        expect(await screen.findByText(/Failed to load top rated books/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();

        // Check that console.error was called
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching top rated books:", mockError);

        // Ensure no book cards were rendered
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });
});