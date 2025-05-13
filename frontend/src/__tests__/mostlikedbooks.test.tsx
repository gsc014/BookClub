import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

import MostLikedBooks from '../assets/mostLikedBooks';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

vi.mock('../assets/bookcard', () => ({
    default: vi.fn(({ book, isSmall }) => (
        <div data-testid={`bookcard-${book.id}`} data-issmall={isSmall}>
            <span>Mock Card: {book.title}</span>
        </div>
    ))
}));
import MockBookcard from '../assets/bookcard';
const MockBookcardFn = vi.mocked(MockBookcard);

const mockLikedBooks = [
    { id: 'l1', title: 'Liked Book 1', key: 'OLL1M', author: 'Author Liked A', likes_count: 150 },
    { id: 'l2', title: 'Liked Book 2', key: 'OLL2M', author: 'Author Liked B', likes_count: 125 },
    { id: 'l3', title: 'Liked Book 3', key: 'OLL3M', author: { name: 'Author Liked C' }, likes_count: 99 },
];
const apiUrl = 'http://127.0.0.1:8000/api/most-liked/';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('MostLikedBooks Component', () => {
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        MockBookcardFn.mockClear();

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        mockedAxios.get.mockResolvedValue({ data: [...mockLikedBooks] });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));

        renderWithRouter(<MostLikedBooks />);

        expect(screen.getByText(/Loading popular books.../i)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );
    });

    it('renders the list of most liked books successfully after fetch', async () => {
        renderWithRouter(<MostLikedBooks />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();
        });

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );

        expect(MockBookcardFn).toHaveBeenCalledTimes(mockLikedBooks.length);
        expect(MockBookcardFn).toHaveBeenCalledWith(
             expect.objectContaining({ book: mockLikedBooks[0], isSmall: true }), {}
        );
         expect(MockBookcardFn).toHaveBeenCalledWith(
             expect.objectContaining({ book: mockLikedBooks[1], isSmall: true }), {}
         );

        for (const book of mockLikedBooks) {
            const bookcardElement = screen.getByTestId(`bookcard-${book.id}`);
            const likedBookCardElement = bookcardElement.closest('.liked-book-card');
            expect(likedBookCardElement).toBeInTheDocument();

            const utils = within(likedBookCardElement as HTMLElement);

            expect(utils.getByText('❤️')).toBeInTheDocument();
            expect(utils.getByText(book.likes_count.toString())).toBeInTheDocument();
        }
    });

    it('uses the custom limit prop when provided', async () => {
        const customLimit = 2;
        mockedAxios.get.mockResolvedValueOnce({ data: mockLikedBooks.slice(0, customLimit) });

        renderWithRouter(<MostLikedBooks limit={customLimit} />);

        await waitFor(() => {
            expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();
        });

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: customLimit } })
        );

        expect(MockBookcardFn).toHaveBeenCalledTimes(customLimit);
        expect(screen.getByTestId(`bookcard-${mockLikedBooks[0].id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`bookcard-${mockLikedBooks[1].id}`)).toBeInTheDocument();
        expect(screen.queryByTestId(`bookcard-${mockLikedBooks[2].id}`)).not.toBeInTheDocument();

        const card1 = screen.getByTestId(`bookcard-${mockLikedBooks[0].id}`).closest('.liked-book-card');
        expect(within(card1 as HTMLElement).getByText(mockLikedBooks[0].likes_count.toString())).toBeInTheDocument();
        const card2 = screen.getByTestId(`bookcard-${mockLikedBooks[1].id}`).closest('.liked-book-card');
        expect(within(card2 as HTMLElement).getByText(mockLikedBooks[1].likes_count.toString())).toBeInTheDocument();
    });

    it('renders "No popular books found" message when API returns empty array', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [] });

        renderWithRouter(<MostLikedBooks />);

        expect(await screen.findByText(/No popular books found/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();

        expect(MockBookcardFn).not.toHaveBeenCalled();
    });

    it('renders error message and logs error when fetch fails', async () => {
        const mockError = new Error('Database connection failed');
        mockedAxios.get.mockRejectedValueOnce(mockError);

        renderWithRouter(<MostLikedBooks />);

        expect(await screen.findByText(/Failed to load popular books/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading popular books.../i)).not.toBeInTheDocument();

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching most liked books:", mockError);

        expect(MockBookcardFn).not.toHaveBeenCalled();
    });
});