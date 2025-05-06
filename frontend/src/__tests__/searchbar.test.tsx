/// <reference types="vitest" />

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, Mocked, MockInstance } from 'vitest'; // Import Mocked type
import Searchbar from '../assets/searchbar.jsx'; // Adjust path if needed
import axios, { AxiosStatic } from 'axios'; // Import AxiosStatic
import { useNavigate } from 'react-router-dom';

// --- Mocks ---
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>; // Use AxiosStatic for correct typing

// Mock react-router-dom ONCE
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate, // Return the mock function directly
    };
});

// Mock Child Components
vi.mock('../assets/searchresults.jsx', () => ({
    // Mock SearchResults to avoid rendering its complexities
    default: ({ results }: { results: any[] }) => (
        <div data-testid="search-results-mock">{results.length} results passed</div>
    ),
}));

vi.mock('../assets/subjectheader.jsx', () => ({
    // Mock SubjectsHeader to provide a clickable element
    default: ({ onSelect }: { onSelect: (filter: string) => void }) => (
        <button onClick={() => onSelect('fiction')} data-testid="subject-header-mock">
            Filter: Fiction
        </button>
    ),
}));

vi.mock('../assets/welcome.jsx', () => ({
    // Mock Welcome component
    default: () => <div data-testid="welcome-mock">Welcome Mock</div>,
}));


describe('Searchbar Component', () => {
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;

    beforeEach(() => {
        vi.clearAllMocks(); // Resets navigate and axios mocks

        // Reset specific axios mocks if needed
        mockedAxios.get.mockReset();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // Spy on console.log and silence it (can be useful for debugging too)
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // General implementation for GET
        mockedAxios.get.mockImplementation(async (url, config) => {
            if (url.includes('/api/autocomplete')) {
                // Simulate different responses based on query if needed
                if (config?.params?.query === 'string') {
                    return { data: ['String Suggestion 1', 'String Suggestion 2'] };
                }
                if (config?.params?.query === 'suggest') {
                    return { data: [{ id: 'bk123', title: 'The Suggestion Book', author: 'Test Author' }] };
                }
                // Default empty for other autocomplete queries in this block
                return { data: [] };
            }
            // Handle other GET URLs if necessary or throw error
            throw new Error(`Unhandled GET in Autocomplete block: ${url}`);
        });
    });
    afterEach(() => {
        // Restore the console spy
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore(); // Restore console.log spy
        vi.restoreAllMocks(); // Restore any other spies if created
    });


    it('renders input, search button, and child components', () => {
        render(<Searchbar />);

        expect(screen.getByPlaceholderText(/Search for books/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument(); // More robust selector
        expect(screen.getByTestId('welcome-mock')).toBeInTheDocument();
        expect(screen.getByTestId('subject-header-mock')).toBeInTheDocument();
        // SearchResults mock won't render initially as results are empty
        expect(screen.queryByTestId('search-results-mock')).not.toBeInTheDocument();
    });

    // Test Autocomplete Logic
    describe('Autocomplete', () => {

        it('does not fetch suggestions for empty query', () => {
            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);

            // Initial render or clearing the input
            fireEvent.change(input, { target: { value: '' } });
            // Advance timers slightly if there's debouncing (none shown, but good practice)
            // await act(() => vi.advanceTimersByTime(500));
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('fetches suggestions for queries 1 character or longer', async () => {
            const suggestionsData = [{ id: 'sg1', title: 'Suggestion One' }];
            mockedAxios.get.mockResolvedValueOnce({ data: suggestionsData });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);

            fireEvent.change(input, { target: { value: 'a' } });

            await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/autocomplete',
                { params: { query: 'a' } }
            );

            // Check if suggestions are rendered
            expect(await screen.findByText(suggestionsData[0].title)).toBeInTheDocument();
        });

        it('clears suggestions when query becomes empty', async () => {
            const suggestionsData = [{ id: 'sg1', title: 'Suggestion One' }];
            mockedAxios.get.mockResolvedValueOnce({ data: suggestionsData });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);

            // Type something to get suggestions
            fireEvent.change(input, { target: { value: 'abc' } });
            expect(await screen.findByText(suggestionsData[0].title)).toBeInTheDocument();

            // Clear the input
            fireEvent.change(input, { target: { value: '' } });

            // Check suggestions disappear
            await waitFor(() => {
                expect(screen.queryByText(suggestionsData[0].title)).not.toBeInTheDocument();
            });
        });


        it('navigates to book page when clicking an object suggestion', async () => {
            const bookSuggestion = {
                id: 'bk123',
                title: 'The Suggestion Book',
                key: 'OL123M', // Include key/author if your API returns them
                author: 'Test Author',
                // 'book' property is missing in this mock, simulating API response
            };
            mockedAxios.get.mockResolvedValueOnce({ data: [bookSuggestion] });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);

            await act(async () => {
                fireEvent.change(input, { target: { value: 'suggest' } });
            });

            const suggestionItem = await screen.findByText(bookSuggestion.title);
            fireEvent.click(suggestionItem);

            expect(mockNavigate).toHaveBeenCalledTimes(1);
            // FIX: Match the actual nested structure created by the component
            expect(mockNavigate).toHaveBeenCalledWith(
                `/books/${bookSuggestion.id}`,
                {
                    state: {
                        book: { // Outer 'book' key
                            id: bookSuggestion.id,        // id is copied
                            title: bookSuggestion.title,  // title is copied
                            book: undefined             // Inner 'book' key is undefined because suggestion.book wasn't present
                        }
                    }
                }
            );
        });
        it('sets input query and logs when clicking a string suggestion', async () => {
            const stringSuggestions = ['String Suggestion 1', 'String Suggestion 2'];
            // Mock handled by describe's beforeEach

            render(<Searchbar />);
            const input = screen.getByPlaceholderText<HTMLInputElement>(/Search for books/i); // Type the input

            // Trigger autocomplete
            await act(async () => {
                fireEvent.change(input, { target: { value: 'string' } });
            });

            // Find and click the string suggestion
            const suggestionItem = await screen.findByText(stringSuggestions[0]);
            fireEvent.click(suggestionItem);

            // Verify the input value was updated (checking state change)
            expect(input.value).toBe(stringSuggestions[0]);

            // Verify the specific console log was called from the else block
            expect(consoleLogSpy).toHaveBeenCalledWith("Suggestion clicked (old format):", stringSuggestions[0]);

            // Verify navigation was NOT called
            expect(mockNavigate).not.toHaveBeenCalled();

            // Verify suggestions disappear after click
            await waitFor(() => {
                expect(screen.queryByText(stringSuggestions[0])).not.toBeInTheDocument();
                expect(screen.queryByText(stringSuggestions[1])).not.toBeInTheDocument();
            });

            // Verify the second autocomplete call happened after click/setQuery
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    expect.stringContaining('/api/autocomplete'),
                    expect.objectContaining({ params: { query: stringSuggestions[0] } })
                );
                // Check total calls if needed (initial + after click)
                // expect(mockedAxios.get).toHaveBeenCalledTimes(2);
            });
        });

    });

    // Test Search Functionality
    describe('Search Button', () => {
        it('searches and navigates to results page with correct state', async () => {
            const searchResultsData = [{ id: 'res1', title: 'Result Book One' }];
            const searchQuery = 'history books';
            // Mock the specific search API call
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.includes('/api/search/') && url.includes(`q=${searchQuery}`)) {
                    return { data: { results: searchResultsData } }; // Match component's expected structure
                }
                // Allow autocomplete calls if needed, return empty otherwise
                if (url.includes('/api/autocomplete')) return { data: [] };
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);
            const searchButton = screen.getByRole('button', { name: /Search/i });

            // Simulate typing and clicking search
            await act(async () => { // Wrap state update and async call in act
                fireEvent.change(input, { target: { value: searchQuery } });
                fireEvent.click(searchButton);
            });


            // Verify Search API call was made
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/search/?q=${searchQuery}`
                );
            });

            // Verify navigation with the correct state structure used by the component
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledTimes(1);
                expect(mockNavigate).toHaveBeenCalledWith('/searchresults', {
                    state: {
                        initialResults: searchResultsData,
                        initialFilter: searchQuery, // Component sends the query as filter
                        isSearchQuery: true         // Component sends this flag
                    },
                });
            });
        });

        it('logs an error if search API call fails', async () => {
            const searchQuery = 'failing search';
            const apiError = new Error('Search API Error'); // The error we WANT to be caught

            // **FIX:** Override mock JUST FOR THIS TEST's necessary calls
            mockedAxios.get.mockImplementation(async (url, config) => {
                // Explicitly check for the search URL and throw the intended error
                if (url === `http://127.0.0.1:8000/api/search/?q=${searchQuery}`) {
                    console.log(`TEST [Search Error Test]: Mock throwing intended error for: ${url}`);
                    throw apiError; // Throw the specific error object
                }
                // Handle autocomplete silently
                if (url.includes('/api/autocomplete')) {
                    return { data: [] };
                }
                // Throw a different error for truly unexpected calls in this test
                const unhandledError = new Error(`Unexpected GET call in 'logs an error...' test: ${url}`);
                console.error(unhandledError); // Log it for debugging if it happens
                throw unhandledError;
            });


            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);
            const searchButton = screen.getByRole('button', { name: /Search/i });

            await act(async () => {
                fireEvent.change(input, { target: { value: searchQuery } });
                fireEvent.click(searchButton);
            });

            // Wait for the API call attempt and error handling
            await waitFor(() => {
                // Verify the specific search API call was made
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/search/?q=${searchQuery}`
                );
                // Verify console.error was called with the INTENDED error object
                expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching search results:', apiError); // Check against apiError directly
            });

            // Verify navigation did NOT happen
            expect(mockNavigate).not.toHaveBeenCalled();
        });

    });


    // Test Filter Functionality
    describe('Filtering', () => {
        it('applies filter, calls API, and navigates to results page', async () => {
            const filterResultsData = [{ id: 'fic1', title: 'Fiction Book A' }];
            const filterValue = 'fiction';
            // Mock the specific filter API call, including the 'num' param
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.includes('/api/filter/') && url.includes(`filter=${filterValue}`) && config?.params?.num === 10) {
                    return { data: filterResultsData };
                }
                // Allow autocomplete calls if needed, return empty otherwise
                if (url.includes('/api/autocomplete')) return { data: [] };
                throw new Error(`Unhandled GET: ${url}`);
            });


            render(<Searchbar />);
            // Find the button provided by the mocked SubjectsHeader
            const filterButton = screen.getByTestId('subject-header-mock');

            // Click the mock filter button (which calls onSelect('fiction'))
            fireEvent.click(filterButton);

            // Wait for API call and navigation triggered by the useEffect watching 'filters'
            await waitFor(() => {
                // Check filter API call
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/filter/?filter=${filterValue}`,
                    { params: { num: 10 } } // Component adds num: 10 param
                );
            });
            await waitFor(() => {
                // Check navigation call (state structure matches component)
                expect(mockNavigate).toHaveBeenCalledWith('/searchresults', {
                    state: { results: filterResultsData },
                });
            });
        });
    });
});