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
    let consoleLogSpy: MockInstance;


    const submitReview = async (reviewText: string, rating: number) => {
        const user = userEvent.setup();
        // Wait for elements needed for submission to appear
        const reviewInput = await screen.findByPlaceholderText(/Share your thoughts/i);
        const stars = await screen.findAllByText(/★/i); // Wait for stars
        const submitButton = screen.getByRole('button', { name: /Submit Review/i }); // Should be present after load

        // Only type if reviewText is not empty to avoid userEvent error
        if (reviewText) {
            await user.type(reviewInput, reviewText);
        }

        // Click the star corresponding to the rating (adjust if rating is 0)
        if (rating > 0 && rating <= stars.length) {
            await user.click(stars[rating - 1]); // 0-indexed
        }

        // Click the submit button
        await user.click(submitButton);
    };


    // In your bookpage.test.tsx

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

        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { }); // Keep this to suppress expected errors
        // consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { }); // <<<<<<< TEMPORARILY REMOVE/COMMENT THIS LINE

        // Default Axios mocks...
        mockedAxios.get.mockImplementation((url: string) => {
            const targetBookPath = `/api/book/${mockBookData.id}/`;
            const targetIsbnPath = mockBookData.key ? `/api/isbn/${mockBookData.key}` : null;
            const targetReviewsPath = `/api/reviews/${mockBookData.id}/`;
        
            console.log(`[AXIOS MOCK] Received GET: "${url}"`);
            console.log(`  - Comparing with book path: "${targetBookPath}" (bookData.id: ${mockBookData.id})`);
            if (targetIsbnPath) console.log(`  - Comparing with ISBN path: "${targetIsbnPath}" (bookData.key: ${mockBookData.key})`);
            console.log(`  - Comparing with reviews path: "${targetReviewsPath}"`);
        
            if (url.includes(targetBookPath)) {
                console.log(`[AXIOS MOCK] MATCHED book path. Resolving.`);
                return Promise.resolve({ data: mockBookData });
            }
            if (targetIsbnPath && url.includes(targetIsbnPath)) {
                console.log(`[AXIOS MOCK] MATCHED ISBN path. Resolving.`);
                return Promise.resolve({ data: '1234567890ABC' });
            }
            if (url.includes(targetReviewsPath)) {
                console.log(`[AXIOS MOCK] MATCHED reviews path. Resolving.`);
                return Promise.resolve({ data: [] });
            }
            console.error(`[AXIOS MOCK] NO MATCH. Rejecting request for "${url}".`);
            return Promise.reject(new Error(`Unhandled axios GET request in mock: ${url}`));
        });
        
        mockedAxios.post.mockResolvedValue({ data: {} });
    });

    afterEach(() => {
        vi.restoreAllMocks(); // This should handle restoring console.error and window.alert
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



        // it('fetches and displays book details, reviews, and ISBN successfully', async () => {
        //     // Default mocks in beforeEach handle success
        //     renderWithRouter(<Bookpage />);

        //     // Wait for book details
        //     expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
        //     expect(screen.getByRole('heading', { name: mockBookData.author })).toBeInTheDocument();
        //     expect(screen.getByAltText(`Cover of ${mockBookData.title}`)).toHaveAttribute('src', `https://covers.openlibrary.org/b/id/${mockBookData.cover}-L.jpg`);

        //     // Wait for reviews
        //     expect(await screen.findByText(mockReviewsData[0].text)).toBeInTheDocument();
        //     expect(screen.getByText(mockReviewsData[1].text)).toBeInTheDocument();
        //     expect(screen.queryByText(/Loading reviews.../i)).not.toBeInTheDocument();

        //     // Wait for ISBN link
        //     const isbnLink = await screen.findByRole('link', { name: /view on national library/i });
        //     expect(isbnLink).toBeInTheDocument();
        //     expect(isbnLink).toHaveAttribute('href', expect.stringContaining(mockIsbnData));

        //     // Verify all API calls
        //     expect(mockedAxios.get).toHaveBeenCalledWith(bookApiUrl);
        //     expect(mockedAxios.get).toHaveBeenCalledWith(reviewsApiUrl);
        //     expect(mockedAxios.get).toHaveBeenCalledWith(isbnApiUrl);
        // });

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
    // --- NEW TESTS FOR DESCRIPTION TOGGLE ---
    describe('Description Toggle', () => {

        const shortDescription = "This description is short.";
        const longDescription = "This is the start of a very long description that definitely exceeds the character limit. ".repeat(15) + " This is the end.";
        // Helper to find the description element
        const findDescriptionElement = async () => {
            const element = await screen.findByText(/This is the start of a very long description/, { exact: false });
            return element.parentElement?.classList.contains('bookpage-description') ? element.parentElement : element;
        };

        // --- NO global fake timers for this block ---
        // We will activate them only within specific tests where needed

        it('does not render toggle button if description is short', async () => {
            // Mock book fetch to return short description
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === bookApiUrl) return { data: { ...mockBookData, description: shortDescription } };
                if (url === reviewsApiUrl) return { data: [] };
                if (url === isbnApiUrl) return { data: '' };
                throw new Error(`Unhandled GET: ${url}`);
            });

            renderWithRouter(<Bookpage />);

            // Wait for description to render - This uses real time initially
            expect(await screen.findByText(shortDescription)).toBeInTheDocument();

            // Button should not be present
            expect(screen.queryByRole('button', { name: /View More/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /View Less/i })).not.toBeInTheDocument();
        });

        it('renders toggle button and truncated description initially for long description', async () => {
            // Mock book fetch to return long description
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === bookApiUrl) return { data: { ...mockBookData, description: longDescription } };
                if (url === reviewsApiUrl) return { data: [] };
                if (url === isbnApiUrl) return { data: '' };
                throw new Error(`Unhandled GET: ${url}`);
            });

            renderWithRouter(<Bookpage />);

            // Wait for elements using real time
            const viewMoreButton = await screen.findByRole('button', { name: /View More/i });
            expect(viewMoreButton).toBeInTheDocument();

            const descriptionElement = await findDescriptionElement();
            expect(descriptionElement).toHaveClass('truncated');
        });


    }); // End Description Toggle describe

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
            await submitReview('Review text', 4); // Use helper or inline steps

            expect(alertSpy).toHaveBeenCalledTimes(1);
            expect(alertSpy).toHaveBeenCalledWith("You must be logged in to submit a review.");
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });


        // Keep tests for 401 and generic errors on submit
        it('shows alert and logs console error for error on review submit', async () => {
            const reviewText = 'Another failure attempt.';
            const rating = 3;
            const genericError = new Error('Network Failure');
            const expectedAlertMessage = "Failed to submit review. Please try again.";

            // Mock POST to reject with a generic error
            mockedAxios.post.mockRejectedValueOnce(genericError);

            // FIX: Remove the 'book' prop
            renderWithRouter(<Bookpage />);

            // Attempt to submit
            await submitReview(reviewText, rating);

            // Wait for error handling
            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Ensure POST was attempted
                // Check alert for the generic error message
                expect(alertSpy).toHaveBeenCalledWith(expectedAlertMessage);
                // Check console.error was called
                expect(consoleErrorSpy).toHaveBeenCalledWith("Error submitting review:", genericError);
            });

            // Check form was NOT reset
            expect(screen.getByPlaceholderText<HTMLTextAreaElement>(/Share your thoughts/i).value).toBe(reviewText);
            // Check submit button is re-enabled (assuming isSubmitting state works)
            expect(screen.getByRole('button', { name: /Submit Review/i })).toBeEnabled();
        });

    }); // End Review Form describe

    const renderAndWaitForBookpage = async (bookData: BookData): Promise<RenderResult> => {
        mockedAxios.get.mockImplementation((url: string) => {
            // console.log(`[AXIOS MOCK] GET request to: ${url}`); // For debugging
            if (url.includes(`/api/book/${bookData.id}/`)) {
                // This case should ideally not be hit if stateBook is correctly passed and used
                // console.log(`[AXIOS MOCK] Responding to /api/book/${bookData.id}/`);
                return Promise.resolve({ data: bookData });
            }
            if (bookData.key && url.includes(`/api/isbn/${bookData.key}`)) {
                // console.log(`[AXIOS MOCK] Responding to /api/isbn/${bookData.key}`);
                return Promise.resolve({ data: '1234567890ABC' });
            }
            if (url.includes(`/api/reviews/${bookData.id}/`)) {
                // console.log(`[AXIOS MOCK] Responding to /api/reviews/${bookData.id}/`);
                return Promise.resolve({ data: [] });
            }
            // console.error(`[AXIOS MOCK] Unhandled GET request: ${url}`);
            return Promise.reject(new Error(`Unhandled axios GET request in mock: ${url}`));
        });

        let renderResult: RenderResult;
        // Wrap render in act because component useEffects might update state
        await act(async () => {
             renderResult = render(
                <MemoryRouter initialEntries={[{ pathname: `/book/${bookData.id}`, state: { book: bookData } }]}>
                    <Routes>
                        <Route path="/book/:id" element={<Bookpage />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        // Wait for an element that signals the component has likely finished its initial async setup.
        // The description div is a good candidate.
        // `findBy*` queries return a promise and are wrapped in `waitFor` internally.
        await screen.findByTestId('book-description');
        
        // Sometimes, explicitly running all pending timers *after* initial async effects
        // can help if those effects themselves schedule timers.
        // This is more of a "just in case" for complex scenarios.
        // act(() => {
        //   jest.runAllTimers();
        // });

        return renderResult!; // Assert renderResult is assigned
    };




    // test('toggles description from truncated to expanded and back', async () => {
    //     await renderAndWaitForBookpage(mockBookLongDescription);

    //     // By this point, initial rendering and useEffects should have completed.
    //     const descriptionDiv = screen.getByTestId('book-description'); // Use getBy* as it should be present
    //     expect(descriptionDiv).toHaveClass('bookpage-description', 'truncated');
    //     const toggleButton = screen.getByRole('button', { name: /view more/i });
    //     expect(toggleButton).toBeInTheDocument();

    //     // 1. Click "View More"
    //     act(() => {
    //         fireEvent.click(toggleButton);
    //     });

    //     // Immediate class change (animation starts)
    //     expect(descriptionDiv).toHaveClass('bookpage-description', 'animating-expand');
    //     expect(toggleButton).toHaveTextContent(/view less/i); // showFullDescription becomes true in toggleDescription

    //     // Advance timers to trigger the setTimeout callback
    //     act(() => {
    //         vi.advanceTimersByTime(500);
    //     });

    //     // Class after timeout: Description expanded
    //     // Need to use waitFor if the class change isn't instantaneous with timer advancement in test env
    //     await waitFor(() => {
    //         expect(descriptionDiv).toHaveClass('bookpage-description', 'expanded');
    //     });
    //     expect(descriptionDiv).not.toHaveClass('truncated');
    //     expect(descriptionDiv).not.toHaveClass('animating-expand');
    //     expect(toggleButton).toHaveTextContent(/view less/i);

    //     // 2. Click "View Less"
    //     act(() => {
    //         fireEvent.click(toggleButton);
    //     });

    //     expect(descriptionDiv).toHaveClass('bookpage-description', 'animating-collapse');
    //     expect(toggleButton).toHaveTextContent(/view more/i); // showFullDescription becomes false

    //     act(() => {
    //         vi.advanceTimersByTime(500);
    //     });

    //     await waitFor(() => {
    //         expect(descriptionDiv).toHaveClass('bookpage-description', 'truncated');
    //     });
    //     expect(descriptionDiv).not.toHaveClass('expanded');
    //     expect(descriptionDiv).not.toHaveClass('animating-collapse');
    //     expect(toggleButton).toHaveTextContent(/view more/i);
    // });

    // test('does not show "View More" button if description is short', async () => {
    //     await renderAndWaitForBookpage(mockBookShortDescription);

    //     const descriptionDiv = screen.getByTestId('book-description'); // Should exist
    //     expect(descriptionDiv).toHaveTextContent(mockBookShortDescription.description as string);
    //     expect(descriptionDiv).toHaveClass('bookpage-description', 'truncated');

    //     // Use queryBy* for elements that should NOT be present
    //     expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument();
    // });

    // test('shows default message and no "View More" button if description is null', async () => {
    //     await renderAndWaitForBookpage(mockBookNoDescription);

    //     const descriptionDiv = screen.getByTestId('book-description'); // Should exist
    //     expect(descriptionDiv).toHaveTextContent("No description available for this book.");
    //     expect(descriptionDiv).toHaveClass('bookpage-description', 'truncated');

    //     expect(screen.queryByRole('button', { name: /view more/i })).not.toBeInTheDocument();
    // });

}); // End Description Toggle describe

