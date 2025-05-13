import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import Bookcard from '../assets/bookcard';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../assets/pictures/diskette.png', () => ({ default: 'saveIcon.png' }));
vi.mock('../assets/pictures/diskette_saved.png', () => ({ default: 'savedIcon.png' }));
vi.mock('../assets/pictures/file.png', () => ({ default: 'informationIcon.png' }));
vi.mock('../assets/pictures/no-results.png', () => ({ default: 'defaultCover.png' }));
vi.mock('../assets/pictures/heart.png', () => ({ default: 'heartIcon.png' }));
vi.mock('../assets/pictures/hearted.png', () => ({ default: 'heartedIcon.png' }));

interface BookAuthorObject {
    name: string;
}

interface BookBase {
    id: string;
    key: string;
    title: string;
    avg_rating?: number;
    review_count?: number;
}

type BookPropType = BookBase & {
    author: string | BookAuthorObject;
};

describe('Bookcard Component', () => {
    const mockBookBase: BookBase = {
        id: '123',
        key: 'OL123M',
        title: 'Test Book Title',
    };
    const mockBookAuthorString = 'Test Author String';
    const mockBook: BookPropType = {
        ...mockBookBase,
        author: mockBookAuthorString,
    };
    const mockBookWithObjectAuthor: BookPropType = {
        ...mockBookBase,
        author: { name: 'Test Author Object' }
    };
    const mockBookWithRating: BookPropType = {
        ...mockBookBase,
        author: 'Rated Author',
        avg_rating: 4.5,
        review_count: 10,
    };
    const mockAuthToken = 'fake-auth-token';

    const likeButtonTitle = /like book/i;
    const likedButtonTitle = /book liked/i;
    const saveButtonTitle = /save book/i;
    const savedButtonTitle = /book saved/i;
    const infoButtonTitle = /book information/i;

    const apiBaseUrl = 'http://127.0.0.1:8000/api/add-book/';
    const likeApiUrl = `${apiBaseUrl}${mockBook.id}/`;
    const saveApiUrl = `${apiBaseUrl}${mockBook.id}/`;
    const likeApiParams = { params: { name: "Liked Books" } };
    const saveApiParams = { params: { name: "Saved Books" } };
    const getApiHeaders = (token: string) => ({
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        }
    });

    let alertSpy: MockInstance;

    const renderBookcard = (bookProps: BookPropType = mockBook, isSmall = false) => {
        return render(<Bookcard book={bookProps} isSmall={isSmall} />);
    };

    beforeEach(() => {
        vi.resetAllMocks();
        localStorage.clear();
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        alertSpy.mockRestore();
        localStorage.clear();
    });

    describe('Rendering (Large Card)', () => {
        it('renders book title, medium image, and action buttons (author not rendered)', () => {
            renderBookcard(mockBook, false);
            expect(screen.getByText(mockBook.title)).toBeInTheDocument();
            const coverImg = screen.getByRole('img', { name: mockBook.title });
            expect(coverImg).toBeInTheDocument();
            expect(coverImg).toHaveAttribute('src', `https://covers.openlibrary.org/w/olid/${mockBook.key}-M.jpg`);
            expect(screen.getByTitle(likeButtonTitle)).toBeInTheDocument();
            expect(screen.getByTitle(saveButtonTitle)).toBeInTheDocument();
            expect(screen.getByTitle(infoButtonTitle)).toBeInTheDocument();
        });

        it('renders default cover on large card image error', () => {
            renderBookcard(mockBook, false);
            const coverImg = screen.getByRole('img', { name: mockBook.title });
            expect(coverImg).toHaveAttribute('src', `https://covers.openlibrary.org/w/olid/${mockBook.key}-M.jpg`);
            fireEvent.error(coverImg);
            expect(coverImg).toHaveAttribute('src', 'defaultCover.png');
        });
    });

    describe('Rendering (Small Card)', () => {
        it('renders small card with correct classes, small image source, and no action buttons', () => {
            const { container } = renderBookcard(mockBook, true);
            const cardElement = container.firstChild as HTMLElement;
            expect(cardElement).toHaveClass('book-card-small');
            expect(within(cardElement).getByText(mockBook.title)).toHaveClass('book-title-small');
            expect(within(cardElement).getByText(mockBookAuthorString)).toHaveClass('book-author-small');
            const coverImg = within(cardElement).getByRole('img', { name: mockBook.title });
            expect(coverImg).toHaveClass('book-cover-small');
            expect(coverImg).toHaveAttribute('src', `https://covers.openlibrary.org/w/olid/${mockBook.key}-M.jpg`);
            expect(screen.queryByTitle(likeButtonTitle)).not.toBeInTheDocument();
            expect(screen.queryByTitle(saveButtonTitle)).not.toBeInTheDocument();
            expect(screen.queryByTitle(infoButtonTitle)).not.toBeInTheDocument();
        });

        it('renders author name correctly when author is an object', () => {
            renderBookcard(mockBookWithObjectAuthor, true);
            const authorName = (mockBookWithObjectAuthor.author as BookAuthorObject).name;
            expect(screen.getByText(authorName)).toBeInTheDocument();
            expect(screen.getByText(authorName)).toHaveClass('book-author-small');
        });

        it('renders rating information when avg_rating is provided', () => {
            renderBookcard(mockBookWithRating, true);
            const ratingDiv = screen.getByText('★').closest('div');
            expect(ratingDiv).toHaveClass('book-rating');
            expect(within(ratingDiv!).getByText('★')).toBeInTheDocument();
            expect(within(ratingDiv!).getByText(mockBookWithRating.avg_rating!.toString())).toBeInTheDocument();
            expect(within(ratingDiv!).getByText(`(${mockBookWithRating.review_count!})`)).toBeInTheDocument();
        });

        it('does not render rating information when avg_rating is missing', () => {
            renderBookcard(mockBook, true);
            expect(screen.queryByText('★')).not.toBeInTheDocument();
        });

        it('renders default cover on small image error', () => {
            renderBookcard(mockBook, true);
            const coverImg = screen.getByRole('img', { name: mockBook.title });
            fireEvent.error(coverImg);
            expect(coverImg).toHaveAttribute('src', 'defaultCover.png');
        });
    });

    describe('Navigation', () => {
        it('(Large Card) navigates when card content (not buttons) is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByText(mockBook.title));
            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/books/${mockBook.id}`, { state: { book: mockBook } });
        });

        it('(Large Card) navigates when info button is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(infoButtonTitle));
            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/books/${mockBook.id}`, { state: { book: mockBook } });
        });

        it('(Large Card) does not navigate when like button is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(likeButtonTitle));
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('(Large Card) does not navigate when save button is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(saveButtonTitle));
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('(Small Card) navigates when the small card itself is clicked', () => {
            const { container } = renderBookcard(mockBook, true);
            const cardElement = container.querySelector('.book-card-small');
            expect(cardElement).toBeInTheDocument();
            fireEvent.click(cardElement!);
            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/books/${mockBook.id}`, { state: { book: mockBook } });
        });
    });

    describe('Actions (Logged Out)', () => {
        beforeEach(() => {
            vi.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue(null);
        });

        it('shows alert and does not call API if user is not logged in when Like is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(likeButtonTitle));
            expect(alertSpy).toHaveBeenCalledWith('You must be logged in to like a book.');
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('shows alert and does not call API if user is not logged in when Save is clicked', () => {
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(saveButtonTitle));
            expect(alertSpy).toHaveBeenCalledWith('You must be logged in to save a book.');
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('Actions (Logged In)', () => {
        beforeEach(() => {
            vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
                if (key === 'authToken') return mockAuthToken;
                return null;
            });
        });

        it('calls like API and updates icon on successful like', async () => {
            mockedAxios.post.mockResolvedValue({ data: { status: 'added' } });
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(likeButtonTitle));
            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(mockedAxios.post).toHaveBeenCalledWith(likeApiUrl, {}, { ...likeApiParams, ...getApiHeaders(mockAuthToken) });
            });
            await waitFor(() => {
                expect(screen.getByTitle(likedButtonTitle)).toBeInTheDocument();
                expect(screen.getByAltText('Like')).toHaveAttribute('src', 'heartedIcon.png');
            });
        });

        it('calls like API and updates icon on successful unlike', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { status: 'added' } })
                .mockResolvedValueOnce({ data: { status: 'removed' } });

            renderBookcard(mockBook, false);
            const initialLikeButton = screen.getByTitle(likeButtonTitle);
            fireEvent.click(initialLikeButton);
            const likedButton = await screen.findByTitle(likedButtonTitle);
            expect(screen.getByAltText('Like')).toHaveAttribute('src', 'heartedIcon.png');
            fireEvent.click(likedButton);
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(2); });
            await waitFor(() => {
                expect(screen.getByTitle(likeButtonTitle)).toBeInTheDocument();
                expect(screen.getByAltText('Like')).toHaveAttribute('src', 'heartIcon.png');
            });
        });

        it('logs error and does not change state on like API failure', async () => {
            const apiError = new Error('Like failed');
            mockedAxios.post.mockRejectedValue(apiError);
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(likeButtonTitle));
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(1); });
            expect(screen.getByTitle(likeButtonTitle)).toBeInTheDocument();
            expect(screen.queryByTitle(likedButtonTitle)).not.toBeInTheDocument();
            expect(screen.getByAltText('Like')).toHaveAttribute('src', 'heartIcon.png');
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving book:", apiError);
            consoleErrorSpy.mockRestore();
        });

        it('calls save API and updates icon on successful save', async () => {
            mockedAxios.post.mockResolvedValue({ data: { status: 'added' } });
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(saveButtonTitle));
            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(mockedAxios.post).toHaveBeenCalledWith(saveApiUrl, {}, { ...saveApiParams, ...getApiHeaders(mockAuthToken) });
            });
            await waitFor(() => {
                expect(screen.getByTitle(savedButtonTitle)).toBeInTheDocument();
                expect(screen.getByAltText('Save')).toHaveAttribute('src', 'savedIcon.png');
            });
        });

        it('calls save API and updates icon on successful unsave', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { status: 'added' } })
                .mockResolvedValueOnce({ data: { status: 'removed' } });

            renderBookcard(mockBook, false);
            const initialSaveButton = screen.getByTitle(saveButtonTitle);
            fireEvent.click(initialSaveButton);
            const savedButton = await screen.findByTitle(savedButtonTitle);
            expect(screen.getByAltText('Save')).toHaveAttribute('src', 'savedIcon.png');
            fireEvent.click(savedButton);
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(2); });
            await waitFor(() => {
                expect(screen.getByTitle(saveButtonTitle)).toBeInTheDocument();
                expect(screen.getByAltText('Save')).toHaveAttribute('src', 'saveIcon.png');
            });
        });

        it('logs error and does not change state on save API failure', async () => {
            const apiError = new Error('Save failed');
            mockedAxios.post.mockRejectedValue(apiError);
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            renderBookcard(mockBook, false);
            fireEvent.click(screen.getByTitle(saveButtonTitle));
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(1); });
            expect(screen.getByTitle(saveButtonTitle)).toBeInTheDocument();
            expect(screen.queryByTitle(savedButtonTitle)).not.toBeInTheDocument();
            expect(screen.getByAltText('Save')).toHaveAttribute('src', 'saveIcon.png');
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving book:", apiError);
            consoleErrorSpy.mockRestore();
        });
    });
});