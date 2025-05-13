import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import SearchResults from '../assets/searchresults';
import Bookcard from '../assets/bookcard'; 

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useLocation: vi.fn(),
    };
});
const mockedUseLocation = vi.mocked(useLocation);

vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book }) => (
        <div data-testid={`bookcard-${book.id}`}>
            <h3>{book.title}</h3>
            <p>{book.author}</p>
        </div>
    ))
}));
const MockedBookcard = vi.mocked(Bookcard);

describe('SearchResults Component', () => {
    const mockLocationStateBase: Omit<ReturnType<typeof useLocation>, 'state'> = {
        pathname: '/search',
        search: '',
        hash: '',
        key: 'defaultKey',
    };
    const setupMockLocation = (state: any) => {
        mockedUseLocation.mockReturnValue({
            ...mockLocationStateBase,
            state: state,
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockedAxios.get.mockReset();
        mockedAxios.post.mockReset();
        mockedAxios.get.mockResolvedValue({ data: { results: [], pagination: { total_books: 0, total_pages: 1 } } });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders loading state initially when filter is provided', () => {
        setupMockLocation({ initialFilter: 'Fantasy', isSearchQuery: false });
        render(<SearchResults />);
        expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    });


        it('displays initial results and filter from location state immediately, then updates from API', async () => { 
        const locationStateResults = [
            { id: 'loc1', title: 'State Book 1', author: 'State Author' },
            { id: 'loc2', title: 'State Book 2', author: 'State Author' },
        ];
        const locationStateFilter = 'From State';

        setupMockLocation({
            initialResults: locationStateResults,
            initialFilter: locationStateFilter,
            isSearchQuery: true,
        });

        const apiResults = [{id: 'api1', title: 'API Book'}];
        mockedAxios.get.mockResolvedValueOnce({
             data: { results: apiResults, pagination: { total_books: 1, total_pages: 1 } }
        });

        render(<SearchResults />);

        expect(screen.getByRole('heading', { name: /"From State" Search Results/i })).toBeInTheDocument();

        expect(MockedBookcard).toHaveBeenCalledTimes(locationStateResults.length);
        expect(MockedBookcard).toHaveBeenCalledWith(expect.objectContaining({ book: locationStateResults[0] }), {});
        expect(MockedBookcard).toHaveBeenCalledWith(expect.objectContaining({ book: locationStateResults[1] }), {});

        await waitFor(() => {
            expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();
        });

        expect(await screen.findByTestId('bookcard-api1')).toBeInTheDocument();
        expect(screen.getByText(apiResults[0].title)).toBeInTheDocument();

        expect(screen.queryByTestId(`bookcard-${locationStateResults[0].id}`)).not.toBeInTheDocument();
        expect(screen.queryByTestId(`bookcard-${locationStateResults[1].id}`)).not.toBeInTheDocument();

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
           expect.stringContaining('/api/search/'),
           expect.objectContaining({
               params: expect.objectContaining({ q: locationStateFilter })
           })
       );

        expect(MockedBookcard).toHaveBeenCalledTimes(locationStateResults.length + apiResults.length);

    });
    it('renders error and logs console error for unexpected API response format', async () => {
        const filterTerm = 'Test Filter';
        setupMockLocation({ initialFilter: filterTerm, isSearchQuery: false }); // Trigger filter fetch

        // Mock API response with invalid format (missing 'results' array)
        const invalidResponseData = { message: "Data found, but not in expected format" };
        // const invalidResponseData = null; // Another possible invalid format
        // const invalidResponseData = {}; // Another possible invalid format
        mockedAxios.get.mockResolvedValueOnce({ data: invalidResponseData });

        // Spy is set up in beforeEach
        render(<SearchResults />);

        // Wait for loading to disappear and the specific error message to appear
        const expectedErrorMessage = "Invalid data format received from server";
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(await screen.findByText(expectedErrorMessage)).toBeInTheDocument();
        expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument();

        // Check that console.error was called with the specific message and the invalid data
        await waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Unexpected API response format:",
                invalidResponseData // Check that the actual received data was logged
            );
        });

        // Ensure no book cards were rendered
        expect(MockedBookcard).not.toHaveBeenCalled();

        // Verify the API call was made
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
             expect.stringContaining('/api/filter/'), // Based on isSearchQuery: false
             expect.objectContaining({
                 params: expect.objectContaining({ filter: filterTerm })
             })
         );
    });



    it('renders error message if fetching fails', async () => {
        const errorMessage = 'Network Error';
        setupMockLocation({ initialFilter: 'Sci-Fi', isSearchQuery: false });
        mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage)); // Simulate fetch failure

        render(<SearchResults />);

        expect(await screen.findByText(/Failed to load books. Please try again./i)).toBeInTheDocument();
    });

    it('renders "No books found" message when API returns empty results', async () => {
        setupMockLocation({ initialFilter: 'Obscure Genre', isSearchQuery: false });
        mockedAxios.get.mockResolvedValueOnce({ data: { results: [], pagination: { total_books: 0, total_pages: 1 } } });

        render(<SearchResults />);

        expect(await screen.findByText(/No books found matching your criteria/i)).toBeInTheDocument();
    });

    it('fetches and renders books for a search query', async () => {
        const searchTerm = 'Dune';
        const mockSearchResults = [
            { id: 1, title: 'Dune', author: 'Frank Herbert' },
            { id: 2, title: 'Dune Messiah', author: 'Frank Herbert' },
        ];
        setupMockLocation({ initialFilter: searchTerm, isSearchQuery: true });
        mockedAxios.get.mockResolvedValueOnce({
            data: { results: mockSearchResults, pagination: { total_books: 2, total_pages: 1 } }
        });

        render(<SearchResults />);

        expect(await screen.findByText('Dune')).toBeInTheDocument();
        expect(screen.getByText('Dune Messiah')).toBeInTheDocument();
        expect(screen.getByText(/"Dune" Search Results \(2\)/i)).toBeInTheDocument();

        expect(MockedBookcard).toHaveBeenCalledTimes(2);
        expect(MockedBookcard).toHaveBeenCalledWith(expect.objectContaining({ book: mockSearchResults[0] }), {});
        expect(MockedBookcard).toHaveBeenCalledWith(expect.objectContaining({ book: mockSearchResults[1] }), {});

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/api/search/',
            expect.objectContaining({
                params: { q: searchTerm, page: 1, per_page: 10 }
            })
        );
    });

    it('fetches and renders books for a filter query', async () => {
        const filterTerm = 'Fantasy';
        const mockFilterResults = [
            { id: 3, title: 'The Hobbit', author: 'J.R.R. Tolkien' },
        ];
        setupMockLocation({ initialFilter: filterTerm, isSearchQuery: false });
        mockedAxios.get.mockResolvedValueOnce({
            data: { results: mockFilterResults, pagination: { total_books: 1, total_pages: 1 } }
        });

        render(<SearchResults />);

        expect(await screen.findByText('The Hobbit')).toBeInTheDocument();
        expect(screen.getByText(/"Fantasy" Search Results \(1\)/i)).toBeInTheDocument();

        expect(MockedBookcard).toHaveBeenCalledTimes(1);
        expect(MockedBookcard).toHaveBeenCalledWith(expect.objectContaining({ book: mockFilterResults[0] }), {});

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/api/filter/',
            expect.objectContaining({
                params: { filter: filterTerm, page: 1, per_page: 10 }
            })
        );
    });

    it('renders pagination controls when totalPages > 1', async () => {
        setupMockLocation({ initialFilter: 'History', isSearchQuery: false });
        mockedAxios.get.mockResolvedValueOnce({
            data: { results: [{id: 1, title: 'Book 1', author: 'Author 1'}], pagination: { total_books: 15, total_pages: 2 } }
        });

        render(<SearchResults />);

        expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
    });

    it('fetches next page when "Next" button is clicked', async () => {
        const user = userEvent.setup();
        const filterTerm = 'Travel';
        setupMockLocation({ initialFilter: filterTerm, isSearchQuery: false });

        mockedAxios.get.mockResolvedValueOnce({
            data: { results: [{ id: 1, title: 'Book 1', author: 'A1'}], pagination: { total_books: 12, total_pages: 2 } }
        });
         mockedAxios.get.mockResolvedValueOnce({
            data: { results: [{ id: 2, title: 'Book 2', author: 'A2'}], pagination: { total_books: 12, total_pages: 2 } }
        });

        render(<SearchResults />);

        const nextButton = await screen.findByRole('button', { name: /Next/i });
        expect(nextButton).toBeEnabled();
        expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();

        // Clear mock history from initial render fetch
        mockedAxios.get.mockClear();

        await user.click(nextButton);

        expect(await screen.findByText(/Page 2 of 2/i)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledWith(
            'http://127.0.0.1:8000/api/filter/',
            expect.objectContaining({
                params: { filter: filterTerm, page: 2, per_page: 10 }
            })
        );
         expect(screen.getByRole('button', { name: /Previous/i })).toBeEnabled();
         expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    });

     it('fetches previous page when "Previous" button is clicked', async () => {
         const user = userEvent.setup();
         const filterTerm = 'Cooking';
         setupMockLocation({ initialFilter: filterTerm, isSearchQuery: false });

         mockedAxios.get.mockResolvedValueOnce({ data: { results: [{id: 1}], pagination: { total_books: 15, total_pages: 2 } } }); // Page 1
         mockedAxios.get.mockResolvedValueOnce({ data: { results: [{id: 2}], pagination: { total_books: 15, total_pages: 2 } } }); // Page 2
         mockedAxios.get.mockResolvedValueOnce({ data: { results: [{id: 3}], pagination: { total_books: 15, total_pages: 2 } } }); // Page 1 (after prev)

         render(<SearchResults />);

         const nextButton = await screen.findByRole('button', { name: /Next/i });
         await user.click(nextButton);
         const prevButton = await screen.findByRole('button', { name: /Previous/i });
         expect(await screen.findByText(/Page 2 of 2/i)).toBeInTheDocument();

          mockedAxios.get.mockClear();

         await user.click(prevButton);

         expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument();
         expect(mockedAxios.get).toHaveBeenCalledWith(
             'http://127.0.0.1:8000/api/filter/',
             expect.objectContaining({
                 params: { filter: filterTerm, page: 1, per_page: 10 }
             })
         );
          expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
          expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled();
     });


    it('fetches new results when "Results per page" is changed', async () => {
        const user = userEvent.setup();
        const filterTerm = 'Art';
        setupMockLocation({ initialFilter: filterTerm, isSearchQuery: false });

        mockedAxios.get.mockResolvedValueOnce({
            data: { results: [...Array(10).fill(0).map((_,i)=>({id: i, title: `Art ${i}`, author: 'A'}))], pagination: { total_books: 30, total_pages: 3 } }
        });
        mockedAxios.get.mockResolvedValueOnce({
             data: { results: [...Array(20).fill(0).map((_,i)=>({id: i+100, title: `Art ${i+100}`, author: 'A'}))], pagination: { total_books: 30, total_pages: 2 } }
        });

        render(<SearchResults />);

        const select = await screen.findByLabelText(/Results per page:/i);
        expect(await screen.findByText(/Page 1 of 3/i)).toBeInTheDocument();

        mockedAxios.get.mockClear();

        await user.selectOptions(select, '20');

        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/filter/',
                expect.objectContaining({
                    params: { filter: filterTerm, page: 1, per_page: 20 }
                })
            );
        });
        expect(await screen.findByText(/Page 1 of 2/i)).toBeInTheDocument();
    });

});