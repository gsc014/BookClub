import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import Booklist from '../assets/booklist';

vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book }) => (
        <div data-testid={`bookcard-${book.id}`}>Mock Bookcard: {book.title}</div>
    ))
}));
import MockBookcard from '../assets/bookcard';
const MockBookcardFn = vi.mocked(MockBookcard);

describe('Booklist Component', () => {
    const defaultApiUrl = 'http://127.0.0.1:8000/api/random-book/';
    const recommendedApiUrl = 'http://127.0.0.1:8000/api/recommended-book/';
    const mockBooksArray = [
        { id: 'a1', title: 'Book Alpha' },
        { id: 'b2', title: 'Book Beta' },
        { id: 'c3', title: 'Book Gamma' },
    ];
    const mockSingleBook = { id: 'd4', title: 'Book Delta' };
    const defaultTitle = "Recommended Books";
    const mockAuthToken = 'list-test-token';
    let innerWidthSpy: MockInstance;

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
        mockedAxios.get.mockResolvedValue({ data: [] });
        innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    });

    afterEach(() => {
        innerWidthSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders loading state initially and calls correct endpoint (logged out)', () => {
        setLoginState(false);
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));
        render(<Booklist />);
        expect(screen.getByText(`Loading ${defaultTitle.toLowerCase()}...`)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl,
            expect.objectContaining({
                params: expect.objectContaining({
                    num: expect.any(Number)
                })
            })
        );
    });

    it('renders loading state initially and calls correct endpoint (logged in)', () => {
        setLoginState(true);
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));
        render(<Booklist />);
        expect(screen.getByText(`Loading ${defaultTitle.toLowerCase()}...`)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            recommendedApiUrl,
            expect.objectContaining({
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
        mockedAxios.get.mockResolvedValue({ data: mockBooksArray });
        render(<Booklist />);
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledWith(
            recommendedApiUrl,
            expect.objectContaining({ params: expect.objectContaining({ num: expect.any(Number) }) })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);
        expect(screen.getByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockBooksArray[0].title}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bookcard-${mockBooksArray[1].id}`)).toBeInTheDocument();
    });

    it('renders a book card after successful fetch (single object response, logged out)', async () => {
        setLoginState(false);
        mockedAxios.get.mockResolvedValue({ data: mockSingleBook });
        render(<Booklist />);
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl,
            expect.objectContaining({ params: expect.objectContaining({ num: expect.any(Number) }) })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId(`bookcard-${mockSingleBook.id}`)).toBeInTheDocument();
        expect(screen.getByText(`Mock Bookcard: ${mockSingleBook.title}`)).toBeInTheDocument();
    });

    it('renders "no books" message when fetch returns empty array', async () => {
        setLoginState(false);
        mockedAxios.get.mockResolvedValue({ data: [] });
        render(<Booklist />);
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${defaultTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });
        expect(screen.getByText(`No ${defaultTitle.toLowerCase()} available`)).toBeInTheDocument();
        expect(MockBookcardFn).not.toHaveBeenCalled();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('renders error message when fetch fails', async () => {
        setLoginState(false);
        const mockError = new Error('Network Error');
        mockedAxios.get.mockRejectedValue(mockError);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Booklist title="Custom List" />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading custom list.../i)).not.toBeInTheDocument();
        });
        expect(screen.getByText('Failed to load custom list')).toBeInTheDocument();
        expect(MockBookcardFn).not.toHaveBeenCalled();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching books for Custom List from http://127.0.0.1:8000/api/random-book/:', mockError);
        consoleErrorSpy.mockRestore();
    });

    it('uses custom apiUrl and params when provided', async () => {
        setLoginState(false);
        const customApiUrl = 'http://example.com/api/custom-books/';
        const customParams = { genre: 'sci-fi' };
        const customTitle = 'Sci-Fi Books';
        mockedAxios.get.mockResolvedValue({ data: mockBooksArray });
        render(<Booklist apiUrl={customApiUrl} params={customParams} title={customTitle} />);
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${customTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            customApiUrl,
            expect.objectContaining({
                params: {
                    ...customParams,
                    num: expect.any(Number)
                }
            })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);
        expect(screen.getByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
    });

    it('uses custom apiUrl and params WITH auth when provided and logged in', async () => {
        setLoginState(true);
        const customApiUrl = 'http://example.com/api/custom-books/';
        const customParams = { author: 'Clarke' };
        const customTitle = 'Clarke Books';
        mockedAxios.get.mockResolvedValue({ data: mockBooksArray });
        render(<Booklist apiUrl={customApiUrl} params={customParams} title={customTitle} />);
        await waitFor(() => {
            expect(screen.queryByText(`Loading ${customTitle.toLowerCase()}...`)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            customApiUrl,
            expect.objectContaining({
                params: {
                    ...customParams,
                    num: expect.any(Number)
                },
                headers: expect.objectContaining({
                   'Authorization': `Token ${mockAuthToken}`
                })
            })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockBooksArray.length);
    });

    it('re-fetches books with recalculated count on window resize', async () => {
        setLoginState(false);
        mockedAxios.get.mockResolvedValueOnce({ data: mockBooksArray });
        render(<Booklist />);
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(1));
        expect(mockedAxios.get).toHaveBeenCalledWith(
            defaultApiUrl,
            expect.objectContaining({ params: { num: 9 } })
        );
        expect(await screen.findByTestId(`bookcard-${mockBooksArray[0].id}`)).toBeInTheDocument();
        mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 'z9', title: 'Resized Book' }] });
        innerWidthSpy.mockReturnValue(500);
        fireEvent(window, new Event('resize'));
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledTimes(2));
        expect(mockedAxios.get).toHaveBeenNthCalledWith(
            2,
            defaultApiUrl,
            expect.objectContaining({ params: { num: 3 } })
        );
        expect(await screen.findByTestId(`bookcard-z9`)).toBeInTheDocument();
        expect(screen.queryByTestId(`bookcard-${mockBooksArray[0].id}`)).not.toBeInTheDocument();
    });
});