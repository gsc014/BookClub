import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, Mocked, MockInstance } from 'vitest';
import Searchbar from '../assets/searchbar.jsx';
import axios, { AxiosStatic } from 'axios';

vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../assets/searchresults.jsx', () => ({
    default: ({ results }: { results: any[] }) => (
        <div data-testid="search-results-mock">{results.length} results passed</div>
    ),
}));

vi.mock('../assets/subjectheader.jsx', () => ({
    default: ({ onSelect }: { onSelect: (filter: string) => void }) => (
        <button onClick={() => onSelect('fiction')} data-testid="subject-header-mock">
            Filter: Fiction
        </button>
    ),
}));

vi.mock('../assets/welcome.jsx', () => ({
    default: () => <div data-testid="welcome-mock">Welcome Mock</div>,
}));

describe('Searchbar Component', () => {
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;

    beforeEach(() => {
        vi.clearAllMocks();
        mockedAxios.get.mockReset();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockedAxios.get.mockImplementation(async (url, config) => {
            if (url.includes('/api/autocomplete')) {
                if (config?.params?.query === 'string') {
                    return { data: ['String Suggestion 1', 'String Suggestion 2'] };
                }
                if (config?.params?.query === 'suggest') {
                    return { data: [{ id: 'bk123', title: 'The Suggestion Book', author: 'Test Author' }] };
                }
                return { data: [] };
            }
            throw new Error(`Unhandled GET in Autocomplete block: ${url}`);
        });
    });
    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders input, search button, and child components', () => {
        render(<Searchbar />);
        expect(screen.getByPlaceholderText(/Search for books/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
        expect(screen.getByTestId('welcome-mock')).toBeInTheDocument();
        expect(screen.getByTestId('subject-header-mock')).toBeInTheDocument();
        expect(screen.queryByTestId('search-results-mock')).not.toBeInTheDocument();
    });

    describe('Autocomplete', () => {

        it('does not fetch suggestions for empty query', () => {
            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);
            fireEvent.change(input, { target: { value: '' } });
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
            expect(await screen.findByText(suggestionsData[0].title)).toBeInTheDocument();
        });

        it('clears suggestions when query becomes empty', async () => {
            const suggestionsData = [{ id: 'sg1', title: 'Suggestion One' }];
            mockedAxios.get.mockResolvedValueOnce({ data: suggestionsData });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);

            fireEvent.change(input, { target: { value: 'abc' } });
            expect(await screen.findByText(suggestionsData[0].title)).toBeInTheDocument();

            fireEvent.change(input, { target: { value: '' } });

            await waitFor(() => {
                expect(screen.queryByText(suggestionsData[0].title)).not.toBeInTheDocument();
            });
        });

        it('navigates to book page when clicking an object suggestion', async () => {
            const bookSuggestion = {
                id: 'bk123',
                title: 'The Suggestion Book',
                key: 'OL123M',
                author: 'Test Author',
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
            expect(mockNavigate).toHaveBeenCalledWith(
                `/books/${bookSuggestion.id}`,
                {
                    state: {
                        book: {
                            id: bookSuggestion.id,
                            title: bookSuggestion.title,
                            book: undefined
                        }
                    }
                }
            );
        });
        it('sets input query and logs when clicking a string suggestion', async () => {
            const stringSuggestions = ['String Suggestion 1', 'String Suggestion 2'];

            render(<Searchbar />);
            const input = screen.getByPlaceholderText<HTMLInputElement>(/Search for books/i);

            await act(async () => {
                fireEvent.change(input, { target: { value: 'string' } });
            });

            const suggestionItem = await screen.findByText(stringSuggestions[0]);
            fireEvent.click(suggestionItem);

            expect(input.value).toBe(stringSuggestions[0]);
            expect(consoleLogSpy).toHaveBeenCalledWith("Suggestion clicked (old format):", stringSuggestions[0]);
            expect(mockNavigate).not.toHaveBeenCalled();

            await waitFor(() => {
                expect(screen.queryByText(stringSuggestions[0])).not.toBeInTheDocument();
                expect(screen.queryByText(stringSuggestions[1])).not.toBeInTheDocument();
            });

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    expect.stringContaining('/api/autocomplete'),
                    expect.objectContaining({ params: { query: stringSuggestions[0] } })
                );
            });
        });

    });

    describe('Search Button', () => {
        it('searches and navigates to results page with correct state', async () => {
            const searchResultsData = [{ id: 'res1', title: 'Result Book One' }];
            const searchQuery = 'history books';
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.includes('/api/search/') && url.includes(`q=${searchQuery}`)) {
                    return { data: { results: searchResultsData } };
                }
                if (url.includes('/api/autocomplete')) return { data: [] };
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);
            const searchButton = screen.getByRole('button', { name: /Search/i });

            await act(async () => {
                fireEvent.change(input, { target: { value: searchQuery } });
                fireEvent.click(searchButton);
            });

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/search/?q=${searchQuery}`
                );
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledTimes(1);
                expect(mockNavigate).toHaveBeenCalledWith('/searchresults', {
                    state: {
                        initialResults: searchResultsData,
                        initialFilter: searchQuery,
                        isSearchQuery: true
                    },
                });
            });
        });

        it('logs an error if search API call fails', async () => {
            const searchQuery = 'failing search';
            const apiError = new Error('Search API Error');

            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url === `http://127.0.0.1:8000/api/search/?q=${searchQuery}`) {
                    console.log(`TEST [Search Error Test]: Mock throwing intended error for: ${url}`);
                    throw apiError;
                }
                if (url.includes('/api/autocomplete')) {
                    return { data: [] };
                }
                const unhandledError = new Error(`Unexpected GET call in 'logs an error...' test: ${url}`);
                console.error(unhandledError);
                throw unhandledError;
            });

            render(<Searchbar />);
            const input = screen.getByPlaceholderText(/Search for books/i);
            const searchButton = screen.getByRole('button', { name: /Search/i });

            await act(async () => {
                fireEvent.change(input, { target: { value: searchQuery } });
                fireEvent.click(searchButton);
            });

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/search/?q=${searchQuery}`
                );
                expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching search results:', apiError);
            });

            expect(mockNavigate).not.toHaveBeenCalled();
        });

    });

    describe('Filtering', () => {
        it('applies filter, calls API, and navigates to results page', async () => {
            const filterResultsData = [{ id: 'fic1', title: 'Fiction Book A' }];
            const filterValue = 'fiction';
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.includes('/api/filter/') && url.includes(`filter=${filterValue}`) && config?.params?.num === 10) {
                    return { data: filterResultsData };
                }
                if (url.includes('/api/autocomplete')) return { data: [] };
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Searchbar />);
            const filterButton = screen.getByTestId('subject-header-mock');
            fireEvent.click(filterButton);

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `http://127.0.0.1:8000/api/filter/?filter=${filterValue}`,
                    { params: { num: 10 } }
                );
            });
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/searchresults', {
                    state: { results: filterResultsData },
                });
            });
        });
    });
});