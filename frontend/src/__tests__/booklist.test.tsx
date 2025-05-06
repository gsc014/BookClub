// src/__tests__/booklist.test.tsx

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mocked, MockInstance } from 'vitest'; // Import Mock
import axios, { AxiosStatic } from 'axios';

// Component to test
import Booklist from '../assets/booklist'; // Adjust path if needed

// --- Mocks ---
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// Mock the Bookcard component
vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book }) => ( // Use vi.fn() directly here
        <div data-testid={`bookcard-${book.id}`}>Mock Bookcard: {book.title}</div>
    ))
}));
// Import the mocked Bookcard to access the mock function
import MockBookcard from '../assets/bookcard';
const MockBookcardFn = vi.mocked(MockBookcard); // Get the typed mock function


// --- Test Suite ---
describe('Booklist Component', () => {
    const defaultApiUrl = 'http://127.0.0.1:8000/api/random-book/';
    const recommendedApiUrl = 'http://127.0.0.1:8000/api/recommended-book/';
    const mockBooksArray = [
        { id: 'a1', title: 'Book Alpha' }, // Use string IDs if that's what API returns
        { id: 'b2', title: 'Book Beta' },
        { id: 'c3', title: 'Book Gamma' },
    ];
    const mockSingleBook = { id: 'd4', title: 'Book Delta' };
    const defaultTitle = "Recommended Books"; // Match component default
    const mockAuthToken = 'list-test-token';
    let innerWidthSpy: MockInstance; // <-- Declare spy instance variable


    // Helper to set localStorage state
    const setLoginState = (loggedIn: boolean) => {
        if (loggedIn) {
            localStorage.setItem('authToken', mockAuthToken);
        } else {
            localStorage.removeItem('authToken');
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        MockBookcardFn.mockClear();
        localStorage.clear();

        mockedAxios.get.mockResolvedValue({ data: [] }); // Default empty resolve

        // Mock window.innerWidth using spyOn
        // Start with a typical desktop width
        innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    });

    afterEach(() => {
        // Restore the spy after each test
        innerWidthSpy.mockRestore(); // <-- Restore the spy
        vi.restoreAllMocks(); // Restore other mocks if any more spies are added
    });


    it('renders loading state initially and calls correct endpoint (logged out)', () => {
        setLoginState(false); // Ensure logged out
        // Prevent immediate resolution
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        render(<Booklist />); // Use default props

        expect(screen.getByText(`Loading ${defaultTitle.toLowerCase()}...`)).toBeInTheDocument();
        // Check axios was called with the DEFAULT URL and calculated num param
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl, // Expect random-book when logged out
            expect.objectContaining({ // Check params contain num
                params: expect.objectContaining({
                    num: expect.any(Number) // Check that num was calculated and sent
                })
            })
        );
    });

     it('renders loading state initially and calls correct endpoint (logged in)', () => {
        setLoginState(true); // Ensure logged in
        // Prevent immediate resolution
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        render(<Booklist />); // Use default props

        expect(screen.getByText(`Loading ${defaultTitle.toLowerCase()}...`)).toBeInTheDocument();
        // Check axios was called with the RECOMMENDED URL and calculated num param
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            recommendedApiUrl, // Expect recommended-book when logged in with default apiUrl
            expect.objectContaining({ // Check params contain num AND headers contain auth
                params: expect.objectContaining({
                    num: expect.any(Number)
                }),
                headers: expect.objectContaining({
                    Authorization: `Token ${mockAuthToken}`
                })
            })
        );
    });


    it('renders book cards after successful fetch (array response, logged in)', async () => {
        setLoginState(true);
        mockedAxios.get.mockResolvedValue({ data: mockBooksArray }); // Mock successful response

        render(<Booklist />);

        // Wait for loading to disappear
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });

        // Check API call (should be recommended endpoint)
         expect(mockedAxios.get).toHaveBeenCalledWith(
            recommendedApiUrl,
            expect.objectContaining({ params: expect.objectContaining({ num: expect.any(Number) }) })
        );

        // Check that the correct number of book cards are rendered
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);

        // Check specific book cards
        expect(screen.getByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockBooksArray[0].title}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bookcard-${mockBooksArray[1].id}`)).toBeInTheDocument();
    });

    it('renders a book card after successful fetch (single object response, logged out)', async () => {
        setLoginState(false);
        // Override mock for single object response
        mockedAxios.get.mockResolvedValue({ data: mockSingleBook });

        render(<Booklist />);

        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });

         // Check API call (should be random endpoint)
         expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl,
            expect.objectContaining({ params: expect.objectContaining({ num: expect.any(Number) }) })
        );

        // Check that exactly one book card is rendered
        expect(MockBookcardFn).toHaveBeenCalledTimes(1);

        // Check the specific book card
        expect(screen.getByTestId(`bookcard-${mockSingleBook.id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockSingleBook.title}`)).toBeInTheDocument();
    });


    it('renders "no books" message when fetch returns empty array', async () => {
        setLoginState(false); // Doesn't matter for empty response
        mockedAxios.get.mockResolvedValue({ data: [] }); // Mock empty array response

        render(<Booklist />);

        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });

        // Check for the correct "no books" message
        expect(screen.getByText(`No ${defaultTitle.toLowerCase()} available`)).toBeInTheDocument();
        expect(MockBookcardFn).not.toHaveBeenCalled(); // Ensure no cards rendered
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Verify API was called
    });

    it('renders error message when fetch fails', async () => {
        setLoginState(false); // Doesn't matter for error response
        const mockError = new Error('Network Error');
        mockedAxios.get.mockRejectedValue(mockError); // Mock API failure
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Booklist title="Custom List" />); // Use a custom title to check message

        await waitFor(() => {
            expect(screen.queryByText(/Loading custom list.../i)).not.toBeInTheDocument();
        });

        // Check for the correctly formatted error message
        expect(screen.getByText('Failed to load custom list')).toBeInTheDocument();
        expect(MockBookcardFn).not.toHaveBeenCalled();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching books for Custom List from http://127.0.0.1:8000/api/random-book/:', mockError);

        consoleErrorSpy.mockRestore();
    });

     it('uses custom apiUrl and params when provided', async () => {
         setLoginState(false); // Logged out
         const customApiUrl = 'http://example.com/api/custom-books/';
         const customParams = { genre: 'sci-fi' };
         const customTitle = 'Sci-Fi Books';
         mockedAxios.get.mockResolvedValue({ data: mockBooksArray }); // Mock successful response for custom URL

         render(<Booklist apiUrl={customApiUrl} params={customParams} title={customTitle} />);

         // Wait for loading to disappear
         await waitFor(() => {
             expect(screen.queryByText(`Loading ${customTitle.toLowerCase()}...`)).not.toBeInTheDocument();
         });

         // Check API call used the custom URL and merged params
         expect(mockedAxios.get).toHaveBeenCalledTimes(1);
         expect(mockedAxios.get).toHaveBeenCalledWith(
             customApiUrl,
             expect.objectContaining({
                 params: {
                     ...customParams, // Includes genre: 'sci-fi'
                     num: expect.any(Number) // Still includes calculated num
                 }
                 // No auth headers when logged out
             })
         );

          // Check cards rendered
         expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);
         expect(screen.getByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
     });

     it('uses custom apiUrl and params WITH auth when provided and logged in', async () => {
         setLoginState(true); // Logged in
         const customApiUrl = 'http://example.com/api/custom-books/';
         const customParams = { author: 'Clarke' };
         const customTitle = 'Clarke Books';
         mockedAxios.get.mockResolvedValue({ data: mockBooksArray });

         render(<Booklist apiUrl={customApiUrl} params={customParams} title={customTitle} />);

         await waitFor(() => {
             expect(screen.queryByText(`Loading ${customTitle.toLowerCase()}...`)).not.toBeInTheDocument();
         });

         // Check API call used custom URL, merged params, AND auth headers
         expect(mockedAxios.get).toHaveBeenCalledTimes(1);
         expect(mockedAxios.get).toHaveBeenCalledWith(
             customApiUrl,
             expect.objectContaining({
                 params: {
                     ...customParams,
                     num: expect.any(Number)
                 },
                 headers: expect.objectContaining({ // Should have auth header
                    'Authorization': `Token ${mockAuthToken}`
                 })
             })
         );
         expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);
     });
     it('re-fetches books with recalculated count on window resize', async () => {
        setLoginState(false); // Logged out example
        // Mock initial fetch
        mockedAxios.get.mockResolvedValueOnce({ data: mockBooksArray });

        render(<Booklist />);

        // Wait for initial load
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));
        // Check initial call was based on 1024 width (example calculation, adjust if needed)
        // Calculation: (1024 - 40) / (250 + 40) = 984 / 290 = 3.39 => floor(3.39) = 3 books/row => 3*3=9 books requested
        expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl,
            expect.objectContaining({ params: { num: 9 } }) // Based on 1024 width
        );
        expect(await screen.findByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();

        // --- Simulate Resize ---
        // Mock subsequent fetch after resize
        mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 'z9', title: 'Resized Book' }] }); // Different data
        // Change the mocked window width to a smaller size
        innerWidthSpy.mockReturnValue(500); // Simulate smaller screen

        // Dispatch the resize event
        fireEvent(window, new Event('resize'));

        // --- Verify Re-fetch ---
        // Wait for the second API call triggered by the resize effect
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(2));

        // Check the second call used the new width for calculation
        // Calculation: (500 - 40) / (250 + 40) = 460 / 290 = 1.58 => floor(1.58) = 1 book/row => 1*3=3 books requested
        expect(mockedAxios.get).toHaveBeenNthCalledWith(
            2, // The second call
            defaultApiUrl,
            expect.objectContaining({ params: { num: 3 } }) // Based on 500 width
        );

        // Verify the UI updated with the new data (optional but good)
        expect(await screen.findByTestId(`bookcard-z9`)).toBeInTheDocument();
        // Ensure old books are gone (if component replaces them)
        expect(screen.queryByTestId(`bookcard-${mockBooksArray[0].id}`)).not.toBeInTheDocument();
    });


});