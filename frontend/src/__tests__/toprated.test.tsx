import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import TopRatedBooks from '../assets/toprated';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book, isSmall }) => (
        <div data-testid={`bookcard-${book.id}`} data-issmall={isSmall}>
            Mock Bookcard: {book.title} (Small: {String(isSmall)})
        </div>
    ))
}));
import MockBookcard from '../assets/bookcard';
const MockBookcardFn = vi.mocked(MockBookcard);

const mockTopBooks = [
    { id: 't1', title: 'Top Book One', key: 'OLT1M', author: 'Author A' },
    { id: 't2', title: 'Top Book Two', key: 'OLT2M', author: 'Author B' },
    { id: 't3', title: 'Top Book Three', key: 'OLT3M', author: { name: 'Author C' } },
];
const apiUrl = 'http://127.0.0.1:8000/api/highest-rated/';

describe('TopRatedBooks Component', () => {
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        MockBookcardFn.mockClear();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockedAxios.get.mockResolvedValue({ data: [...mockTopBooks] });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));
        render(<TopRatedBooks />);
        expect(screen.getByText(/Loading top books.../i)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );
    });

    it('renders top rated books successfully after fetch', async () => {
        render(<TopRatedBooks />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(mockTopBooks.length);
        expect(screen.getByText(/Mock Bookcard: Top Book One/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Two/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Three/i)).toBeInTheDocument();
        expect(MockBookcardFn).toHaveBeenCalledWith(
            expect.objectContaining({ book: mockTopBooks[0], isSmall: true }), {}
        );
        expect(MockBookcardFn).toHaveBeenCalledWith(
            expect.objectContaining({ book: mockTopBooks[1], isSmall: true }), {}
        );
        expect(screen.getByTestId(`bookcard-${mockTopBooks[0].id}`)).toHaveAttribute('data-issmall', 'true');
    });

    it('uses the custom limit prop when provided', async () => {
        const customLimit = 3;
        mockedAxios.get.mockResolvedValueOnce({ data: mockTopBooks.slice(0, customLimit) });
        render(<TopRatedBooks limit={customLimit} />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: customLimit } })
        );
        expect(MockBookcardFn).toHaveBeenCalledTimes(customLimit);
        expect(screen.getByText(/Mock Bookcard: Top Book One/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Two/i)).toBeInTheDocument();
        expect(screen.getByText(/Mock Bookcard: Top Book Three/i)).toBeInTheDocument();
    });

    it('renders "No rated books found" message when API returns empty array', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [] });
        render(<TopRatedBooks />);
        expect(await screen.findByText(/No rated books found/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });

    it('renders error message and logs error when fetch fails', async () => {
        const mockError = new Error('API is down');
        mockedAxios.get.mockRejectedValueOnce(mockError);
        render(<TopRatedBooks />);
        expect(await screen.findByText(/Failed to load top rated books/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top books.../i)).not.toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching top rated books:", mockError);
        expect(MockBookcardFn).not.toHaveBeenCalled();
    });
});