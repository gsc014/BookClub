// src/__tests__/bookpage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import axios from 'axios';
import { useLocation, useParams, BrowserRouter } from 'react-router-dom'; // Need BrowserRouter for Link

// --- Mock react-router-dom ---
interface LocationState {
    book: RetrievedBook | null; // Allow RetrievedBook type or null
}
const mockParams = { id: '123' }; // Default book ID from URL
const mockLocationState = { book: null }; // Default empty location state
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
const mockedUseParams = vi.mocked(useParams);
const mockedUseLocation = vi.mocked(useLocation);

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


    beforeEach(() => {
        vi.resetAllMocks();
        // Reset location state before each test if needed
        mockLocationState.book = null;
        // Mock localStorage
        localStorage.clear();
        vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
            if (key === 'authToken') return mockAuthToken; // Logged in by default
            return null;
        });
        // Spies
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { }); // For debugging component logs

        // Default successful Axios mocks
        mockedAxios.get.mockImplementation(async (url) => {
            // console.log(`TEST - Axios GET: ${url}`); // Debugging
            if (url === bookApiUrl) return { data: { ...mockBookData } };
            if (url === reviewsApiUrl) return { data: [...mockReviewsData] };
            if (url === isbnApiUrl) return { data: mockIsbnData };
            console.error(`Unhandled GET request in test: ${url}`);
            throw new Error(`Unhandled GET: ${url}`);
        });
        mockedAxios.post.mockResolvedValue({ data: { /* default success data */ } }); // Default post success
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

        // it('renders immediately if book data is passed via location state', () => {
        //      (mockLocationState as any).book = mockBookData; // Provide state book
        //      // Prevent other fetches from resolving immediately
        //      mockedAxios.get.mockImplementation(async (url) => {
        //         if (url === reviewsApiUrl) return new Promise(() => {});
        //         if (url === isbnApiUrl) return new Promise(() => {});
        //         return { data: {} };
        //      });

        //      renderWithRouter(<Bookpage />);

        //      // Book details should be present without waiting for book API call
        //      expect(screen.getByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
        //      expect(screen.getByRole('heading', { name: mockBookData.author })).toBeInTheDocument();
        //      // Book API should NOT have been called
        //      expect(mockedAxios.get).not.toHaveBeenCalledWith(bookApiUrl);
        //      // Review and ISBN fetches should have been called
        //      expect(mockedAxios.get).toHaveBeenCalledWith(reviewsApiUrl);
        //      expect(mockedAxios.get).toHaveBeenCalledWith(isbnApiUrl);
        //      // Should show review loading state
        //      expect(screen.getByText(/Loading reviews.../i)).toBeInTheDocument();
        // });

        it('fetches and displays book details, reviews, and ISBN successfully', async () => {
            // Default mocks in beforeEach handle success
            renderWithRouter(<Bookpage />);

            // Wait for book details
            expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: mockBookData.author })).toBeInTheDocument();
            expect(screen.getByAltText(`Cover of ${mockBookData.title}`)).toHaveAttribute('src', `https://covers.openlibrary.org/b/id/${mockBookData.cover}-L.jpg`);

            // Wait for reviews
            expect(await screen.findByText(mockReviewsData[0].text)).toBeInTheDocument();
            expect(screen.getByText(mockReviewsData[1].text)).toBeInTheDocument();
            expect(screen.queryByText(/Loading reviews.../i)).not.toBeInTheDocument();

            // Wait for ISBN link
            const isbnLink = await screen.findByRole('link', { name: /view on national library/i });
            expect(isbnLink).toBeInTheDocument();
            expect(isbnLink).toHaveAttribute('href', expect.stringContaining(mockIsbnData));

            // Verify all API calls
            expect(mockedAxios.get).toHaveBeenCalledWith(bookApiUrl);
            expect(mockedAxios.get).toHaveBeenCalledWith(reviewsApiUrl);
            expect(mockedAxios.get).toHaveBeenCalledWith(isbnApiUrl);
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

        // it('handles reviews fetch error gracefully (shows book details)', async () => {
        //      const reviewsError = new Error('Reviews unavailable');
        //      // Mock ONLY reviews fetch to fail
        //      mockedAxios.get.mockImplementation(async (url) => {
        //         if (url === bookApiUrl) return { data: { ...mockBookData } };
        //         if (url === reviewsApiUrl) throw reviewsError;
        //         if (url === isbnApiUrl) return { data: mockIsbnData };
        //         throw new Error(`Unhandled GET: ${url}`);
        //      });

        //     renderWithRouter(<Bookpage />);

        //     // Wait for book details
        //     expect(await screen.findByRole('heading', { name: mockBookData.title })).toBeInTheDocument();
        //     // Wait for ISBN
        //     expect(await screen.findByRole('link', { name: /view on national library/i})).toBeInTheDocument();

        //     // Check reviews section shows error/empty state or just doesn't render list
        //     expect(await screen.findByText(/Reviews/i)).toBeInTheDocument(); // Heading should still be there
        //     expect(screen.queryByText(mockReviewsData[0].text)).not.toBeInTheDocument(); // Reviews not rendered
        //      // Check console error for reviews
        //      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching reviews:", reviewsError);
        // });

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

        // it('expands description and changes button text on "View More" click', async () => {
        //     const user = userEvent.setup(); // No timer linkage needed here yet
        //     // Mock long description
        //     mockedAxios.get.mockImplementation(async (url) => {
        //         if (url === bookApiUrl) return { data: { ...mockBookData, description: longDescription } };
        //         if (url === reviewsApiUrl) return { data: [] };
        //         if (url === isbnApiUrl) return { data: '' };
        //         throw new Error(`Unhandled GET: ${url}`);
        //     });

        //     renderWithRouter(<Bookpage />);

        //     // Wait for initial state elements
        //     const viewMoreButton = await screen.findByRole('button', { name: /View More/i });
        //     const descriptionElement = await findDescriptionElement();

        //     // --- Activate Fake Timers JUST before the action involving setTimeout ---
        //     vi.useFakeTimers();

        //     // Act: Click View More
        //     await act(async () => {
        //         await user.click(viewMoreButton);
        //         // Advance timers *inside* act after the click that triggers setTimeout
        //         await vi.advanceTimersByTimeAsync(500);
        //     });


        //     // Assert: Check final state
        //     // Use findByRole to ensure React has re-rendered after timer advancement
        //     expect(await screen.findByRole('button', { name: /View Less/i })).toBeInTheDocument();
        //     // Re-find element if necessary after state change, check class
        //     expect(await findDescriptionElement()).toHaveClass('expanded');
        //     expect(screen.getByText(/This is the end\./)).toBeInTheDocument();

        //     // --- Restore Real Timers ---
        //     vi.useRealTimers();
        // });

        // it('collapses description and changes button text on "View Less" click', async () => {
        //     const user = userEvent.setup();
        //     // Mock long description
        //     mockedAxios.get.mockImplementation(async (url) => {
        //         if (url === bookApiUrl) return { data: { ...mockBookData, description: longDescription } };
        //         if (url === reviewsApiUrl) return { data: [] };
        //         if (url === isbnApiUrl) return { data: '' };
        //         throw new Error(`Unhandled GET: ${url}`);
        //     });

        //     renderWithRouter(<Bookpage />);

        //     // --- Expand first (using real timers initially) ---
        //     const viewMoreButton = await screen.findByRole('button', { name: /View More/i });

        //     // Activate fake timers before the first click
        //     vi.useFakeTimers();
        //     await act(async () => {
        //         await user.click(viewMoreButton);
        //         await vi.advanceTimersByTimeAsync(500);
        //     });
        //     // Wait for the expanded state using findBy*
        //     const viewLessButton = await screen.findByRole('button', { name: /View Less/i });
        //     expect(await findDescriptionElement()).toHaveClass('expanded');
        //     // Restore real timers temporarily if needed, or keep fake timers active
        //     // vi.useRealTimers();

        //     // --- Act: Click View Less (fake timers should still be active if not restored) ---
        //     // If real timers were restored, activate fake ones again: vi.useFakeTimers();
        //     await act(async () => {
        //         await user.click(viewLessButton);
        //         await vi.advanceTimersByTimeAsync(500); // Advance for the collapse timeout
        //     });

        //     // --- Assert: Check collapsed state ---
        //     // Use findBy* to wait for the state update
        //     expect(await screen.findByRole('button', { name: /View More/i })).toBeInTheDocument();
        //     expect(await findDescriptionElement()).toHaveClass('truncated');
        //     expect(screen.queryByText(/This is the end\./)).not.toBeInTheDocument();

        //     // --- Restore Real Timers ---
        //     vi.useRealTimers();
        // });

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

        // it('updates rating on star click', async () => {
        //     const user = userEvent.setup();
        //      renderWithRouter(<Bookpage />);
        //      const stars = await screen.findAllByText('★'); // Get all star spans
        //      expect(stars.length).toBe(5); // Make sure we found them

        //      await user.click(stars[3]); // Click the 4th star (index 3 for rating 4)

        //      // Check which stars have the 'filled' class
        //      expect(stars[0]).toHaveClass('filled');
        //      expect(stars[1]).toHaveClass('filled');
        //      expect(stars[2]).toHaveClass('filled');
        //      expect(stars[3]).toHaveClass('filled');
        //      expect(stars[4]).not.toHaveClass('filled');
        // });

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

        // Keep successful submission test
        //  it('handles successful review submission and adds review to list', async () => {
        //      const newReviewText = 'This test submitted review!';
        //      const newRating = 4;
        //      const newReviewResponse = { // Simulate API response for the new review
        //          id: 3,
        //          username: 'currentUser', // Assuming backend returns username
        //          rating: newRating,
        //          text: newReviewText,
        //          created_at: new Date().toISOString()
        //      };
        //      // Mock POST success returning the new review object
        //      mockedAxios.post.mockResolvedValueOnce({ data: newReviewResponse });

        //      renderWithRouter(<Bookpage />);

        //      // Submit the review
        //      await submitReview(newReviewText, newRating); // Use helper

        //      // Check POST call
        //      await waitFor(() => {
        //          expect(mockedAxios.post).toHaveBeenCalledWith(
        //              reviewSubmitUrl,
        //              { text: newReviewText, rating: newRating },
        //              { headers: { Authorization: `Token ${mockAuthToken}`, 'Content-Type': 'application/json' } }
        //          );
        //      });

        //      // Check alert message
        //      expect(alertSpy).toHaveBeenCalledWith("Review submitted successfully!");

        //       // Check form reset
        //      expect(screen.getByPlaceholderText<HTMLTextAreaElement>(/Share your thoughts/i).value).toBe('');
        //      // Check rating reset (expect no 'filled' stars)
        //      const stars = await screen.findAllByText('★');
        //      stars.forEach(star => expect(star).not.toHaveClass('filled'));

        //      // Check that the new review appears in the list *at the top*
        //      // Wait for the new review text specifically
        //      expect(await screen.findByText(newReviewText)).toBeInTheDocument();
        //      // Verify older reviews are still there
        //      expect(screen.getByText(mockReviewsData[0].text)).toBeInTheDocument();

        //  });

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


}); // End describe Bookpage