import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, BrowserRouter } from 'react-router-dom';

import ProfilePage from '../assets/ProfilePage';
vi.mock('../assets/header', () => ({
    default: () => <div data-testid="mock-header">Mocked Header</div>
}));

import { isLoggedIn, getCurrentUsername, fetchProfileData, logout } from '../utils';

vi.mock('axios');
vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ username: mockParamsUsername }),
    };
}); 

vi.mock('../assets/pictures/search.png', );
vi.mock('../assets/pictures/bin.png', );
const mockedAxios = axios as Mocked<AxiosStatic>;

const mockNavigate = vi.fn();
const mockParamsUsername = 'testuser';

let alertSpy: MockInstance<(message?: any) => void>;

vi.mock('../utils', async (importActual) => {
    const actual = await importActual<typeof import('../utils')>();
    return {
        ...actual,
        isLoggedIn: vi.fn(),
        getCurrentUsername: vi.fn(),
        fetchProfileData: vi.fn(),
        logout: vi.fn(),
    };
});

vi.mock('../assets/pictures/search.png', () => ({ default: 'search.png' }));
vi.mock('../assets/pictures/bin.png', () => ({ default: 'bin.png' }));

interface ProfileData {
    username: string;
    email: string | null;
    date_joined: string;
    last_login: string | null;
    bio: string | null;
    location: string | null;
    birth_date: string | null;
}

const mockProfileDataBase = {
    username: 'testuser',
    email: 'test@example.com',
    bio: 'This is the bio of testuser.',
    location: 'Test Location',
    birth_date: '1990-01-01',
    date_joined: new Date().toISOString(),
    last_login: new Date().toISOString(),
};

const mockSavedBooks = [{ id: 's1', title: 'Saved Book One', author: 'Author A' },];
const mockLikedBooks = [{ id: 'l1', title: 'Liked Book Alpha', author: 'Author C' },];
const mockOtherUserLikedBooks = [
    { id: 'book3', title: 'Other User Liked Book 1', author: 'Author C' },
    { id: 'book4', title: 'Other User Liked Book 2', author: 'Author D' },
];

const mockAuthToken = 'profile-test-token';
const savedBooksUrl = 'http://localhost:8000/api/book-list/';
const likedBooksUrl = 'http://localhost:8000/api/book-list/';
const profileApiUrl = `http://127.0.0.1:8000/api/profile/`;
const updateProfileUrl = 'http://127.0.0.1:8000/api/update-profile/';
const removeBookBaseUrl = 'http://127.0.0.1:8000/api/add-book/';

const renderWithRouter = (ui: React.ReactElement) => {
    return render(ui, { wrapper: BrowserRouter });
};

describe('ProfilePage Component - Initial Rendering', () => {
    const originalLocalStorage = { ...window.localStorage };
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;
    const testUsername = 'testuser';
    const loggedInUsername = 'currentUser';

    const waitForLoad = async (options: {
        waitForBooks?: boolean;
        expectProfileFetch?: boolean;
    } = {}) => {
        const { waitForBooks = true, expectProfileFetch = true } = options;
        if (expectProfileFetch) {
            await waitFor(() => expect(fetchProfileData).toHaveBeenCalled());
            await waitFor(() => expect(screen.queryByText(/loading profile.../i)).not.toBeInTheDocument());
        }
        if (waitForBooks && expectProfileFetch) {
            await waitFor(() => expect(screen.queryByText(/loading your saved books/i)).not.toBeInTheDocument());
            await waitFor(() => expect(screen.queryByText(/loading your liked books/i)).not.toBeInTheDocument());
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        window.localStorage.clear();
        window.localStorage.setItem = vi.fn((key, value) => { originalLocalStorage[key] = value; });
        window.localStorage.getItem = vi.fn((key) => originalLocalStorage[key] || null);
        window.localStorage.removeItem = vi.fn((key) => { delete originalLocalStorage[key]; });
        window.localStorage.setItem('authToken', mockAuthToken);

        vi.mocked(isLoggedIn).mockReturnValue(true);
        vi.mocked(getCurrentUsername).mockReturnValue(mockParamsUsername);
        vi.mocked(fetchProfileData).mockResolvedValue({ ...mockProfileDataBase } as ProfileData);

        mockedAxios.get.mockImplementation(async (url, config) => {
            if (url.startsWith(profileApiUrl)) return { data: { ...mockProfileDataBase } };
            if (url === savedBooksUrl && config?.params?.name === "Saved Books") return { data: [...mockSavedBooks] };
            if (url === likedBooksUrl && config?.params?.name === "Liked Books") return { data: [...mockLikedBooks] };
            throw new Error(`Unhandled GET in test: ${url}`);
        });
        mockedAxios.post.mockResolvedValue({ data: { status: 'default success' } });

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    });

    afterEach(() => {
        alertSpy.mockRestore();
        window.localStorage.clear();
        Object.keys(originalLocalStorage).forEach(key => { window.localStorage.setItem(key, originalLocalStorage[key]); });
    });

    describe('Initial Rendering and Loading', () => {

        const testUsername = 'testuser';
        const loggedInUsername = 'currentUser';

        it('redirects to home if not logged in', async () => {
            vi.mocked(isLoggedIn).mockReturnValue(false);
            window.localStorage.removeItem('authToken');
            render(<ProfilePage />);
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledTimes(1);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
        it('redirects to home on "Authentication failed" error during profile fetch', async () => {
            const authError = new Error('Authentication failed. Please login.');
            vi.mocked(fetchProfileData).mockRejectedValueOnce(authError);

            renderWithRouter(<ProfilePage />);

            await waitFor(() => {
                expect(fetchProfileData).toHaveBeenCalledWith(testUsername);
            });

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching profile:', authError);
                expect(consoleLogSpy).toHaveBeenCalledWith("Auth error detected, redirecting");
                expect(mockNavigate).toHaveBeenCalledTimes(1);
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });

            expect(screen.queryByRole('heading', { name: `${testUsername}'s Profile` })).not.toBeInTheDocument();
            expect(screen.queryByRole('heading', { name: /No Profile Data/i })).not.toBeInTheDocument();

        });

        it('shows loading state initially', async () => {
            vi.mocked(fetchProfileData).mockImplementation(() => new Promise(() => { }));
            mockedAxios.get.mockResolvedValue({ data: [] });
            render(<ProfilePage />);
            expect(await screen.findByText(/loading profile.../i)).toBeInTheDocument();
            expect(fetchProfileData).toHaveBeenCalledWith(mockParamsUsername);
        });

        it('shows error state on profile fetch failure', async () => {
            const errorMsg = 'Network failed';
            vi.mocked(fetchProfileData).mockRejectedValue(new Error(errorMsg));
            mockedAxios.get.mockResolvedValue({ data: [] });
            render(<ProfilePage />);
            expect(await screen.findByText(`Failed to load profile data: ${errorMsg}`)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();
            expect(screen.queryByText(/loading your saved books/i)).not.toBeInTheDocument();
        });

        it('displays basic profile information correctly for own profile after load', async () => {
            render(<ProfilePage />);
            await waitForLoad();
            expect(screen.getByRole('heading', { name: /testuser's Profile/i })).toBeInTheDocument();
            expect(screen.getByText(/Username:/i)).toBeInTheDocument();
            expect(screen.getByText(mockProfileDataBase.username)).toBeInTheDocument();
            expect(screen.getByText(/Member Since:/i)).toBeInTheDocument();
            if (mockProfileDataBase.date_joined) { expect(screen.getByText(new Date(mockProfileDataBase.date_joined).toLocaleDateString())).toBeInTheDocument(); }
            expect(screen.getByText(/Bio:/i)).toBeInTheDocument();
            if (mockProfileDataBase.bio) { expect(screen.getByText(mockProfileDataBase.bio)).toBeInTheDocument(); } else { expect(screen.getByText(/no bio provided/i)).toBeInTheDocument(); }
            expect(screen.getByText(/Location:/i)).toBeInTheDocument();
            if (mockProfileDataBase.location) { expect(screen.getByText(mockProfileDataBase.location)).toBeInTheDocument(); } else { expect(screen.getByText(/not specified/i)).toBeInTheDocument(); }
            expect(screen.getByText(/Birth Date:/i)).toBeInTheDocument();
            if (mockProfileDataBase.birth_date) { expect(screen.getByText(new Date(mockProfileDataBase.birth_date).toLocaleDateString())).toBeInTheDocument(); } else { expect(screen.getAllByText(/not specified/i).length).toBeGreaterThanOrEqual(1); }
            expect(screen.getByRole('heading', { name: /account details/i })).toBeInTheDocument();
            expect(screen.getByText(/Email:/i)).toBeInTheDocument();
            if (mockProfileDataBase.email) { expect(screen.getByText(mockProfileDataBase.email)).toBeInTheDocument(); } else { expect(screen.getByText(/not provided/i)).toBeInTheDocument(); }
            expect(screen.getByText(/Last Login:/i)).toBeInTheDocument();
            if (mockProfileDataBase.last_login) { expect(screen.getByText(new Date(mockProfileDataBase.last_login).toLocaleString())).toBeInTheDocument(); } else { expect(screen.getByText(/unknown/i)).toBeInTheDocument(); }
        });

        it('displays saved and liked book sections with content', async () => {
            render(<ProfilePage />);
            await waitForLoad();
            const savedBooksHeading = screen.getByRole('heading', { name: /saved books/i });
            const savedBooksList = savedBooksHeading.closest('div')?.querySelector('ul.saved-books-list') as HTMLElement | null;
            expect(savedBooksList).toBeInTheDocument();
            expect(within(savedBooksList!).getByText(mockSavedBooks[0].title, { exact: false })).toBeInTheDocument();
            expect(within(savedBooksList!).getByText(/by\s+Author A/i)).toBeInTheDocument();
            expect(within(savedBooksList!).getByRole('img', { name: /remove/i })).toBeInTheDocument();

            const likedBooksHeading = screen.getByRole('heading', { name: /liked books/i });
            const likedBooksList = likedBooksHeading.closest('div')?.querySelector('ul.liked-books-list') as HTMLElement | null;
            expect(likedBooksList).toBeInTheDocument();
            expect(within(likedBooksList!).getByText(mockLikedBooks[0].title, { exact: false })).toBeInTheDocument();
            expect(within(likedBooksList!).getByText(/by\s+Author C/i)).toBeInTheDocument();
            expect(within(likedBooksList!).getByRole('img', { name: /view details/i })).toBeInTheDocument();
        });

        it('displays empty message when book lists are empty', async () => {
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.startsWith(profileApiUrl)) {
                    return { data: { ...mockProfileDataBase } };
                }
                if (url === savedBooksUrl && config?.params?.name === "Saved Books") return { data: [] };
                if (url === likedBooksUrl && config?.params?.name === "Liked Books") return { data: [] };
                throw new Error(`Unhandled GET in test: ${url}`);
            });

            render(<ProfilePage />);
            await waitForLoad();
            expect(screen.getByText(/no saved books yet/i)).toBeInTheDocument();
            expect(screen.getByText(/no liked books yet/i)).toBeInTheDocument();
        });
    });

    describe('remove_saved_book Functionality', () => {

        it('redirects or remains loading if user is not logged in (cannot reach remove button)', async () => {
            vi.mocked(isLoggedIn).mockReturnValue(false);
            localStorage.removeItem('authToken');
            vi.mocked(fetchProfileData).mockImplementation(() => new Promise(() => {}));
            renderWithRouter(<ProfilePage />);
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledTimes(1);
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
            expect(screen.queryByText(/Saved Books/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('img', { name: /remove/i })).not.toBeInTheDocument();
            expect(alertSpy).not.toHaveBeenCalled();
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('refetches saved books list if remove API status is NOT "removed"', async () => {
            const bookToRemove = mockSavedBooks[0];
            const removeUrl = `${removeBookBaseUrl}${bookToRemove.id}/`;
            mockedAxios.post.mockResolvedValueOnce({ data: { status: 'added_instead' } });

            const getSpy = vi.spyOn(mockedAxios, 'get');

            renderWithRouter(<ProfilePage />);

            await screen.findByRole('heading', { name: /Saved Books/i });
            const savedBookItem = await screen.findByText(bookToRemove.title, { exact: false });
            const listItem = savedBookItem.closest('li');
            const removeIcon = within(listItem!).getByRole('img', { name: /remove/i });

            getSpy.mockClear();

            fireEvent.click(removeIcon);

            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(mockedAxios.post).toHaveBeenCalledWith(removeUrl, {}, expect.anything());
            });

            await waitFor(() => {
                 expect(getSpy).toHaveBeenCalledWith(
                     savedBooksUrl,
                     expect.objectContaining({
                         params: { name: "Saved Books" },
                         headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` })
                     })
                 );
            });

            expect(await screen.findByText(bookToRemove.title, { exact: false })).toBeInTheDocument();
             getSpy.mockRestore();
        });

        it('refetches saved books list and logs error on remove API failure', async () => {
            const bookToRemove = mockSavedBooks[0];
            const removeUrl = `${removeBookBaseUrl}${bookToRemove.id}/`;
            const removeError = new Error('Failed to remove book from server');
            mockedAxios.post.mockRejectedValueOnce(removeError);

            const getSpy = vi.spyOn(mockedAxios, 'get');

            renderWithRouter(<ProfilePage />);

            await screen.findByRole('heading', { name: /Saved Books/i });
            const savedBookItem = await screen.findByText(bookToRemove.title, { exact: false });
            const listItem = savedBookItem.closest('li');
            const removeIcon = within(listItem!).getByRole('img', { name: /remove/i });

            getSpy.mockClear();

            fireEvent.click(removeIcon);

            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(mockedAxios.post).toHaveBeenCalledWith(removeUrl, {}, expect.anything());
            });

             await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith("Error removing saved book:", removeError);
             });

            await waitFor(() => {
                 expect(getSpy).toHaveBeenCalledWith(
                     savedBooksUrl,
                     expect.objectContaining({ params: { name: "Saved Books" } })
                 );
            });

            expect(await screen.findByText(bookToRemove.title, { exact: false })).toBeInTheDocument();
             getSpy.mockRestore();
        });

    });
    describe('Profile Editing (Own Profile)', () => {

        const editButtonName = /edit profile/i;
        const cancelButtonName = /cancel/i;
        const saveButtonName = /save changes/i;
        const bioLabel = /bio/i;
        const locationLabel = /location/i;
        const birthDateLabel = /birth date/i;
        const updateProfileUrl = 'http://127.0.0.1:8000/api/update-profile/';

        beforeEach(() => {
            vi.mocked(getCurrentUsername).mockReturnValue(mockParamsUsername);
            window.localStorage.setItem('authToken', mockAuthToken);
            mockedAxios.post.mockClear();
            vi.mocked(fetchProfileData).mockResolvedValue({ ...mockProfileDataBase });
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url.startsWith(profileApiUrl)) return { data: { ...mockProfileDataBase } };
                if (url === savedBooksUrl && config?.params?.name === "Saved Books") return { data: [...mockSavedBooks] };
                if (url === likedBooksUrl && config?.params?.name === "Liked Books") return { data: [...mockLikedBooks] };
                throw new Error(`Unhandled GET: ${url}`);
            });
        });

        it('toggles edit mode, displays form with correct initial values, and cancels', async () => {
            render(<ProfilePage />);
            await waitForLoad();
            expect(screen.getByText(mockProfileDataBase.bio!)).toBeInTheDocument();
            expect(screen.queryByRole('form', { name: /edit profile form/i })).not.toBeInTheDocument();
            const editButton = screen.getByRole('button', { name: editButtonName });
            fireEvent.click(editButton);
            const form = await screen.findByRole('form', { name: /edit profile form/i });
            expect(form).toBeInTheDocument();
            const bioInput = screen.getByLabelText(bioLabel);
            const locationInput = screen.getByLabelText(locationLabel);
            const birthDateInput = screen.getByLabelText(birthDateLabel);

            expect(bioInput).toBeInTheDocument();
            expect(bioInput).toHaveValue(mockProfileDataBase.bio);
            expect(locationInput).toHaveValue(mockProfileDataBase.location);
            expect(birthDateInput).toHaveValue(mockProfileDataBase.birth_date);

            expect(screen.getByRole('button', { name: cancelButtonName })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: saveButtonName })).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: cancelButtonName }));

            expect(screen.queryByRole('form', { name: /edit profile form/i })).not.toBeInTheDocument();
            expect(await screen.findByText(mockProfileDataBase.bio!)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: editButtonName })).toBeInTheDocument();
        });

        it('updates input fields in edit mode', async () => {
            render(<ProfilePage />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: editButtonName }));

            const bioInput = await screen.findByLabelText(bioLabel);
            const locationInput = screen.getByLabelText(locationLabel);
            const birthDateInput = screen.getByLabelText(birthDateLabel);

            fireEvent.change(bioInput, { target: { value: 'New bio text' } });
            fireEvent.change(locationInput, { target: { value: 'New location city' } });
            fireEvent.change(birthDateInput, { target: { value: '2001-12-25' } });

            expect(bioInput).toHaveValue('New bio text');
            expect(locationInput).toHaveValue('New location city');
            expect(birthDateInput).toHaveValue('2001-12-25');
        });

        it('successfully updates profile via API and shows success', async () => {
            const updateSuccessResponse = { message: 'Profile updated!' };
            mockedAxios.post.mockImplementation(async (url) => {
                if (url === updateProfileUrl) {
                    return { data: updateSuccessResponse };
                }
                throw new Error(`Unhandled POST: ${url}`);
            });

            render(<ProfilePage />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: editButtonName }));

            const newBio = 'Successfully updated bio.';
            const newLocation = 'Success City';
            const newBirthDate = '1999-09-09';

            fireEvent.change(await screen.findByLabelText(bioLabel), { target: { value: newBio } });
            fireEvent.change(screen.getByLabelText(locationLabel), { target: { value: newLocation } });
            fireEvent.change(screen.getByLabelText(birthDateLabel), { target: { value: newBirthDate } });

            const form = await screen.findByRole('form', { name: /edit profile form/i });
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(mockedAxios.post).toHaveBeenCalledWith(
                    updateProfileUrl,
                    { bio: newBio, location: newLocation, birth_date: newBirthDate },
                    expect.objectContaining({
                        headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` })
                    })
                );
            });

            expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument();
            expect(screen.queryByRole('form')).not.toBeInTheDocument();
            expect(screen.getByText(newBio)).toBeInTheDocument();
            expect(screen.getByText(newLocation)).toBeInTheDocument();
            expect(screen.getByText(new Date(newBirthDate).toLocaleDateString())).toBeInTheDocument();
            expect(screen.getByRole('button', { name: editButtonName })).toBeInTheDocument();
        });

        it('shows error message on failed profile update', async () => {
            const updateErrorMsg = 'Invalid birth date format.';
            mockedAxios.post.mockImplementation(async (url) => {
                if (url === updateProfileUrl) {
                    throw { response: { data: { error: updateErrorMsg } } };
                }
                throw new Error(`Unhandled POST: ${url}`);
            });

            render(<ProfilePage />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: editButtonName }));

            const form = await screen.findByRole('form', { name: /edit profile form/i });
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            });

            expect(await screen.findByText(updateErrorMsg)).toBeInTheDocument();
            expect(screen.getByRole('form')).toBeInTheDocument();
            expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
        });
    });
    describe('Profile Search Interaction', () => {
        it('renders clickable user results when autocomplete fetch succeeds', async () => {
            const user = userEvent.setup();
            const searchQuery = 'findme';
            const searchResultUsers = [
                { id: 'u3', username: 'findmeUser1' },
                { id: 'u4', username: 'findmeUser2' },
            ];
            const autocompleteUrl = `http://127.0.0.1:8000/api/autocomplete-profile/?query=${searchQuery}`;

            vi.mocked(fetchProfileData).mockResolvedValueOnce(mockProfileDataBase);
            mockedAxios.get.mockImplementation(async (url) => {
                if (url.startsWith(autocompleteUrl)) {
                    console.log(`TEST [Render Results]: Mock returning results for query: ${searchQuery}`);
                    return { data: searchResultUsers };
                }
                if (url.startsWith('http://localhost:8000/api/book-list/') || url.startsWith('http://localhost:8000/api/saved-books/')) {
                    return { data: [] };
                }
                console.warn(`TEST [Render Results]: Unhandled axios.get: ${url}`);
                throw new Error(`Unhandled GET in render results test: ${url}`);
            });

            renderWithRouter(<ProfilePage />);
            expect(await screen.findByRole('heading', { name: /Profile Information/i })).toBeInTheDocument();


            const input = screen.getByPlaceholderText(/Search for profiles.../i);

            await user.type(input, searchQuery);

            const resultsContainer = await screen.findByTestId('profile-search-results');

            for (const searchUser of searchResultUsers) {
                const resultItem = await within(resultsContainer).findByText(searchUser.username);
                expect(resultItem).toBeInTheDocument();
                expect(resultItem).toHaveClass('search-result-item');
            }

            expect(within(resultsContainer).queryByText(/No profiles found/i)).not.toBeInTheDocument();

            const firstResultItem = within(resultsContainer).getByText(searchResultUsers[0].username);
            await user.click(firstResultItem);

            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/profile/${searchResultUsers[0].username}`);
        });

        it('clears search results and hides dropdown when search input is cleared', async () => {
            const user = userEvent.setup();
            const initialQuery = 'user';
            const searchResultUsers = [{ id: 'u5', username: 'userResult' }];
            const autocompleteUrlBase = 'http://127.0.0.1:8000/api/autocomplete-profile/';

            vi.mocked(fetchProfileData).mockResolvedValueOnce(mockProfileDataBase);
            mockedAxios.get.mockImplementation(async (url, config) => {
                if (url === `${autocompleteUrlBase}?query=${initialQuery}`) return { data: searchResultUsers };
                if (url.startsWith(autocompleteUrlBase)) return { data: [] };
                if (url === savedBooksUrl && config?.params?.name === "Saved Books") return { data: [] };
                if (url === likedBooksUrl && config?.params?.name === "Liked Books") return { data: [] };
                if (url.startsWith(`http://127.0.0.1:8000/api/profile/${testUsername}`)) return { data: mockProfileDataBase };
                console.warn(`[Clear Test] Unhandled GET: ${url}`);
                throw new Error(`Unhandled GET in clear results test: ${url}`);
            });

            renderWithRouter(<ProfilePage />);
            await waitFor(() => expect(fetchProfileData).toHaveBeenCalled());
            await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(savedBooksUrl), expect.anything()));
            await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(likedBooksUrl), expect.anything()));
            mockedAxios.get.mockClear();

            const input = screen.getByPlaceholderText<HTMLInputElement>(/Search for profiles.../i);

            await user.type(input, initialQuery);

            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(
                    `${autocompleteUrlBase}?query=${initialQuery}`
                );
            });
            const resultItem = await screen.findByText(searchResultUsers[0].username);
            expect(resultItem).toBeVisible();

            const autocompleteCalls = mockedAxios.get.mock.calls.filter(call => call[0].startsWith(autocompleteUrlBase));
            expect(autocompleteCalls.length).toBe(4);

            await user.clear(input);

            await waitFor(() => {
                expect(screen.queryByText(searchResultUsers[0].username)).not.toBeInTheDocument();
            });

            const finalAutocompleteCalls = mockedAxios.get.mock.calls.filter(call => call[0].startsWith(autocompleteUrlBase));
            expect(finalAutocompleteCalls.length).toBe(4);

            expect(input.value).toBe('');
        });
        it('hides search results when clicking outside the search container', async () => {
            const user = userEvent.setup();
            const searchQuery = 'another';
            const searchResultUsers = [{ id: 'u1', username: 'anotherUser' }];
            const autocompleteUrl = `http://127.0.0.1:8000/api/autocomplete-profile/?query=${searchQuery}`;

            mockedAxios.get.mockImplementation(async (url) => {
                if (url.startsWith(autocompleteUrl)) {
                    return { data: searchResultUsers };
                }
                if (url.startsWith('http://localhost:8000/api/book-list/') || url.startsWith('http://localhost:8000/api/saved-books/')) {
                    return { data: [] };
                }
                if (url.startsWith(`http://127.0.0.1:8000/api/profile/${testUsername}`)) {
                    return { data: mockProfileDataBase };
                }
                console.warn(`[Click Outside Test] Unhandled GET: ${url}`);
                throw new Error(`Unhandled GET in click outside test: ${url}`);
            });

            const { container } = renderWithRouter(<ProfilePage />);
            expect(await screen.findByRole('heading', { name: /Profile Information/i })).toBeInTheDocument();

            const input = screen.getByPlaceholderText(/Search for profiles.../i);
            const searchContainer = container.querySelector('.profile-search-container');
            expect(searchContainer).toBeInTheDocument();

            await user.type(input, searchQuery);
            const resultItem = await screen.findByText(searchResultUsers[0].username);
            expect(resultItem).toBeVisible();

            await user.click(searchContainer!);
            expect(await screen.findByText(searchResultUsers[0].username)).toBeVisible();

            await user.click(document.body);
            await waitFor(() => {
                expect(screen.queryByText(searchResultUsers[0].username)).not.toBeInTheDocument();
            });
        });

        it('navigates to profile when search form is submitted', async () => {
            const user = userEvent.setup();
            const searchQuery = 'submitUser';
            vi.mocked(fetchProfileData).mockResolvedValueOnce(mockProfileDataBase);
            mockedAxios.get.mockImplementation(async (url) => {
                if (url.startsWith(`http://127.0.0.1:8000/api/profile/${testUsername}`)) {
                    return { data: mockProfileDataBase };
                }
                if (url.startsWith('http://localhost:8000/api/book-list/') || url.startsWith('http://localhost:8000/api/saved-books/')) {
                    return { data: [] };
                }
                if (url.includes('/api/autocomplete-profile/')) return { data: [] };
                throw new Error(`Unhandled GET in submit test: ${url}`);
            });

            renderWithRouter(<ProfilePage />);
            expect(await screen.findByRole('heading', { name: /Profile Information/i })).toBeInTheDocument();

            const input = screen.getByPlaceholderText(/Search for profiles.../i);
            const form = input.closest('form')!;

            await user.type(input, searchQuery);
            fireEvent.submit(form);

            expect(mockNavigate).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(`/profile/${searchQuery}`);
            expect(input).toHaveValue('');
        });

    });
    describe('Owner Header Actions', () => {
        it('navigates to settings page when "Account Settings" is clicked', async () => {
            render(<ProfilePage />);
            await waitForLoad();

            const settingsButton = screen.getByRole('button', { name: /account settings/i });
            fireEvent.click(settingsButton);
            expect(mockNavigate).toHaveBeenCalledWith('/settings');
        });

        it('calls logout util and navigates home when "Log Out" is clicked', async () => {
            render(<ProfilePage />);
            await waitForLoad();

            const logoutButton = screen.getByRole('button', { name: /log out/i });
            fireEvent.click(logoutButton);

            expect(logout).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('hides owner controls and private info when viewing another user profile', async () => {
        const profileOwnerUsername = 'testuser';
        const currentViewerUsername = 'viewerUser';

        vi.mocked(getCurrentUsername).mockReturnValue(currentViewerUsername);

        vi.mocked(fetchProfileData).mockResolvedValue({ ...mockProfileDataBase });

        const otherUserLikedBooksUrl = 'http://127.0.0.1:8000/api/saved-books/';
        mockedAxios.get.mockImplementation(async (url, config) => {
            if (
                url.includes('/api/saved-books/') &&
                config?.params?.name === 'Liked Books' &&
                config?.params?.username === profileOwnerUsername
            ) {
                return { data: [...mockOtherUserLikedBooks] };
            }
            console.warn(`Ignoring axios.get in 'other user' test: ${url}`);
            return { data: [] };
        });

        render(
            <MemoryRouter initialEntries={[`/profile/${profileOwnerUsername}`]}>
                <Routes>
                    <Route path="/profile/:username" element={<ProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitForLoad();

        expect(screen.queryByRole('button', { name: /account settings/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/edit profile form/i)).not.toBeInTheDocument();

        expect(screen.queryByRole('heading', { name: /account details/i })).not.toBeInTheDocument();
        expect(screen.queryByText(`Email:`, { exact: false })).not.toBeInTheDocument();
        expect(screen.queryByText(mockProfileDataBase.email)).not.toBeInTheDocument();
        expect(screen.queryByText(/Last Login:/i)).not.toBeInTheDocument();

        expect(screen.getByRole('heading', { name: `${profileOwnerUsername}'s Profile` })).toBeInTheDocument();
        expect(screen.getByText(mockProfileDataBase.bio)).toBeInTheDocument();
        expect(screen.getByText(`Username:`, { exact: false })).toBeInTheDocument();
        expect(screen.getByText(`Location:`, { exact: false })).toBeInTheDocument();
        expect(screen.getByText(mockProfileDataBase.location)).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: `${profileOwnerUsername}'s Liked Books` })).toBeInTheDocument();

        expect(screen.queryByRole('heading', { name: "Saved Books" })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: "Liked Books" })).not.toBeInTheDocument();

        expect(mockedAxios.get).not.toHaveBeenCalledWith(
            expect.stringContaining('/api/saved-books/'),
            expect.objectContaining({
                params: { name: 'Saved Books' }
            })
        );
    });


});

