// src/__tests__/bookpage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import axios from 'axios';
import { useLocation, useParams, BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'; // Need BrowserRouter for Link

// --- Mock react-router-dom ---
interface LocationState {
    book: RetrievedBook | null; // Allow RetrievedBook type or null
}
const mockParams = { id: '123' }; // Default book ID from URL
const mockLocationState: LocationState = { book: null }; // Default empty location state
vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useParams: vi.fn(() => mockParams),
        useLocation: vi.fn(() => ({ // Mock location object structure
            pathname: `/books/${mockParams.id}`,
            search: '',
            hash: '',
            state: mockLocationState, // Use variable for state
            key: 'testKey',
        })),
    };
});

// --- Mock Axios ---
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// --- Mock Assets ---
vi.mock('../assets/pictures/no-results.png', () => ({ default: 'defaultCover.png' }));

// Component to test
import Bookpage from '../assets/bookpage'; // Adjust path if needed

// --- Test Data ---
const bookId = mockParams.id; // Use ID from params mock
interface Book { id: number | string; title: string; author: string; } // Keep Book type
interface RetrievedBook extends Book { description: string; cover: string; key: string; error?: string; }

const mockBookData = {
    id: bookId,
    title: 'The Test Book',
    author: 'Tester Q. Author',
    description: 'This is the full description of the test book. '.repeat(20), // Make it long
    cover: '98765', // Example cover ID
    key: 'OL987M', // Example OpenLibrary key needed for ISBN fetch
};
interface BookData {
    id: number;
    key: string; // Important for fetchIsbn
    title: string;
    description: string | null; // Can be string or null
    // Add any other properties your component might expect from a book object
    // For example:
    // author_name?: string[];
    // cover_i?: number;
}
const createLongString = (length: number): string => 'a'.repeat(length);

const mockBookLongDescription: BookData = {
    id: 1,
    key: 'OL123M',
    title: 'Test Book with Long Description',
    description: createLongString(301), // Longer than 300 chars
};

const mockBookShortDescription: BookData = {
    id: 2,
    key: 'OL456M',
    title: 'Test Book with Short Description',
    description: createLongString(100), // Shorter than 300 chars
};

const mockBookNoDescription: BookData = {
    id: 3,
    key: 'OL789M',
    title: 'Test Book with No Description',
    description: null,
};


const mockReviewsData = [
    { id: 1, username: 'reviewer1', rating: 5, text: 'Amazing read!', created_at: '2024-01-10T10:00:00Z' },
    { id: 2, username: 'reviewer2', rating: 3, text: 'It was okay.', created_at: '2024-01-09T14:30:00Z' },
];
const mockIsbnData = '978-3-16-148410-0';
const mockAuthToken = 'bookpage-token';

// --- API URLs ---
const bookApiUrl = `http://127.0.0.1:8000/api/book/${bookId}/`;
const reviewsApiUrl = `http://127.0.0.1:8000/api/reviews/${bookId}/`;
const isbnApiUrl = `http://127.0.0.1:8000/api/isbn/${mockBookData.key}`; // Use key from mockBookData
const reviewSubmitUrl = `http://127.0.0.1:8000/api/reviews/${bookId}/`; // POST URL

// Helper to render with Router context
const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};


// --- Test Suite ---
describe('Bookpage Component', () => {
    let alertSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        mockLocationState.book = null;
        (useLocation as any).mockReturnValue({
            pathname: `/book/${mockParams.id}`,
            search: '',
            hash: '',
            state: mockLocationState,
            key: 'testKey',
        });
        (useParams as any).mockReturnValue(mockParams);

        localStorage.clear();
        vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
            if (key === 'authToken') return mockAuthToken;
            if (key === 'username') return 'TestUser';
            return null;
        });
        vi.spyOn(window.localStorage.__proto__, 'setItem');
        vi.spyOn(window.localStorage.__proto__, 'removeItem');

        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Properly define as spy

        mockedAxios.get.mockImplementation((url: string) => {
            if (url.includes(`/api/book/${mockBookData.id}/`)) return Promise.resolve({ data: mockBookData });
            if (url.includes(`/api/isbn/${mockBookData.key}`)) return Promise.resolve({ data: '1234567890ABC' });
            if (url.includes(`/api/reviews/${mockBookData.id}/`)) return Promise.resolve({ data: mockReviewsData });
            return Promise.reject(new Error(`Unhandled axios GET request in mock: ${url}`));
        });

        mockedAxios.post.mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        cleanup();
    });

    // --- Rendering and Initial Load ---
    describe('Initial Rendering and Data Loading', () => {
        it('shows loading state initially if no book data in location state', () => {
            mockLocationState.book = null; // Ensure no state book
            // Prevent book fetch resolve
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === bookApiUrl) return new Promise(() => { });
                return { data: [] }; // Allow others
            });
            renderWithRouter(<Bookpage />);
            expect(screen.getByText(/Loading book details.../i)).toBeInTheDocument();
            expect(mockedAxios.get).toHaveBeenCalledWith(bookApiUrl);
        });

        it('renders error message if book fetch fails', async () => {
            const error = new Error('Book not found');
            // Mock ONLY book fetch to fail
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === bookApiUrl) throw error;
                if (url === reviewsApiUrl) return { data: [] }; // Allow others to proceed or fail
                if (url === isbnApiUrl) return { data: '' };
                throw new Error(`Unhandled GET: ${url}`);
            });

            renderWithRouter(<Bookpage />);

            expect(await screen.findByText(/Failed to load book details/i)).toBeInTheDocument();
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching book details:", error);
            expect(screen.queryByText(/Loading book details.../i)).not.toBeInTheDocument();
            // Reviews/ISBN might not be fetched or rendered depending on timing
            expect(screen.queryByText(/Reviews/i)).not.toBeInTheDocument();
        });

        it('handles ISBN fetch error gracefully (shows fallback)', async () => {
            const isbnError = new Error('ISBN lookup failed');
            // Mock ONLY ISBN fetch to fail
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === bookApiUrl) return { data: { ...mockBookData } };
                if (url === reviewsApiUrl) return { data: [...mockReviewsData] };
                if (url === isbnApiUrl) throw isbnError;
                throw new Error(`Unhandled GET: ${url}`);
            });

            renderWithRouter(<Bookpage />);

            // Wait for book details and reviews
            expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
            expect(await screen.findByText(mockReviewsData[0].text)).toBeInTheDocument();

            // Check ISBN fallback text is shown
            expect(await screen.findByText(/ISBN not available/i)).toBeInTheDocument();
            // Check link is NOT shown
            expect(screen.queryByRole('link', { name: /view on national library/i })).not.toBeInTheDocument();
            // Check console error for ISBN
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching ISBN:', isbnError);
        });
    });

    // --- Description Toggle ---
    describe('Description Toggle', () => {
        it('toggles description from truncated to expanded and back', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockBookLongDescription });
            renderWithRouter(<Bookpage />);

            const toggleButton = await screen.findByRole('button', { name: /View More/i });
            const descriptionDiv = screen.getByTestId('book-description');

            // Expand description
            fireEvent.click(toggleButton);
            expect(descriptionDiv).toHaveClass('animating-expand');
            await waitFor(() => expect(descriptionDiv).toHaveClass('expanded'));

            // Collapse description
            fireEvent.click(toggleButton);
            expect(descriptionDiv).toHaveClass('animating-collapse');
            await waitFor(() => expect(descriptionDiv).toHaveClass('truncated'));
        });

        it('does not show toggle button for short descriptions', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockBookShortDescription });
            renderWithRouter(<Bookpage />);
            expect(await screen.findByText(mockBookShortDescription.description!)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /View More/i })).not.toBeInTheDocument();
        });
    });

    // --- Review Form ---
    describe('Review Form', () => {
        it('updates review text input on change', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Bookpage />);
            const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
            await user.type(reviewInput, 'Typing a review');
            expect(reviewInput).toHaveValue('Typing a review');
        });

        it('shows alert if submitting without selecting a rating', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Bookpage />);
            // Wait for form elements
            const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
            const submitButton = screen.getByRole('button', { name: /Submit Review/i });

            await user.type(reviewInput, 'Some text'); // Add text
            await user.click(submitButton); // Click submit without rating

            expect(alertSpy).toHaveBeenCalledTimes(1);
            expect(alertSpy).toHaveBeenCalledWith("Please select a rating before submitting your review.");
            expect(mockedAxios.post).not.toHaveBeenCalled(); // API not called
        });

        it('shows alert if submitting without being logged in', async () => {
            const user = userEvent.setup();
            localStorage.removeItem('authToken'); // Log out
            vi.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue(null); // Ensure mock reflects logged out

            renderWithRouter(<Bookpage />);

            // Inline steps for submitting a review
            const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
            const stars = await screen.findAllByText(/★/i);
            const submitButton = screen.getByRole('button', { name: /Submit Review/i });

            await user.type(reviewInput, 'Review text');
            await user.click(stars[3]); // Select 4 stars (0-indexed)
            await user.click(submitButton);

            expect(alertSpy).toHaveBeenCalledTimes(1);
            expect(alertSpy).toHaveBeenCalledWith("You must be logged in to submit a review.");
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('submits a review successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Review submitted' } });
            renderWithRouter(<Bookpage />);
            const user = userEvent.setup();

            const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
            const stars = await screen.findAllByText(/★/i);
            const submitButton = screen.getByRole('button', { name: /Submit Review/i });

            await user.type(reviewInput, 'Great book!');
            await user.click(stars[4]); // Select 5 stars (0-indexed)
            await user.click(submitButton);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining(`/api/reviewtest/${mockParams.id}/`), // Updated endpoint
                { rating: 5, text: 'Great book!' },
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Token ${mockAuthToken}`,
                    },
                })
            );
        });

        it('shows alert and logs console error for error on review submit', async () => {
            const user = userEvent.setup();
            const genericError = new Error('Network Failure');
            mockedAxios.post.mockRejectedValueOnce(genericError);

            renderWithRouter(<Bookpage />);

            // Inline steps for submitting a review
            const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
            const stars = await screen.findAllByText(/★/i);
            const submitButton = screen.getByRole('button', { name: /Submit Review/i });

            await user.type(reviewInput, 'Another failure attempt.');
            await user.click(stars[2]); // Select 3 stars (0-indexed)
            await user.click(submitButton);

            await waitFor(() => {
                expect(alertSpy).toHaveBeenCalledWith("Failed to submit review. Please try again.");
                expect(consoleErrorSpy).toHaveBeenCalledWith("Error submitting review:", genericError);
            });
        });
    });

    // --- ISBN Fetch ---
    describe('ISBN Fetch', () => {
        it('displays fallback when ISBN fetch fails', async () => {
            mockedAxios.get.mockImplementation((url) => {
                if (url.includes(`/api/book/${mockBookData.id}/`)) return Promise.resolve({ data: mockBookData });
                if (url.includes(`/api/isbn/${mockBookData.key}`)) return Promise.reject(new Error('ISBN fetch failed'));
                return Promise.resolve({ data: [] });
            });
            renderWithRouter(<Bookpage />);
            expect(await screen.findByText(/ISBN not available/i)).toBeInTheDocument();
        });

        it('handles invalid ISBN fetch gracefully', async () => {
            mockedAxios.get.mockImplementation((url) => {
                if (url.includes(`/api/book/${mockBookData.id}/`)) return Promise.resolve({ data: mockBookData });
                if (url.includes(`/api/isbn/${mockBookData.key}`)) return Promise.reject(new Error('Invalid ISBN fetch'));
                return Promise.resolve({ data: [] });
            });

            renderWithRouter(<Bookpage />);
            expect(await screen.findByText(/ISBN not available/i)).toBeInTheDocument();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching ISBN:', expect.any(Error)); // Use consoleErrorSpy
        });
    });

    const renderAndWaitForBookpage = async (bookData: BookData): Promise<RenderResult> => {
        mockedAxios.get.mockImplementation((url: string) => {
            if (url.includes(`/api/book/${bookData.id}/`)) {
                return Promise.resolve({ data: bookData });
            }
            if (bookData.key && url.includes(`/api/isbn/${bookData.key}`)) {
                return Promise.resolve({ data: '1234567890ABC' });
            }
            if (url.includes(`/api/reviews/${bookData.id}/`)) {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error(`Unhandled axios GET request in mock: ${url}`));
        });

        let renderResult: RenderResult;
        await act(async () => {
             renderResult = render(
                <MemoryRouter initialEntries={[{ pathname: `/book/${bookData.id}`, state: { book: bookData } }]}>
                    <Routes>
                        <Route path="/book/:id" element={<Bookpage />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        await screen.findByTestId('book-description');
        return renderResult!;
    };
});

describe('Bookpage Component - Remaining Coverage', () => {
    let consoleErrorSpy: MockInstance;
    
    beforeEach(() => {
        vi.resetAllMocks();
        mockLocationState.book = null;
        (useLocation as any).mockReturnValue({
            pathname: `/book/${mockParams.id}`,
            search: '',
            hash: '',
            state: mockLocationState,
            key: 'testKey',
        });
        (useParams as any).mockReturnValue(mockParams);

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Create console error spy
    });

    describe('fetchIsbn Function', () => {
        it('does not fetch ISBN if book.key is missing', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: { ...mockBookData, key: null } });
            renderWithRouter(<Bookpage />);
            expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
            expect(screen.queryByText(/ISBN not available/i)).toBeInTheDocument();
            expect(mockedAxios.get).not.toHaveBeenCalledWith(isbnApiUrl);
        });

        it('handles invalid ISBN fetch gracefully', async () => {
            const isbnError = new Error('Invalid ISBN fetch');
            mockedAxios.get.mockImplementation((url) => {
                if (url.includes(`/api/book/${mockBookData.id}/`)) return Promise.resolve({ data: mockBookData });
                if (url.includes(`/api/isbn/${mockBookData.key}`)) return Promise.reject(isbnError);
                return Promise.resolve({ data: [] });
            });

            renderWithRouter(<Bookpage />);
            expect(await screen.findByText(/ISBN not available/i)).toBeInTheDocument();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching ISBN:', isbnError); // Use consoleErrorSpy
        });
    });

    // Fix for the StateBook Handling test section in bookpage.test.tsx

    describe('StateBook Handling', () => {
        it('uses stateBook if provided and matches the URL id', async () => {
            // Use numeric id that matches mockParams.id
            const numericId = parseInt(mockParams.id);
            mockLocationState.book = { ...mockBookData, id: numericId };
            
            // Reset axios mocks to track calls
            mockedAxios.get.mockClear();
            
            // Mock different axios responses for different endpoints
            mockedAxios.get.mockImplementation((url) => {
                if (url.includes(`/api/book/${mockParams.id}/`)) {
                    return Promise.resolve({ data: mockBookData });
                }
                if (url.includes(`/api/reviews/${mockParams.id}/`)) {
                    return Promise.resolve({ data: mockReviewsData });
                }
                if (url.includes(`/api/isbn/${mockBookData.key}`)) {
                    return Promise.resolve({ data: mockIsbnData });
                }
                return Promise.reject(new Error(`Unhandled GET: ${url}`));
            });
            
            renderWithRouter(<Bookpage />);

            // Ensure the book data is rendered
            expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();

            // Assert that the book data fetch is NOT called
            expect(mockedAxios.get).not.toHaveBeenCalledWith(bookApiUrl);

            // Assert that reviews and ISBN fetches are still called
            const reviewCalls = mockedAxios.get.mock.calls.filter(call => 
                typeof call[0] === 'string' && call[0].includes(`/api/reviews/${mockParams.id}/`)
            );
            expect(reviewCalls.length).toBeGreaterThan(0);
            
            const isbnCalls = mockedAxios.get.mock.calls.filter(call => 
                typeof call[0] === 'string' && call[0].includes(`/api/isbn/${mockBookData.key}`)
            );
            expect(isbnCalls.length).toBeGreaterThan(0);
        });

        it('fetches book data if stateBook id does not match URL id', async () => {
            // Important: Make sure mockedAxios.get correctly returns Promises for all URLs
            mockedAxios.get.mockImplementation((url) => {
                if (url.includes(`/api/book/${mockParams.id}/`)) {
                    return Promise.resolve({ data: mockBookData });
                }
                if (url.includes(`/api/reviews/${mockParams.id}/`)) {
                    return Promise.resolve({ data: mockReviewsData });
                }
                if (url.includes(`/api/isbn/`)) {  // Handle any ISBN URL, even if key changes
                    return Promise.resolve({ data: mockIsbnData });
                }
                // Default case for any other URL
                return Promise.resolve({ data: {} });
            });
            
            // Set a book state with mismatched ID
            mockLocationState.book = { ...mockBookData, id: 999 }; // Mismatched id
            
            renderWithRouter(<Bookpage />);

            // Ensure the book data is rendered - wait for it to appear
            expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();

            // Assert that the book data fetch is called
            expect(mockedAxios.get).toHaveBeenCalledWith(bookApiUrl);

            // The reviews and ISBN tests might be more reliable with waitFor
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(reviewsApiUrl);
            });
            
            // Check that an ISBN call was made - but be flexible about the exact key
            // since it might come from the new book data
            const isbnCalls = mockedAxios.get.mock.calls.filter(call => 
                typeof call[0] === 'string' && call[0].includes(`/api/isbn/`)
            );
            expect(isbnCalls.length).toBeGreaterThan(0);
        });
    });
});