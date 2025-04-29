// src/__tests__/booklist.test.tsx (or .jsx)

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock, Mocked } from 'vitest';
import axios, { AxiosStatic } from 'axios';

// Component to test
import Booklist from '../assets/booklist'; // Adjust path if needed

// --- Mocks ---

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// Mock the Bookcard component
vi.mock('../assets/bookcard', () => ({
    // Mock the default export which is the Bookcard component
    default: vi.fn(({ book }) => (
        <div data-testid={`bookcard-${book.id}`}>Mock Bookcard: {book.title}</div>
    ))
}));

// --- Test Suite ---

describe('Booklist Component', () => {
    const mockBooksArray = [
        { id: 1, title: 'Book Alpha' },
        { id: 2, title: 'Book Beta' },
        { id: 3, title: 'Book Gamma' },
    ];
    const mockSingleBook = { id: 4, title: 'Book Delta' };
    const booksToShow = 6; // Match the value in the component
    const expectedUrl = 'http://127.0.0.1:8000/random-book/';
    const expectedParams = { params: { num: booksToShow } };

    // Variable to hold the mock instance reference
    let MockBookcardInstance: Mock;

    beforeEach(async () => {
        // Dynamically import the mocked module to get the mock function instance
        const BookcardMockedModule = await import('../assets/bookcard');
        MockBookcardInstance = BookcardMockedModule.default as Mock;

        // Reset mocks before each test
        vi.clearAllMocks(); // Reset axios calls
        MockBookcardInstance.mockClear(); // Reset Bookcard calls/instances

        // Default mock for axios.get (successful fetch with array)
        // We will override this in specific tests if needed
        mockedAxios.get.mockResolvedValue({ data: mockBooksArray });
    });

    it('renders loading state initially', () => {
        // Prevent immediate resolution to see loading state
        mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Pending promise

        render(<Booklist />);

        expect(screen.getByText(/Loading recommended books/i)).toBeInTheDocument();
        // Check that axios was called (even though it hasn't resolved)
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, expectedParams);
    });

    it('renders book cards after successful fetch (array response)', async () => {
        // Use the default mock from beforeEach (resolves with mockBooksArray)
        render(<Booklist />);

        // Wait for the loading message to disappear
        await waitFor(() => {
            expect(screen.queryByText(/Loading recommended books/i)).not.toBeInTheDocument();
        });

        // Check that the correct number of book cards are rendered
        expect(MockBookcardInstance).toHaveBeenCalledTimes(mockBooksArray.length);

        // Check if specific book cards are rendered (by test id or content)
        expect(screen.getByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockBooksArray[0].title}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bookcard-${mockBooksArray[1].id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockBooksArray[1].title}`)).toBeInTheDocument();

        // Check API call details
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, expectedParams);
    });

    it('renders a book card after successful fetch (single object response)', async () => {
        // Override default mock for this test
        mockedAxios.get.mockResolvedValue({ data: mockSingleBook });

        render(<Booklist />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading recommended books/i)).not.toBeInTheDocument();
        });

        // Check that exactly one book card is rendered
        expect(MockBookcardInstance).toHaveBeenCalledTimes(1);

        // Check if the specific book card is rendered
        expect(screen.getByTestId(`bookcard-${mockSingleBook.id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockSingleBook.title}`)).toBeInTheDocument();

        // Check API call details
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, expectedParams);
    });


    it('renders "no books" message when fetch is successful but returns empty array', async () => {
        // Override default mock
        mockedAxios.get.mockResolvedValue({ data: [] });

        render(<Booklist />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading recommended books/i)).not.toBeInTheDocument();
        });

        // Check for the "no books" message
        expect(screen.getByText(/No recommended books available/i)).toBeInTheDocument();

        // Ensure no book cards were rendered
        expect(MockBookcardInstance).not.toHaveBeenCalled();

        // Check API call details
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, expectedParams);
    });

    it('renders error message when fetch fails', async () => {
        const errorMessage = 'Network Error';
        const mockError = new Error(errorMessage);
        // Override default mock
        mockedAxios.get.mockRejectedValue(mockError);

        // Spy on console.error (optional, but good practice)
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Booklist />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading recommended books/i)).not.toBeInTheDocument();
        });

        // Check for the specific error message displayed to the user
        expect(screen.getByText('Failed to load recommended books')).toBeInTheDocument();

        // Ensure no book cards were rendered
        expect(MockBookcardInstance).not.toHaveBeenCalled();

        // Check API call details
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl, expectedParams);

        // Check if console.error was called
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching books:', mockError);

        // Restore console.error spy
        consoleErrorSpy.mockRestore();
    });
});